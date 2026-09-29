import type { AllowanceMode, PeriodUnit, RentalValues } from '../logic/calc';
import { isValidISODate, type ISODate } from '../logic/dates';
import { parseNumber, sanitizeDecimal, sanitizeInteger } from '../logic/numbers';

/** Values that pre-fill every new rental. The user can change all of them in the app. */
export interface Defaults {
  allowanceKm: number;
  allowanceMode: AllowanceMode;
  periodLength: number;
  periodUnit: PeriodUnit;
  extraKmRate: number;
  currency: string;
}

export const FACTORY_DEFAULTS: Defaults = {
  allowanceKm: 2500,
  allowanceMode: 'total',
  periodLength: 1,
  periodUnit: 'month',
  extraKmRate: 0.5,
  currency: 'AED',
};

/** The current rental as edited on screen. Numbers are kept as the text the user typed. */
export interface RentalForm {
  startKm: string;
  currentKm: string;
  startDate: ISODate;
  periodLength: string;
  periodUnit: PeriodUnit;
  allowanceKm: string;
  allowanceMode: AllowanceMode;
  extraKmRate: string;
  currency: string;
}

export type ContractFields = Pick<
  RentalForm,
  'periodLength' | 'periodUnit' | 'allowanceKm' | 'allowanceMode' | 'extraKmRate' | 'currency'
>;

export const PERIOD_UNITS: readonly PeriodUnit[] = ['day', 'week', 'month'];
export const ALLOWANCE_MODES: readonly AllowanceMode[] = ['total', 'perPeriod'];

/** Currency codes or symbols such as "AED", "USD" or "$": no spaces, at most 6 characters. */
export function sanitizeCurrency(text: string): string {
  return text.replace(/\s/g, '').toUpperCase().slice(0, 6);
}

export function contractFromDefaults(defaults: Defaults): ContractFields {
  return {
    periodLength: String(defaults.periodLength),
    periodUnit: defaults.periodUnit,
    allowanceKm: String(defaults.allowanceKm),
    allowanceMode: defaults.allowanceMode,
    extraKmRate: String(defaults.extraKmRate),
    currency: defaults.currency,
  };
}

/**
 * A fresh rental starting today with the default contract values. Pass the
 * odometer reading when renewing the same car to start from where it is now.
 */
export function newRental(defaults: Defaults, today: ISODate, odometer = ''): RentalForm {
  return {
    startKm: odometer,
    currentKm: odometer,
    startDate: today,
    ...contractFromDefaults(defaults),
  };
}

export function rentalValues(form: RentalForm): RentalValues {
  return {
    startKm: parseNumber(form.startKm),
    currentKm: parseNumber(form.currentKm),
    allowanceKm: parseNumber(form.allowanceKm),
    allowanceMode: form.allowanceMode,
    periodLength: parseNumber(form.periodLength),
    periodUnit: form.periodUnit,
    startDate: form.startDate,
    extraKmRate: parseNumber(form.extraKmRate),
  };
}

// ---------------------------------------------------------------------------
// Validation of data loaded from storage (older versions, corrupted values...)

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const positive = (value: unknown) => (isFiniteNumber(value) && value > 0 ? value : undefined);
const nonNegative = (value: unknown) => (isFiniteNumber(value) && value >= 0 ? value : undefined);

function textWith(value: unknown, sanitize: (text: string) => string): string | undefined {
  return typeof value === 'string' ? sanitize(value) : undefined;
}

export function normalizeDefaults(raw: unknown): Defaults {
  const source = isRecord(raw) ? raw : {};
  const periodLength = positive(source.periodLength);
  return {
    allowanceKm: positive(source.allowanceKm) ?? FACTORY_DEFAULTS.allowanceKm,
    allowanceMode: oneOf(source.allowanceMode, ALLOWANCE_MODES) ?? FACTORY_DEFAULTS.allowanceMode,
    periodLength:
      periodLength !== undefined && periodLength >= 1 ? Math.floor(periodLength) : FACTORY_DEFAULTS.periodLength,
    periodUnit: oneOf(source.periodUnit, PERIOD_UNITS) ?? FACTORY_DEFAULTS.periodUnit,
    extraKmRate: nonNegative(source.extraKmRate) ?? FACTORY_DEFAULTS.extraKmRate,
    currency: textWith(source.currency, sanitizeCurrency) ?? FACTORY_DEFAULTS.currency,
  };
}

export function normalizeRental(raw: unknown, defaults: Defaults, today: ISODate): RentalForm {
  const fallback = newRental(defaults, today);
  if (!isRecord(raw)) return fallback;
  return {
    startKm: textWith(raw.startKm, sanitizeInteger) ?? fallback.startKm,
    currentKm: textWith(raw.currentKm, sanitizeInteger) ?? fallback.currentKm,
    startDate: isValidISODate(raw.startDate) ? raw.startDate : fallback.startDate,
    periodLength: textWith(raw.periodLength, sanitizeInteger) ?? fallback.periodLength,
    periodUnit: oneOf(raw.periodUnit, PERIOD_UNITS) ?? fallback.periodUnit,
    allowanceKm: textWith(raw.allowanceKm, sanitizeInteger) ?? fallback.allowanceKm,
    allowanceMode: oneOf(raw.allowanceMode, ALLOWANCE_MODES) ?? fallback.allowanceMode,
    extraKmRate: textWith(raw.extraKmRate, sanitizeDecimal) ?? fallback.extraKmRate,
    currency: textWith(raw.currency, sanitizeCurrency) ?? fallback.currency,
  };
}
