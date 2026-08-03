/**
 * SMS outbound port — customer-identity only (ADR-032).
 * Production provider selected in Proposed ADR-083.
 * Do not import merchant identity SmsPort — audience isolation.
 */

export type SmsMessage = {
  /** E.164 destination, e.g. +98912…. */
  toE164: string;
  /** Persian body for Iranian customers. */
  bodyFa: string;
};

export type SmsPort = {
  send(message: SmsMessage): Promise<void>;
};
