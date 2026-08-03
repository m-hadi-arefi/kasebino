/**
 * In-memory mock SMS adapter for unit/integration tests (customer audience).
 * Does not call any external provider (ADR-083 remains Proposed).
 */

import type { SmsMessage, SmsPort } from "../../application/ports/sms-port.js";

export class MockSmsAdapter implements SmsPort {
  readonly sent: SmsMessage[] = [];

  async send(message: SmsMessage): Promise<void> {
    this.sent.push({ ...message });
  }

  clear(): void {
    this.sent.length = 0;
  }

  last(): SmsMessage | undefined {
    return this.sent[this.sent.length - 1];
  }
}
