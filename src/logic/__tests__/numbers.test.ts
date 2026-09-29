import {
  formatKm,
  formatMoney,
  formatNumber,
  formatRate,
  normalizeDigits,
  parseNumber,
  roundTo,
  sanitizeDecimal,
  sanitizeInteger,
} from '../numbers';

/** Writes ASCII digits with the Arabic-Indic digits of an Arabic keyboard. */
const arabicDigits = (text: string) => text.replace(/\d/g, (digit) => String.fromCharCode(0x0660 + Number(digit)));
const persianDigits = (text: string) => text.replace(/\d/g, (digit) => String.fromCharCode(0x06f0 + Number(digit)));

describe('parsing input', () => {
  it('accepts Arabic-Indic digits', () => {
    expect(normalizeDigits(arabicDigits('45000'))).toBe('45000');
    expect(normalizeDigits(persianDigits('2500'))).toBe('2500');
    expect(sanitizeInteger(arabicDigits('46200'))).toBe('46200');
  });

  it('keeps only digits in whole-number fields', () => {
    expect(sanitizeInteger('45,000 km')).toBe('45000');
    expect(sanitizeInteger('abc')).toBe('');
  });

  it('keeps a single decimal separator and accepts a comma', () => {
    expect(sanitizeDecimal('0,5')).toBe('0.5');
    expect(sanitizeDecimal('1.2.3')).toBe('1.23');
    expect(sanitizeDecimal(`0${String.fromCharCode(0x066b)}75`)).toBe('0.75');
    expect(sanitizeDecimal('AED 0.5')).toBe('0.5');
  });

  it('parses numbers and treats empty input as missing', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('.')).toBeNull();
    expect(parseNumber('0')).toBe(0);
    expect(parseNumber('0.5')).toBe(0.5);
    expect(parseNumber('12.')).toBe(12);
    expect(parseNumber(arabicDigits('2500'))).toBe(2500);
  });
});

describe('formatting', () => {
  it('rounds half up despite floating point noise', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(116.545, 2)).toBe(116.55);
    expect(roundTo(-2.5, 0)).toBe(-3);
  });

  it('groups thousands', () => {
    expect(formatNumber(1300)).toBe('1,300');
    expect(formatNumber(1234567.891, 2)).toBe('1,234,567.89');
    expect(formatNumber(-1234.5, 1)).toBe('-1,234.5');
    expect(formatNumber(0.004, 2)).toBe('0');
    expect(formatNumber(999.96, 1)).toBe('1,000');
  });

  it('formats distances, money and rates', () => {
    expect(formatKm(1300)).toBe('1,300 km');
    expect(formatKm(12.5)).toBe('12.5 km');
    expect(formatKm(2500, false)).toBe('2,500');
    expect(formatMoney(150.5, 'AED')).toBe('150.50 AED');
    expect(formatMoney(1234, '')).toBe('1,234.00');
    expect(formatRate(0.5, 'AED')).toBe('0.5 AED/km');
    expect(formatRate(0.125, '')).toBe('0.125/km');
  });
});
