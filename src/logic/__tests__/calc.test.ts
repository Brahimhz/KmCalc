import { periodEndDate, summarizeRental, totalAllowance, type RentalValues } from '../calc';

// A one month rental picked up on Sep 1, 2026: returned Oct 1, 30 days in total.
const base: RentalValues = {
  startKm: 45000,
  currentKm: null,
  allowanceKm: 2500,
  allowanceMode: 'total',
  periodLength: 1,
  periodUnit: 'month',
  startDate: '2026-09-01',
  extraKmRate: 0.5,
};
const rental = (overrides: Partial<RentalValues> = {}): RentalValues => ({ ...base, ...overrides });

describe('summarizeRental: distance', () => {
  it('computes the km left with the default 2,500 km allowance', () => {
    const summary = summarizeRental(rental({ currentKm: 46200 }), '2026-09-16');
    expect(summary).toMatchObject({
      status: 'ok',
      totalAllowanceKm: 2500,
      usedKm: 1200,
      remainingKm: 1300,
      extraKm: 0,
      extraCost: 0,
      usedFraction: 0.48,
      limitOdometer: 47500,
    });
  });

  it('computes the extra km and the extra charge above the allowance', () => {
    const summary = summarizeRental(rental({ currentKm: 47800 }), '2026-09-16');
    expect(summary).toMatchObject({ status: 'over', usedKm: 2800, remainingKm: 0, extraKm: 300, extraCost: 150 });
  });

  it('uses the configured rate for the extra charge', () => {
    expect(summarizeRental(rental({ currentKm: 47800, extraKmRate: 0.75 }), '2026-09-16').extraCost).toBe(225);
    expect(summarizeRental(rental({ currentKm: 47800, extraKmRate: 0 }), '2026-09-16').extraCost).toBe(0);
    expect(summarizeRental(rental({ currentKm: 47800, extraKmRate: null }), '2026-09-16').extraCost).toBeNull();
  });

  it('warns when the allowance is used up exactly', () => {
    const summary = summarizeRental(rental({ currentKm: 47500 }), '2026-09-30');
    expect(summary).toMatchObject({ status: 'warning', remainingKm: 0, extraKm: 0, extraCost: 0 });
  });

  it('warns from 90% of the allowance even when the pace is fine', () => {
    // 2,300 km in 29 days: on pace for ~2,379 km, below the allowance, but 92% is used.
    const summary = summarizeRental(rental({ currentKm: 47300 }), '2026-09-30');
    expect(summary.projectedExtraKm).toBe(0);
    expect(summary.status).toBe('warning');
  });

  it('asks for what is missing before calculating', () => {
    expect(summarizeRental(rental({ allowanceKm: null }), '2026-09-16').status).toBe('needsAllowance');
    expect(summarizeRental(rental({ allowanceKm: 0 }), '2026-09-16').status).toBe('needsAllowance');
    expect(summarizeRental(rental({ startKm: null, currentKm: 46000 }), '2026-09-16').status).toBe('needsStart');

    const needsCurrent = summarizeRental(rental(), '2026-09-16');
    expect(needsCurrent.status).toBe('needsCurrent');
    expect(needsCurrent.limitOdometer).toBe(47500);
    expect(needsCurrent.remainingKm).toBeNull();
  });

  it('rejects a current reading below the start reading', () => {
    const summary = summarizeRental(rental({ currentKm: 44000 }), '2026-09-16');
    expect(summary).toMatchObject({ status: 'invalidReadings', usedKm: null, remainingKm: null, extraKm: null });
  });
});

describe('totalAllowance', () => {
  it('uses the allowance as-is for the whole rental', () => {
    expect(totalAllowance({ allowanceKm: 2500, allowanceMode: 'total', periodLength: 3 })).toBe(2500);
  });

  it('multiplies a per-period allowance by the rental length', () => {
    expect(totalAllowance({ allowanceKm: 2500, allowanceMode: 'perPeriod', periodLength: 3 })).toBe(7500);
    expect(totalAllowance({ allowanceKm: 250, allowanceMode: 'perPeriod', periodLength: 10 })).toBe(2500);
  });

  it('needs a valid period for a per-period allowance', () => {
    expect(totalAllowance({ allowanceKm: 2500, allowanceMode: 'perPeriod', periodLength: null })).toBeNull();
    expect(totalAllowance({ allowanceKm: 2500, allowanceMode: 'perPeriod', periodLength: 0 })).toBeNull();
  });

  it('feeds the multiplied allowance into the summary', () => {
    const summary = summarizeRental(
      rental({ allowanceMode: 'perPeriod', periodLength: 3, currentKm: 50000 }),
      '2026-10-15',
    );
    expect(summary).toMatchObject({ totalAllowanceKm: 7500, remainingKm: 2500, limitOdometer: 52500 });
  });
});

