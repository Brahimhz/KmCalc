import type { AllowanceMode, PeriodUnit } from '../logic/calc';
import { formatNumber, formatRate } from '../logic/numbers';
import type { Defaults } from '../state/rental';

export const UNIT_WORDS: Record<PeriodUnit, { one: string; many: string; tab: string }> = {
  day: { one: 'day', many: 'days', tab: 'Days' },
  week: { one: 'week', many: 'weeks', tab: 'Weeks' },
  month: { one: 'month', many: 'months', tab: 'Months' },
};

export const PERIOD_OPTIONS: { value: PeriodUnit; label: string }[] = [
  { value: 'day', label: UNIT_WORDS.day.tab },
  { value: 'week', label: UNIT_WORDS.week.tab },
  { value: 'month', label: UNIT_WORDS.month.tab },
];

export function allowanceModeOptions(unit: PeriodUnit): { value: AllowanceMode; label: string }[] {
  return [
    { value: 'total', label: 'Whole rental' },
    { value: 'perPeriod', label: `Per ${UNIT_WORDS[unit].one}` },
  ];
}

/** "1 month", "3 weeks" */
export function describePeriod(length: number, unit: PeriodUnit): string {
  const words = UNIT_WORDS[unit];
  return `${formatNumber(length)} ${length === 1 ? words.one : words.many}`;
}

/** "2,500 km · 1 month · 0.5 AED/km" */
export function describeDefaults(defaults: Defaults): string {
  const perUnit = defaults.allowanceMode === 'perPeriod' ? ` per ${UNIT_WORDS[defaults.periodUnit].one}` : '';
  return [
    `${formatNumber(defaults.allowanceKm)} km${perUnit}`,
    describePeriod(defaults.periodLength, defaults.periodUnit),
    formatRate(defaults.extraKmRate, defaults.currency),
  ].join(' · ');
}
