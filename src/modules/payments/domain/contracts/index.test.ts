/**
 * ADR-012 — Payment Domain contract tests.
 */

import { describe, expect, it } from "vitest";

import {
  FEE_POLICY,
  FORBIDDEN_DEFAULT_PROVIDERS,
  PAYMENTS_COPY_FA,
  PAYMENTS_DECISION,
  SANDBOX_PROVIDER_ID,
  assertNotForbiddenDefaultProvider,
  paymentStatusLabelFa,
} from "./index.js";

describe("ADR-012 payments-domain", () => {
  it("locks sandbox-only until ADR-084 Accepted", () => {
    expect(PAYMENTS_DECISION.providerSelectionAdr).toBe("ADR-084");
    expect(PAYMENTS_DECISION.providerDecisionStatus).toBe("proposed");
    expect(PAYMENTS_DECISION.implementationAllowed).toBe(
      "ports_and_mocks_only",
    );
    expect(PAYMENTS_DECISION.sandboxProviderId).toBe(SANDBOX_PROVIDER_ID);
    expect(FORBIDDEN_DEFAULT_PROVIDERS).toContain("stripe");
  });

  it("keeps fees inactive for Kerman pilot", () => {
    expect(FEE_POLICY.active).toBe(false);
    expect(FEE_POLICY.computeTxFeeMinor(1_000_000n)).toBe(0n);
    expect(PAYMENTS_DECISION.fees.persianPilotCopy).toMatch(/کرمان|رایگان/);
    expect(PAYMENTS_COPY_FA.pilotFeeInactive).toMatch(/کرمان|رایگان/);
  });

  it("exposes Persian status labels", () => {
    expect(paymentStatusLabelFa("succeeded")).toBe("پرداخت موفق");
    expect(paymentStatusLabelFa("failed")).toBe("پرداخت ناموفق");
  });

  it("rejects Stripe-as-default assumption", () => {
    expect(() => assertNotForbiddenDefaultProvider("stripe")).toThrow(
      /ADR-012/,
    );
    expect(() => assertNotForbiddenDefaultProvider("sandbox")).not.toThrow();
  });
});
