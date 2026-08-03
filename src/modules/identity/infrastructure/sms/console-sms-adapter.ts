/**
 * Console SMS adapter (ADR-083 Proposed — no vendor lock-in).
 * Records Persian OTP bodies for local observability; never a production SMS SDK.
 */

import type { SmsMessage, SmsPort } from "../../application/ports/sms-port.js";

export type ConsoleSmsLogger = (line: string) => void;

export class ConsoleSmsAdapter implements SmsPort {
  private readonly log: ConsoleSmsLogger;

  constructor(log: ConsoleSmsLogger = defaultConsoleLog) {
    this.log = log;
  }

  async send(message: SmsMessage): Promise<void> {
    this.log(
      `[identity/sms:console] to=${message.toE164} body=${message.bodyFa}`,
    );
  }
}

function defaultConsoleLog(line: string): void {
  process.stdout.write(`${line}\n`);
}
