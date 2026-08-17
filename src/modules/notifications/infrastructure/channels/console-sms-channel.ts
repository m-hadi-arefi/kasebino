/**
 * Console SMS notification adapter (ADR-083 Proposed — no vendor lock-in).
 * OTP category: never logs codes — redacts digit runs (ADR-090 / ADR-076).
 */

import {
  redactOtpCodesForLogs,
} from "../../domain/contracts/index.js";
import type {
  SmsNotificationChannelPort,
  SmsNotificationMessage,
} from "../../application/ports/sms-channel.js";

export type ConsoleSmsNotificationLogger = (line: string) => void;

export class ConsoleSmsNotificationChannel
  implements SmsNotificationChannelPort
{
  private readonly log: ConsoleSmsNotificationLogger;

  constructor(log: ConsoleSmsNotificationLogger = defaultConsoleLog) {
    this.log = log;
  }

  async send(message: SmsNotificationMessage): Promise<void> {
    if (message.category === "otp") {
      this.log(
        `[notifications/sms:console] category=otp to=${message.toE164} body=${redactOtpCodesForLogs(message.bodyFa)}`,
      );
      return;
    }
    this.log(
      `[notifications/sms:console] category=${message.category} to=${message.toE164} body=${message.bodyFa}`,
    );
  }
}

function defaultConsoleLog(line: string): void {
  process.stdout.write(`${line}\n`);
}
