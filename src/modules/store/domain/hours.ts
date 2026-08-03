/**
 * Weekly store hours (ADR-006). Times as HH:mm strings in Asia/Tehran intent.
 * null day = closed.
 */

export const WEEKDAY_KEYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type DayHours = {
  readonly open: string;
  readonly close: string;
};

/** Iranian week starts Saturday; Friday often half/closed for retail. */
export type StoreHours = {
  readonly saturday: DayHours | null;
  readonly sunday: DayHours | null;
  readonly monday: DayHours | null;
  readonly tuesday: DayHours | null;
  readonly wednesday: DayHours | null;
  readonly thursday: DayHours | null;
  readonly friday: DayHours | null;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidHourTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function emptyStoreHours(): StoreHours {
  return {
    saturday: null,
    sunday: null,
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
  };
}

export function defaultIranRetailHours(): StoreHours {
  const day: DayHours = { open: "09:00", close: "21:00" };
  return {
    saturday: day,
    sunday: day,
    monday: day,
    tuesday: day,
    wednesday: day,
    thursday: day,
    friday: { open: "09:00", close: "13:00" },
  };
}
