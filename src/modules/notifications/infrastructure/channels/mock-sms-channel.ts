/**
 * In-memory mock SMS notification adapter (ADR-083 Proposed — no vendor).
 */

import type {
  SmsNotificationChannelPort,
  SmsNotificationMessage,
} from "../../application/ports/sms-channel.js";

export class MockSmsNotificationChannel implements SmsNotificationChannelPort {
  readonly sent: SmsNotificationMessage[] = [];

  async send(message: SmsNotificationMessage): Promise<void> {
    this.sent.push({ ...message });
  }

  clear(): void {
    this.sent.length = 0;
  }

  last(): SmsNotificationMessage | undefined {
    return this.sent[this.sent.length - 1];
  }
}
