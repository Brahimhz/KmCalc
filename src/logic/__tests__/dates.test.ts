import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  formatDate,
  formatDateWithWeekday,
  isValidISODate,
  parseISODate,
  toISODate,
  weekdayOf,
} from '../dates';

describe('dates', () => {
  it('uses the local calendar date', () => {
    expect(toISODate(new Date(2026, 8, 29, 23, 59))).toBe('2026-09-29');
    expect(toISODate(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  it('validates dates', () => {
    expect(parseISODate('2026-09-29')).toEqual({ year: 2026, month: 9, day: 29 });
    expect(parseISODate('2026-02-29')).toBeNull();
    expect(parseISODate('2028-02-29')).not.toBeNull();
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(parseISODate('29/09/2026')).toBeNull();
    expect(isValidISODate(42)).toBe(false);
  });

  it('knows the length of months', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 9)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it('adds days and months', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2026-08-31', 1)).toBe('2026-09-30');
  });

  it('counts whole days regardless of daylight saving time', () => {
    expect(diffDays('2026-10-01', '2026-09-01')).toBe(30);
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2);
    expect(diffDays('2026-11-02', '2026-10-31')).toBe(2);
    expect(diffDays('2026-09-01', '2026-09-16')).toBe(-15);
  });

  it('formats dates for display', () => {
    expect(weekdayOf('2026-09-29')).toBe(2);
    expect(formatDate('2026-09-29')).toBe('Sep 29, 2026');
    expect(formatDate('2026-09-29', false)).toBe('Sep 29');
    expect(formatDateWithWeekday('2026-10-01')).toBe('Thu, Oct 1, 2026');
  });
});
