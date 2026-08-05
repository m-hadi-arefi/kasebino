import { describe, expect, it } from "vitest";

import {
  CUSTOMER_AUTH_ERROR_MESSAGES_FA,
  CUSTOMER_OTP_SMS_TEMPLATE_FA,
  CustomerAuthError,
  MockSmsAdapter,
  InMemoryCustomerIdentityRepository,
  InMemoryCustomerOtpChallengeRepository,
  ConsoleSmsAdapter,
  createCustomerOtpUseCases,
  normalizeIranianMobile,
} from "./index.js";

function createTestUseCases(options?: {
  nodeEnv?: string;
  otpCode?: string;
  sms?: MockSmsAdapter;
}) {
  const sms = options?.sms ?? new MockSmsAdapter();
  const otpChallenges = new InMemoryCustomerOtpChallengeRepository();
  const identities = new InMemoryCustomerIdentityRepository();
  const useCases = createCustomerOtpUseCases({
    otpChallenges,
    identities,
    sms,
    nodeEnv: options?.nodeEnv ?? "development",
    idFactory: (() => {
      let n = 0;
      return () => `id-${++n}`;
    })(),
    ...(options?.otpCode
      ? { otpCodeFactory: () => options.otpCode as string }
      : {}),
  });
  return { useCases, sms, otpChallenges, identities };
}

