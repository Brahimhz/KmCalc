import { addDays, addMonths, diffDays, type ISODate } from './dates';

export type PeriodUnit = 'day' | 'week' | 'month';

/**
 * How the KM allowance is defined in the contract:
 * - `total`: one allowance for the whole rental (e.g. 2,500 km for the rental)
 * - `perPeriod`: an allowance per period unit (e.g. 2,500 km per month for a 3 month rental)
 */
export type AllowanceMode = 'total' | 'perPeriod';

export interface RentalValues {
  /** Odometer reading when the car was picked up. */
  startKm: number | null;
  /** Latest odometer reading. */
  currentKm: number | null;
  allowanceKm: number | null;
  allowanceMode: AllowanceMode;
  periodLength: number | null;
  periodUnit: PeriodUnit;
  startDate: ISODate;
  /** Charge for every km driven above the allowance. */
  extraKmRate: number | null;
}

export type UsageStatus =
  | 'needsAllowance'
  | 'needsStart'
  | 'needsCurrent'
  | 'invalidReadings'
  | 'ok'
  | 'warning'
  | 'over';

export type RentalPhase = 'upcoming' | 'active' | 'ended';

export interface RentalSummary {
  status: UsageStatus;

  /** Allowance for the whole rental (the per-period allowance multiplied out). */
  totalAllowanceKm: number | null;
  /** The odometer reading at which the allowance runs out. */
  limitOdometer: number | null;

  usedKm: number | null;
  remainingKm: number | null;
  extraKm: number | null;
  extraCost: number | null;
  /** usedKm / totalAllowanceKm (can exceed 1). */
  usedFraction: number | null;

  endDate: ISODate | null;
  totalDays: number | null;
  /** Days since the start date, clamped to the rental period. */
  daysElapsed: number | null;
  daysLeft: number | null;
  phase: RentalPhase | null;

  /** Average km per day since pick-up (available from the second day). */
  averageKmPerDay: number | null;
  /** Km per day that can still be driven without going over the allowance. */
  dailyBudgetKm: number | null;
  /** Expected total distance at the end of the rental at the current pace. */
  projectedTotalKm: number | null;
  projectedExtraKm: number | null;
  projectedExtraCost: number | null;
  /** Date the allowance runs out at the current pace, when that is before the end date. */
  limitReachedOn: ISODate | null;
}

/** Share of the allowance used from which the result is shown as a warning. */
export const WARNING_FRACTION = 0.9;

const isPositive = (value: number | null): value is number => value !== null && value > 0;

/** Rental periods are counted in whole units; returns 0 when the length is missing or below one unit. */
const wholePeriods = (length: number | null): number => (length !== null && length >= 1 ? Math.floor(length) : 0);

export function periodEndDate(startDate: ISODate, length: number, unit: PeriodUnit): ISODate {
  switch (unit) {
    case 'day':
      return addDays(startDate, length);
    case 'week':
      return addDays(startDate, length * 7);
    case 'month':
      return addMonths(startDate, length);
  }
}

export function totalAllowance(values: Pick<RentalValues, 'allowanceKm' | 'allowanceMode' | 'periodLength'>): number | null {
  if (!isPositive(values.allowanceKm)) return null;
  if (values.allowanceMode === 'total') return values.allowanceKm;
  const periods = wholePeriods(values.periodLength);
  return periods > 0 ? values.allowanceKm * periods : null;
}

export function summarizeRental(values: RentalValues, today: ISODate): RentalSummary {
  const allowance = totalAllowance(values);
  const { startKm, currentKm } = values;
  const rate = values.extraKmRate !== null && values.extraKmRate >= 0 ? values.extraKmRate : null;

  // Schedule: independent of the odometer readings.
  let endDate: ISODate | null = null;
  let totalDays: number | null = null;
  let daysElapsed: number | null = null;
  let daysLeft: number | null = null;
  let phase: RentalPhase | null = null;
  const periods = wholePeriods(values.periodLength);
  if (periods > 0) {
    endDate = periodEndDate(values.startDate, periods, values.periodUnit);
    totalDays = diffDays(endDate, values.startDate);
    const sinceStart = diffDays(today, values.startDate);
    phase = sinceStart < 0 ? 'upcoming' : sinceStart >= totalDays ? 'ended' : 'active';
    daysElapsed = Math.min(Math.max(sinceStart, 0), totalDays);
    daysLeft = totalDays - daysElapsed;
  }

  // Usage.
  let status: UsageStatus;
  let usedKm: number | null = null;
  if (allowance === null) status = 'needsAllowance';
  else if (startKm === null) status = 'needsStart';
  else if (currentKm === null) status = 'needsCurrent';
  else if (currentKm < startKm) status = 'invalidReadings';
  else {
    usedKm = currentKm - startKm;
    status = usedKm > allowance ? 'over' : 'ok';
  }

  const limitOdometer = allowance !== null && startKm !== null ? startKm + allowance : null;
  const remainingKm = usedKm !== null && allowance !== null ? Math.max(allowance - usedKm, 0) : null;
  const extraKm = usedKm !== null && allowance !== null ? Math.max(usedKm - allowance, 0) : null;
  const extraCost = extraKm !== null && rate !== null ? extraKm * rate : null;
  const usedFraction = usedKm !== null && allowance !== null ? usedKm / allowance : null;

  // Pace and projection.
  let averageKmPerDay: number | null = null;
  let dailyBudgetKm: number | null = null;
  let projectedTotalKm: number | null = null;
  let projectedExtraKm: number | null = null;
  let projectedExtraCost: number | null = null;
  let limitReachedOn: ISODate | null = null;

  if (usedKm !== null && allowance !== null && remainingKm !== null && totalDays !== null && daysElapsed !== null && daysLeft !== null) {
    if (daysElapsed >= 1) {
      averageKmPerDay = usedKm / daysElapsed;
      // An estimate, so whole km: the extra km and the extra cost then match what is shown.
      projectedTotalKm = phase === 'ended' ? usedKm : Math.round(averageKmPerDay * totalDays);
      projectedExtraKm = Math.max(projectedTotalKm - allowance, 0);
      projectedExtraCost = rate !== null ? projectedExtraKm * rate : null;

      if (phase === 'active' && averageKmPerDay > 0 && remainingKm > 0) {
        // Days after the start date at which the allowance is used up at this pace.
        const limitDay = Math.floor(allowance / averageKmPerDay);
        if (limitDay < totalDays) limitReachedOn = addDays(values.startDate, limitDay);
      }
    }
    if (phase !== 'ended' && daysLeft > 0) dailyBudgetKm = remainingKm / daysLeft;
  }

  if (status === 'ok') {
    const nearLimit = usedFraction !== null && usedFraction >= WARNING_FRACTION;
    const onPaceToExceed = projectedExtraKm !== null && projectedExtraKm > 0;
    if (nearLimit || onPaceToExceed || remainingKm === 0) status = 'warning';
  }

  return {
    status,
    totalAllowanceKm: allowance,
    limitOdometer,
    usedKm,
    remainingKm,
    extraKm,
    extraCost,
    usedFraction,
    endDate,
    totalDays,
    daysElapsed,
    daysLeft,
    phase,
    averageKmPerDay,
    dailyBudgetKm,
    projectedTotalKm,
    projectedExtraKm,
    projectedExtraCost,
    limitReachedOn,
  };
}
