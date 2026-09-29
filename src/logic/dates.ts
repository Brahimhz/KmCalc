/**
 * Calendar-date helpers working on "YYYY-MM-DD" strings.
 *
 * Dates are converted to whole day numbers (days since 1970-01-01, computed in
 * UTC) so that day differences are never affected by time zones or daylight
 * saving changes.
 */

export type ISODate = string;

const MS_PER_DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface DateParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseISODate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isValidISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && parseISODate(value) !== null;
}

export function formatISODate({ year, month, day }: DateParts): ISODate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** The local calendar date of `date` (defaults to now). */
export function toISODate(date: Date = new Date()): ISODate {
  return formatISODate({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
}

export function toDayNumber(value: ISODate): number {
  const parts = parseISODate(value);
  if (!parts) throw new Error(`Invalid date: ${value}`);
  return Math.round(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

export function fromDayNumber(dayNumber: number): ISODate {
  const date = new Date(dayNumber * MS_PER_DAY);
  return formatISODate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function addDays(value: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(value) + days);
}

/** Adds calendar months, clamping to the end of shorter months (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(value: ISODate, months: number): ISODate {
  const parts = parseISODate(value);
  if (!parts) throw new Error(`Invalid date: ${value}`);
  const monthIndex = parts.year * 12 + (parts.month - 1) + months;
  const year = Math.floor(monthIndex / 12);
  const month = monthIndex - year * 12 + 1;
  return formatISODate({ year, month, day: Math.min(parts.day, daysInMonth(year, month)) });
}

/** Whole days from `earlier` to `later` (negative when `later` is before `earlier`). */
export function diffDays(later: ISODate, earlier: ISODate): number {
  return toDayNumber(later) - toDayNumber(earlier);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(value: ISODate): number {
  return (((toDayNumber(value) + 4) % 7) + 7) % 7;
}

/** "Sep 29, 2026", or "Sep 29" without the year. */
export function formatDate(value: ISODate, withYear = true): string {
  const parts = parseISODate(value);
  if (!parts) return value;
  const text = `${MONTHS[parts.month - 1]} ${parts.day}`;
  return withYear ? `${text}, ${parts.year}` : text;
}

/** "Tue, Sep 29, 2026" */
export function formatDateWithWeekday(value: ISODate): string {
  return `${WEEKDAYS[weekdayOf(value)]}, ${formatDate(value)}`;
}
