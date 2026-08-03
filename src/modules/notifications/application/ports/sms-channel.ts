/**
 * SMS notification channel port (ADR-090).
 * Distinct from identity SmsPort — notifications audience / campaigns.
 * Production provider → ADR-083 Proposed. Never log OTP codes.
 */

export type SmsNotificationCategory = "transactional" | "otp" | "campaign";

export type SmsNotificationMessage = {
  /** E.164 destination, e.g. +98912…. */
  toE164: string;
  /** Persian body for Iranian recipients. */
  bodyFa: string;
  category: SmsNotificationCategory;
  merchantId?: string;
  storeId?: string | null;
};

export type SmsNotificationChannelPort = {
  send(message: SmsNotificationMessage): Promise<void>;
};
