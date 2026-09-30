import { diffDays, formatDate, type ISODate } from './dates';
import { formatKm } from './numbers';

/**
 * The daily odometer log. A reading on a date is the odometer at the end of
 * that day. Readings can be skipped: the km of a reading taken after a gap are
 * spread evenly over the days since the previous reading.
 */
export interface Reading {
  date: ISODate;
  km: number;
}

export type DayStatus = 'over' | 'under' | 'even';

export interface LogEntry {
  date: ISODate;
  km: number;
  /** False when the reading is before the rental start or lower than the previous one; it is left out of the stats. */
  valid: boolean;
  /** Days since the previous reading. The first reading also counts the pick-up day. */
  days: number;
  distanceKm: number;
  perDayKm: number;
  /** What the daily allowance gives for those days (0 when the allowance is unknown). */
  allowanceKm: number;
  /** distanceKm − allowanceKm: positive when more was driven than the allowance. */
  differenceKm: number;
  /** differenceKm / allowanceKm, e.g. 0.44 for 44% over. */
  differenceFraction: number;
  status: DayStatus;
}

export interface DailyStats {
  loggedDays: number;
  overDays: number;
  /** km above the allowance on the "over" days (positive). */
  overKm: number;
  /** overKm / the allowance of those days. */
  overFraction: number;
  underDays: number;
  /** km below the allowance on the "under" days (positive). */
  underKm: number;
  underFraction: number;
  evenDays: number;
  /** km driven − allowance over all logged days: positive when ahead of the allowance. */
  netKm: number;
  netFraction: number;
}

/** A day within this many km of the daily allowance counts as on target. */
export const EVEN_TOLERANCE_KM = 0.5;

const byDate = (a: Reading, b: Reading) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

export function sortReadings(readings: readonly Reading[]): Reading[] {
  return [...readings].sort(byDate);
}

export function latestReading(readings: readonly Reading[]): Reading | null {
  return readings.reduce<Reading | null>((latest, r) => (latest === null || r.date >= latest.date ? r : latest), null);
}

/** Adds a reading, replacing any reading of the same day. */
export function upsertReading(readings: readonly Reading[], reading: Reading): Reading[] {
  return sortReadings([...readings.filter((r) => r.date !== reading.date), reading]);
}

export function removeReading(readings: readonly Reading[], date: ISODate): Reading[] {
  return readings.filter((r) => r.date !== date);
}

export function buildLog(
  readings: readonly Reading[],
  startKm: number,
  startDate: ISODate,
  dailyAllowanceKm: number | null,
): LogEntry[] {
  const entries: LogEntry[] = [];
  let previousDate: ISODate | null = null;
  let previousKm = startKm;

  for (const reading of sortReadings(readings)) {
    const days = previousDate === null ? diffDays(reading.date, startDate) + 1 : diffDays(reading.date, previousDate);
    const valid = days >= 1 && reading.km >= previousKm;
    const distanceKm = valid ? reading.km - previousKm : 0;
    const perDayKm = valid ? distanceKm / days : 0;
    const allowanceKm = valid && dailyAllowanceKm !== null ? dailyAllowanceKm * days : 0;
    const differenceKm = allowanceKm > 0 ? distanceKm - allowanceKm : 0;

    let status: DayStatus = 'even';
    if (allowanceKm > 0 && dailyAllowanceKm !== null && Math.abs(perDayKm - dailyAllowanceKm) >= EVEN_TOLERANCE_KM) {
      status = differenceKm > 0 ? 'over' : 'under';
    }

    entries.push({
      date: reading.date,
      km: reading.km,
      valid,
      days: valid ? days : 0,
      distanceKm,
      perDayKm,
      allowanceKm,
      differenceKm,
      differenceFraction: allowanceKm > 0 ? differenceKm / allowanceKm : 0,
      status,
    });

    if (valid) {
      previousDate = reading.date;
      previousKm = reading.km;
    }
  }
  return entries;
}

export function summarizeDays(entries: readonly LogEntry[]): DailyStats {
  const stats = {
    loggedDays: 0,
    overDays: 0,
    overKm: 0,
    underDays: 0,
    underKm: 0,
    evenDays: 0,
  };
  let overAllowance = 0;
  let underAllowance = 0;
  let driven = 0;
  let allowance = 0;

  for (const entry of entries) {
    if (!entry.valid) continue;
    stats.loggedDays += entry.days;
    driven += entry.distanceKm;
    allowance += entry.allowanceKm;
    if (entry.status === 'over') {
      stats.overDays += entry.days;
      stats.overKm += entry.differenceKm;
      overAllowance += entry.allowanceKm;
    } else if (entry.status === 'under') {
      stats.underDays += entry.days;
      stats.underKm -= entry.differenceKm;
      underAllowance += entry.allowanceKm;
    } else {
      stats.evenDays += entry.days;
    }
  }

  const netKm = allowance > 0 ? driven - allowance : 0;
  return {
    ...stats,
    overFraction: overAllowance > 0 ? stats.overKm / overAllowance : 0,
    underFraction: underAllowance > 0 ? stats.underKm / underAllowance : 0,
    netKm,
    netFraction: allowance > 0 ? netKm / allowance : 0,
  };
}

/** Why a new reading cannot be saved, or null when it is fine. */
export function readingError(
  readings: readonly Reading[],
  startKm: number | null,
  startDate: ISODate,
  date: ISODate,
  km: number | null,
): string | null {
  if (km === null) return 'Enter the odometer reading.';
  if (startKm === null) return 'Enter the start odometer first.';
  if (date < startDate) return `The rental starts on ${formatDate(startDate)}.`;
  if (km < startKm) return `Lower than the start odometer (${formatKm(startKm)}).`;
  const others = sortReadings(readings).filter((r) => r.date !== date);
  const previous = [...others].reverse().find((r) => r.date < date);
  if (previous && km < previous.km) {
    return `Lower than the reading of ${formatDate(previous.date, false)} (${formatKm(previous.km)}).`;
  }
  const next = others.find((r) => r.date > date);
  if (next && km > next.km) {
    return `Higher than the reading of ${formatDate(next.date, false)} (${formatKm(next.km)}).`;
  }
  return null;
}
