/**
 * Parsing and formatting helpers for numbers typed by the user.
 *
 * Inputs are kept as strings in the UI (so partially typed values such as
 * "0." survive re-renders) and converted to numbers only for calculations.
 */

const ARABIC_INDIC_ZERO = 0x0660;
const EASTERN_ARABIC_INDIC_ZERO = 0x06f0;
const ARABIC_DECIMAL_SEPARATOR = String.fromCharCode(0x066b);

/** Converts Arabic-Indic and Eastern Arabic-Indic digits (as typed on Arabic keyboards) to ASCII digits. */
export function normalizeDigits(text: string): string {
  let result = '';
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      result += String(code - ARABIC_INDIC_ZERO);
    } else if (code >= EASTERN_ARABIC_INDIC_ZERO && code <= EASTERN_ARABIC_INDIC_ZERO + 9) {
      result += String(code - EASTERN_ARABIC_INDIC_ZERO);
    } else {
      result += char;
    }
  }
  return result;
}

/** Keeps digits only. Used for whole-number fields such as odometer readings. */
export function sanitizeInteger(text: string): string {
  return normalizeDigits(text).replace(/\D/g, '');
}

/**
 * Keeps digits and a single decimal separator. Accepts ".", "," and the Arabic
 * decimal separator, and always stores ".".
 */
export function sanitizeDecimal(text: string): string {
  const cleaned = normalizeDigits(text)
    .split(ARABIC_DECIMAL_SEPARATOR)
    .join('.')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

/** Parses a user-entered value. Returns null when the field is empty or not a number. */
export function parseNumber(text: string): number | null {
  const cleaned = sanitizeDecimal(text);
  if (cleaned === '' || cleaned === '.') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Rounds half away from zero, tolerating binary floating point noise (1.005 -> 1.01). */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const scaled = value * factor;
  return Math.round(scaled + (scaled >= 0 ? 1e-7 : -1e-7)) / factor;
}

/**
 * Formats a number with thousands separators, e.g. 1234567.5 -> "1,234,567.5".
 * Trailing zeros are trimmed down to `minDecimals`.
 */
export function formatNumber(value: number, maxDecimals = 0, minDecimals = 0): string {
  const rounded = roundTo(value, maxDecimals);
  const [whole, fullFraction = ''] = Math.abs(rounded).toFixed(maxDecimals).split('.');
  let fraction = fullFraction;
  while (fraction.length > minDecimals && fraction.endsWith('0')) {
    fraction = fraction.slice(0, -1);
  }
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`;
}

/** Formats a distance, keeping one decimal only when the value has one: "1,300 km", "12.5 km". */
export function formatKm(value: number, withUnit = true): string {
  const text = formatNumber(value, 1);
  return withUnit ? `${text} km` : text;
}

/** Formats a money amount with exactly two decimals: "150.50 AED". */
export function formatMoney(amount: number, currency: string): string {
  const text = formatNumber(amount, 2, 2);
  return currency ? `${text} ${currency}` : text;
}

/** Formats a per-km rate, keeping up to three decimals: "0.5 AED/km". */
export function formatRate(rate: number, currency: string): string {
  const text = formatNumber(rate, 3);
  return currency ? `${text} ${currency}/km` : `${text}/km`;
}

/** Picks the singular or plural form of a word for a count. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}