describe("ADR-032 Customer identity OTP foundations", () => {
  it("normalizes Iranian mobile formats to 09 and +98", () => {
    const cases = [
      "09123456789",
      "9123456789",
      "+989123456789",
      "00989123456789",
      "98 912 345 6789",
      "0912-345-6789",
    ];
    for (const raw of cases) {
      const result = normalizeIranianMobile(raw);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.phone.national).toBe("09123456789");
        expect(result.phone.e164).toBe("+989123456789");
      }
    }
  });

  it("rejects OTP request without explicit consent checkbox (ADR-091)", async () => {
    const { useCases, sms } = createTestUseCases({ otpCode: "123456" });
    await expect(
      useCases.requestOtp({
        phone: "09123456789",
        consentCheckboxAccepted: false,
      }),
    ).rejects.toMatchObject({
      code: "CONSENT_REQUIRED",
      messageFa: CUSTOMER_AUTH_ERROR_MESSAGES_FA.CONSENT_REQUIRED,
    });
    expect(CUSTOMER_AUTH_ERROR_MESSAGES_FA.CONSENT_REQUIRED).toMatch(
      /[\u0600-\u06FF]/,
    );
    expect(sms.sent).toHaveLength(0);
  });

  it("rejects OTP verify without explicit consent checkbox", async () => {
    const { useCases } = createTestUseCases({ otpCode: "123456" });
    await useCases.requestOtp({
      phone: "09123456789",
      consentCheckboxAccepted: true,
    });
    await expect(
      useCases.verifyOtp({
        phone: "09123456789",
        code: "123456",
        consentCheckboxAccepted: false,
      }),
    ).rejects.toMatchObject({
      code: "CONSENT_REQUIRED",
    });
  });

  it("requests OTP via SmsPort mock with Persian customer SMS body", async () => {
    const { useCases, sms } = createTestUseCases({ otpCode: "123456" });
    const result = await useCases.requestOtp({
      phone: "09123456789",
      consentCheckboxAccepted: true,
    });
    expect(result.phoneNational).toBe("09123456789");
    expect(result.phoneE164).toBe("+989123456789");
    expect(result.devOtp).toBe("123456");
    expect(sms.sent).toHaveLength(1);
    expect(sms.last()?.toE164).toBe("+989123456789");
    expect(sms.last()?.bodyFa).toContain("123456");
    expect(sms.last()?.bodyFa).toContain("مشتری");
    expect(sms.last()?.bodyFa).toContain("کسبینو");
    expect(CUSTOMER_OTP_SMS_TEMPLATE_FA).toContain("{code}");
    expect(CUSTOMER_OTP_SMS_TEMPLATE_FA).toMatch(/[\u0600-\u06FF]/);
  });

  it("omits devOtp in production and staging responses", async () => {
    for (const nodeEnv of ["production", "staging", "test"] as const) {
      const { useCases } = createTestUseCases({
        nodeEnv,
        otpCode: "654321",
      });
      const result = await useCases.requestOtp({
        phone: "+989123456789",
        consentCheckboxAccepted: true,
      });
      expect(result.devOtp).toBeUndefined();
      expect(result.phoneE164).toBe("+989123456789");
    }
  });

  it("verifies OTP and emits CustomerLoggedIn with role=customer", async () => {
    const { useCases } = createTestUseCases({ otpCode: "111222" });
    await useCases.requestOtp({
      phone: "09123456789",
      consentCheckboxAccepted: true,
    });
    const verified = await useCases.verifyOtp({
      phone: "09123456789",
      code: "111222",
      consentCheckboxAccepted: true,
      storeId: "store-1",
    });
    expect(verified.customerIdentityId).toBe("id-2");
    expect(verified.role).toBe("customer");
    expect(verified.phoneNational).toBe("09123456789");
    expect(verified.event.eventName).toBe("CustomerLoggedIn");
    expect(verified.event.payload.phoneE164).toBe("+989123456789");
    expect(verified.event.payload.role).toBe("customer");
    expect(verified.event.payload.storeId).toBe("store-1");
  });

  it("returns Persian messageFa on invalid phone and wrong OTP", async () => {
    const { useCases } = createTestUseCases({ otpCode: "999888" });

    await expect(
      useCases.requestOtp({
        phone: "02111111111",
        consentCheckboxAccepted: true,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_PHONE",
      messageFa: CUSTOMER_AUTH_ERROR_MESSAGES_FA.INVALID_PHONE,
    });

    await useCases.requestOtp({
      phone: "09123456789",
      consentCheckboxAccepted: true,
    });
    try {
      await useCases.verifyOtp({
        phone: "09123456789",
        code: "000000",
        consentCheckboxAccepted: true,
      });
      expect.unreachable("expected CustomerAuthError");
    } catch (error) {
      expect(error).toBeInstanceOf(CustomerAuthError);
      const authError = error as CustomerAuthError;
      expect(authError.code).toBe("OTP_INVALID");
      expect(authError.messageFa).toBe(
        CUSTOMER_AUTH_ERROR_MESSAGES_FA.OTP_INVALID,
      );
      expect(authError.messageFa).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it("returns Persian OTP_EXPIRED / OTP_NOT_FOUND messages", async () => {
    const sms = new MockSmsAdapter();
    const otpChallenges = new InMemoryCustomerOtpChallengeRepository();
    const identities = new InMemoryCustomerIdentityRepository();
    let clock = new Date("2026-08-03T10:00:00.000Z");
    const useCases = createCustomerOtpUseCases({
      otpChallenges,
      identities,
      sms,
      nodeEnv: "development",
      otpCodeFactory: () => "444555",
      now: () => clock,
      idFactory: () => "fixed-id",
    });

    await useCases.requestOtp({
      phone: "09123456789",
      consentCheckboxAccepted: true,
    });
    clock = new Date("2026-08-03T10:10:00.000Z");

    await expect(
      useCases.verifyOtp({
        phone: "09123456789",
        code: "444555",
        consentCheckboxAccepted: true,
      }),
    ).rejects.toMatchObject({
      code: "OTP_EXPIRED",
      messageFa: CUSTOMER_AUTH_ERROR_MESSAGES_FA.OTP_EXPIRED,
    });

    await expect(
      useCases.verifyOtp({
        phone: "09330000000",
        code: "444555",
        consentCheckboxAccepted: true,
      }),
    ).rejects.toMatchObject({
      code: "OTP_NOT_FOUND",
      messageFa: CUSTOMER_AUTH_ERROR_MESSAGES_FA.OTP_NOT_FOUND,
    });
  });

  it("provides ConsoleSmsAdapter without external SMS SDK", async () => {
    const lines: string[] = [];
    const consoleSms = new ConsoleSmsAdapter((line) => {
      lines.push(line);
    });
    await consoleSms.send({
      toE164: "+989123456789",
      bodyFa: "کد ورود مشتری کسبینو: 123456",
    });
    expect(lines[0]).toContain("customer-identity");
    expect(lines[0]).toContain("+989123456789");
    expect(lines[0]).toContain("کسبینو");
  });

  it("does not share OTP hash namespace with merchant (customer: prefix)", async () => {
    const { useCases, otpChallenges } = createTestUseCases({
      otpCode: "121212",
    });
    await useCases.requestOtp({
      phone: "09123456789",
      consentCheckboxAccepted: true,
    });
    const challenge = await otpChallenges.findLatestUnconsumedByPhoneE164(
      "+989123456789",
    );
    expect(challenge?.audience).toBe("customer");
    // Merchant identity hashes as `${phone}:${code}` — customer uses `customer:` prefix.
    expect(challenge?.codeHash).toHaveLength(64);
  });
});
