import { describe, expect, it } from "vitest";

import {
  MERCHANT_AUTH_ERROR_MESSAGES_FA,
  MERCHANT_OTP_SMS_TEMPLATE_FA,
  MerchantAuthError,
  MockSmsAdapter,
  InMemoryAuthUserRepository,
  InMemoryOtpChallengeRepository,
  ConsoleSmsAdapter,
  createMerchantOtpUseCases,
  normalizeIranianMobile,
} from "./index.js";

function createTestUseCases(options?: {
  nodeEnv?: string;
  otpCode?: string;
  sms?: MockSmsAdapter;
}) {
  const sms = options?.sms ?? new MockSmsAdapter();
  const otpChallenges = new InMemoryOtpChallengeRepository();
  const authUsers = new InMemoryAuthUserRepository();
  const useCases = createMerchantOtpUseCases({
    otpChallenges,
    authUsers,
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
  return { useCases, sms, otpChallenges, authUsers };
}

describe("ADR-031 Identity merchant OTP foundations", () => {
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

  it("rejects invalid phones with INVALID_PHONE for Persian mapping", () => {
    expect(normalizeIranianMobile("02188776655").ok).toBe(false);
    expect(normalizeIranianMobile("0912345678").ok).toBe(false);
    expect(normalizeIranianMobile("").ok).toBe(false);
    expect(normalizeIranianMobile("hello").ok).toBe(false);
  });

  it("requests OTP via SmsPort mock with Persian SMS body (no provider SDK)", () => {
    const { useCases, sms } = createTestUseCases({ otpCode: "123456" });
    return useCases.requestOtp({ phone: "09123456789" }).then((result) => {
      expect(result.phoneNational).toBe("09123456789");
      expect(result.phoneE164).toBe("+989123456789");
      expect(result.devOtp).toBe("123456");
      expect(sms.sent).toHaveLength(1);
      expect(sms.last()?.toE164).toBe("+989123456789");
      expect(sms.last()?.bodyFa).toContain("123456");
      expect(sms.last()?.bodyFa).toContain("کسبینو");
      expect(MERCHANT_OTP_SMS_TEMPLATE_FA).toContain("{code}");
      expect(MERCHANT_OTP_SMS_TEMPLATE_FA).toMatch(/[\u0600-\u06FF]/);
    });
  });

  it("omits devOtp in production and staging responses", async () => {
    for (const nodeEnv of ["production", "staging", "test"] as const) {
      const { useCases } = createTestUseCases({
        nodeEnv,
        otpCode: "654321",
      });
      const result = await useCases.requestOtp({ phone: "+989123456789" });
      expect(result.devOtp).toBeUndefined();
      expect(result.phoneE164).toBe("+989123456789");
    }
  });

  it("verifies OTP and emits MerchantLoggedIn", async () => {
    const { useCases } = createTestUseCases({ otpCode: "111222" });
    await useCases.requestOtp({ phone: "09123456789" });
    const verified = await useCases.verifyOtp({
      phone: "09123456789",
      code: "111222",
    });
    expect(verified.authUserId).toBe("id-2");
    expect(verified.phoneNational).toBe("09123456789");
    expect(verified.event.eventName).toBe("MerchantLoggedIn");
    expect(verified.event.payload.phoneE164).toBe("+989123456789");
  });

  it("returns Persian messageFa on invalid phone and wrong OTP", async () => {
    const { useCases } = createTestUseCases({ otpCode: "999888" });

    await expect(useCases.requestOtp({ phone: "02111111111" })).rejects.toMatchObject({
      code: "INVALID_PHONE",
      messageFa: MERCHANT_AUTH_ERROR_MESSAGES_FA.INVALID_PHONE,
    });
    expect(MERCHANT_AUTH_ERROR_MESSAGES_FA.INVALID_PHONE).toMatch(
      /[\u0600-\u06FF]/,
    );

    await useCases.requestOtp({ phone: "09123456789" });
    try {
      await useCases.verifyOtp({ phone: "09123456789", code: "000000" });
      expect.unreachable("expected MerchantAuthError");
    } catch (error) {
      expect(error).toBeInstanceOf(MerchantAuthError);
      const authError = error as MerchantAuthError;
      expect(authError.code).toBe("OTP_INVALID");
      expect(authError.messageFa).toBe(MERCHANT_AUTH_ERROR_MESSAGES_FA.OTP_INVALID);
      expect(authError.messageFa).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it("returns Persian OTP_EXPIRED / OTP_NOT_FOUND messages", async () => {
    const sms = new MockSmsAdapter();
    const otpChallenges = new InMemoryOtpChallengeRepository();
    const authUsers = new InMemoryAuthUserRepository();
    let clock = new Date("2026-08-03T10:00:00.000Z");
    const useCases = createMerchantOtpUseCases({
      otpChallenges,
      authUsers,
      sms,
      nodeEnv: "development",
      otpCodeFactory: () => "444555",
      now: () => clock,
      idFactory: () => "fixed-id",
    });

    await useCases.requestOtp({ phone: "09123456789" });
    clock = new Date("2026-08-03T10:10:00.000Z");

    await expect(
      useCases.verifyOtp({ phone: "09123456789", code: "444555" }),
    ).rejects.toMatchObject({
      code: "OTP_EXPIRED",
      messageFa: MERCHANT_AUTH_ERROR_MESSAGES_FA.OTP_EXPIRED,
    });

    await expect(
      useCases.verifyOtp({ phone: "09330000000", code: "444555" }),
    ).rejects.toMatchObject({
      code: "OTP_NOT_FOUND",
      messageFa: MERCHANT_AUTH_ERROR_MESSAGES_FA.OTP_NOT_FOUND,
    });
  });

  it("provides ConsoleSmsAdapter without external SMS SDK", async () => {
    const lines: string[] = [];
    const consoleSms = new ConsoleSmsAdapter((line) => {
      lines.push(line);
    });
    await consoleSms.send({
      toE164: "+989123456789",
      bodyFa: "کد ورود کسبینو: 123456",
    });
    expect(lines[0]).toContain("+989123456789");
    expect(lines[0]).toContain("کسبینو");
  });
});