describe('summarizeRental: schedule and pace', () => {
  it('counts the days of the rental period', () => {
    const summary = summarizeRental(rental({ currentKm: 46200 }), '2026-09-16');
    expect(summary).toMatchObject({
      endDate: '2026-10-01',
      totalDays: 30,
      daysElapsed: 15,
      daysLeft: 15,
      phase: 'active',
    });
  });

  it('projects the distance at the current pace', () => {
    // 1,200 km in 15 days = 80 km/day -> 2,400 km over 30 days.
    const summary = summarizeRental(rental({ currentKm: 46200 }), '2026-09-16');
    expect(summary.averageKmPerDay).toBe(80);
    expect(summary.projectedTotalKm).toBe(2400);
    expect(summary.projectedExtraKm).toBe(0);
    expect(summary.dailyBudgetKm).toBeCloseTo(1300 / 15);
    expect(summary.limitReachedOn).toBeNull();
  });

  it('warns when the pace leads over the allowance and says when the limit is reached', () => {
    // 1,200 km in 10 days = 120 km/day -> 3,600 km: 1,100 km (550 AED) over.
    const summary = summarizeRental(rental({ currentKm: 46200 }), '2026-09-11');
    expect(summary.status).toBe('warning');
    expect(summary.projectedTotalKm).toBe(3600);
    expect(summary.projectedExtraKm).toBe(1100);
    expect(summary.projectedExtraCost).toBe(550);
    // 2,500 km / 120 km per day = day 20 after pick-up.
    expect(summary.limitReachedOn).toBe('2026-09-21');
  });

  it('projects whole km so the extra cost matches the extra km', () => {
    // 1,300 km in 14 days = 92.86 km/day -> 2,785.7 km, shown as 2,786 km: 286 km (143 AED) over.
    const summary = summarizeRental(rental({ currentKm: 46300 }), '2026-09-15');
    expect(summary.projectedTotalKm).toBe(2786);
    expect(summary.projectedExtraKm).toBe(286);
    expect(summary.projectedExtraCost).toBe(143);
  });

  it('has no pace on the pick-up day but still gives a daily budget', () => {
    const summary = summarizeRental(rental({ currentKm: 45100 }), '2026-09-01');
    expect(summary).toMatchObject({
      phase: 'active',
      daysElapsed: 0,
      daysLeft: 30,
      averageKmPerDay: null,
      projectedTotalKm: null,
    });
    expect(summary.dailyBudgetKm).toBeCloseTo(2400 / 30);
  });

  it('handles a rental that has not started yet', () => {
    const summary = summarizeRental(rental({ currentKm: 45000 }), '2026-08-25');
    expect(summary).toMatchObject({ phase: 'upcoming', daysElapsed: 0, daysLeft: 30 });
    expect(summary.dailyBudgetKm).toBeCloseTo(2500 / 30);
  });

  it('uses the final distance once the rental has ended', () => {
    const summary = summarizeRental(rental({ currentKm: 47000 }), '2026-10-05');
    expect(summary).toMatchObject({
      phase: 'ended',
      daysElapsed: 30,
      daysLeft: 0,
      dailyBudgetKm: null,
      projectedTotalKm: 2000,
      limitReachedOn: null,
    });
  });

  it('has no schedule without a valid period', () => {
    const summary = summarizeRental(rental({ periodLength: null, currentKm: 46000 }), '2026-09-16');
    expect(summary).toMatchObject({ endDate: null, totalDays: null, phase: null, averageKmPerDay: null, status: 'ok' });
  });
});

describe('periodEndDate', () => {
  it('adds days, weeks and calendar months', () => {
    expect(periodEndDate('2026-09-29', 10, 'day')).toBe('2026-10-09');
    expect(periodEndDate('2026-09-29', 2, 'week')).toBe('2026-10-13');
    expect(periodEndDate('2026-09-29', 1, 'month')).toBe('2026-10-29');
    expect(periodEndDate('2026-11-15', 3, 'month')).toBe('2027-02-15');
  });

  it('clamps to the end of shorter months', () => {
    expect(periodEndDate('2026-01-31', 1, 'month')).toBe('2026-02-28');
    expect(periodEndDate('2028-01-31', 1, 'month')).toBe('2028-02-29');
  });
});
