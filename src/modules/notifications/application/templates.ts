/**
 * Persian notification templates (ADR-090 Iranian First).
 * SMS bodies length-conscious for Iranian mobile SMS.
 */

export const NOTIFICATION_TEMPLATES_FA = {
  order_created: {
    type: "order_created" as const,
    titleFa: "سفارش جدید",
    bodyFa: "یک سفارش حضوری جدید ثبت شد.",
    smsFa: "سفارش جدید در فروشگاه شما ثبت شد.",
  },
  order_ready_for_pickup: {
    type: "order_ready_for_pickup" as const,
    titleFa: "آماده تحویل",
    bodyFa: "سفارش شما آماده تحویل حضوری است.",
    /** Keep short for Iranian SMS segment limits. */
    smsFa: "سفارش شما آماده تحویل حضوری است. به فروشگاه مراجعه کنید.",
  },
  inventory_low: {
    type: "inventory_low" as const,
    titleFa: "موجودی کم",
    bodyFa: "موجودی یک کالا به حد هشدار رسیده است.",
    smsFa: "هشدار موجودی کم در فروشگاه شما.",
  },
  inventory_depleted: {
    type: "inventory_depleted" as const,
    titleFa: "اتمام موجودی",
    bodyFa: "موجودی یک کالا تمام شده است.",
    smsFa: "موجودی یک کالا در فروشگاه تمام شد.",
  },
  otp: {
    type: "otp" as const,
    titleFa: "کد تأیید",
    bodyFa: "کد تأیید ارسال شد.",
    /** `{code}` replaced at send time — never log the resulting body. */
    smsFa: "کد تأیید کسبینو: {code}",
  },
} as const;

/** Soft SMS length budget (~1 Iranian Persian SMS segment). */
export const SMS_LENGTH_BUDGET = {
  softMaxChars: 70,
  hardWarnChars: 140,
} as const;

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

export function isSmsLengthConscious(bodyFa: string): boolean {
  return bodyFa.length <= SMS_LENGTH_BUDGET.hardWarnChars;
}
