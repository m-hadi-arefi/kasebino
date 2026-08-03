/**
 * SMS outbound port — production provider selected in Proposed ADR-083.
 * Identity use cases depend on this port only (never a concrete SDK).
 */

export type SmsMessage = {
  /** E.164 destination, e.g. +98912…. */
  toE164: string;
  /** Persian body for Iranian merchants. */
  bodyFa: string;
};

export type SmsPort = {
  send(message: SmsMessage): Promise<void>;
};
