/**
 * Iranian mobile identity VO (ADR-031 normalization).
 * Code identifiers stay English; user-facing copy remains Persian at presentation.
 */

import {
  normalizeIranianMobile,
  type IranianMobile,
} from "./iranian-phone.js";

export type PhoneNumber = {
  /** National Iranian mobile: 09xxxxxxxxx */
  readonly value: string;
  readonly e164: string;
};

export function phoneNumber(raw: string): PhoneNumber {
  const result = normalizeIranianMobile(raw);
  if (!result.ok) {
    throw new Error(
      "PhoneNumber must be a valid Iranian mobile (09xxxxxxxxx / +98)",
    );
  }
  return { value: result.phone.national, e164: result.phone.e164 };
}

export function toIranianMobile(phone: PhoneNumber): IranianMobile {
  return { national: phone.value, e164: phone.e164 };
}
