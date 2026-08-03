/**
 * Iranian mobile MSISDN normalization (ADR-031).
 * Accepts 09xxxxxxxxx / +98 / 0098 / bare 9xxxxxxxxx forms.
 */

export type IranianMobile = {
  /** National form: 09xxxxxxxxx (11 digits). */
  readonly national: string;
  /** E.164: +989xxxxxxxxx. */
  readonly e164: string;
};

export type IranianPhoneNormalizeOk = {
  ok: true;
  phone: IranianMobile;
};

export type IranianPhoneNormalizeErr = {
  ok: false;
  code: "INVALID_PHONE";
};

export type IranianPhoneNormalizeResult =
  | IranianPhoneNormalizeOk
  | IranianPhoneNormalizeErr;

const IRAN_MOBILE_NATIONAL = /^09[0-9]{9}$/;

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Normalize Iranian mobile to national `09…` and E.164 `+98…`.
 * Does not throw — application maps `INVALID_PHONE` to Persian messages.
 */
export function normalizeIranianMobile(
  raw: string,
): IranianPhoneNormalizeResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, code: "INVALID_PHONE" };
  }

  let digits = digitsOnly(trimmed);

  if (digits.startsWith("0098")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("98")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("9") && digits.length === 10) {
    digits = `0${digits}`;
  }

  if (!IRAN_MOBILE_NATIONAL.test(digits)) {
    return { ok: false, code: "INVALID_PHONE" };
  }

  const national = digits;
  const e164 = `+98${national.slice(1)}`;
  return { ok: true, phone: { national, e164 } };
}

export function assertIranianMobile(raw: string): IranianMobile {
  const result = normalizeIranianMobile(raw);
  if (!result.ok) {
    throw new Error(`Invalid Iranian mobile: "${raw}"`);
  }
  return result.phone;
}
