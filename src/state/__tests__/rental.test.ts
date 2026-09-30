import {
  FACTORY_DEFAULTS,
  newRental,
  normalizeDefaults,
  normalizeReadings,
  normalizeRental,
  rentalValues,
  sanitizeCurrency,
} from '../rental';

const today = '2026-09-29';

describe('defaults', () => {
  it('ships with 2,500 km per 1 month and 0.5 AED per extra km', () => {
    expect(FACTORY_DEFAULTS).toEqual({
      allowanceKm: 2500,
      allowanceMode: 'total',
      periodLength: 1,
      periodUnit: 'month',
      extraKmRate: 0.5,
      currency: 'AED',
    });
  });

  it('fills a new rental with the defaults, starting today with an empty log', () => {
    expect(newRental(FACTORY_DEFAULTS, today)).toEqual({
      startKm: '',
      startDate: today,
      readings: [],
      periodLength: '1',
      periodUnit: 'month',
      allowanceKm: '2500',
      allowanceMode: 'total',
      extraKmRate: '0.5',
      currency: 'AED',
    });
  });

  it('can start a new rental from the odometer of the same car', () => {
    const rental = newRental(FACTORY_DEFAULTS, today, '46200');
    expect(rental.startKm).toBe('46200');
    expect(rental.readings).toEqual([]);
  });

  it('uses the latest reading as the current odometer', () => {
    const rental = {
      ...newRental(FACTORY_DEFAULTS, '2026-09-15'),
      startKm: '45000',
      readings: [
        { date: '2026-09-20', km: 45800 },
        { date: '2026-09-25', km: 46100 },
      ],
    };
    expect(rentalValues(rental)).toMatchObject({
      startKm: 45000,
      currentKm: 46100,
      currentDate: '2026-09-25',
      allowanceKm: 2500,
      periodLength: 1,
      extraKmRate: 0.5,
    });
    expect(rentalValues({ ...rental, readings: [] })).toMatchObject({ currentKm: null, currentDate: null });
  });
});

describe('loading saved data', () => {
  it('falls back to the factory defaults', () => {
    expect(normalizeDefaults(undefined)).toEqual(FACTORY_DEFAULTS);
    expect(normalizeDefaults('garbage')).toEqual(FACTORY_DEFAULTS);
  });

  it('keeps valid saved defaults and repairs invalid ones', () => {
    expect(
      normalizeDefaults({
        allowanceKm: 3000,
        periodUnit: 'week',
        periodLength: 2.7,
        extraKmRate: -1,
        currency: ' usd ',
      }),
    ).toEqual({
      allowanceKm: 3000,
      allowanceMode: 'total',
      periodLength: 2,
      periodUnit: 'week',
      extraKmRate: 0.5,
      currency: 'USD',
    });
    expect(normalizeDefaults({ allowanceKm: 0, periodLength: 0, allowanceMode: 'perPeriod' })).toMatchObject({
      allowanceKm: 2500,
      periodLength: 1,
      allowanceMode: 'perPeriod',
    });
  });

  it('repairs a saved rental', () => {
    const rental = normalizeRental(
      { startKm: '45,000', startDate: 'yesterday', periodUnit: 'year', extraKmRate: '0,75', readings: 'none' },
      FACTORY_DEFAULTS,
      today,
    );
    expect(rental).toEqual({
      startKm: '45000',
      startDate: today,
      readings: [],
      periodLength: '1',
      periodUnit: 'month',
      allowanceKm: '2500',
      allowanceMode: 'total',
      extraKmRate: '0.75',
      currency: 'AED',
    });
  });

  it('keeps well-formed readings, one per day, sorted', () => {
    expect(
      normalizeReadings([
        { date: '2026-09-20', km: 45900 },
        { date: '2026-09-18', km: 45700 },
        { date: '2026-09-20', km: 45950 },
        { date: 'soon', km: 46000 },
        { date: '2026-09-21', km: -5 },
        { date: '2026-09-22', km: '46100' },
        null,
      ]),
    ).toEqual([
      { date: '2026-09-18', km: 45700 },
      { date: '2026-09-20', km: 45950 },
    ]);
  });

  it('turns the current odometer of older versions into a reading for today', () => {
    const rental = normalizeRental({ startKm: '45000', currentKm: '46,200' }, FACTORY_DEFAULTS, today);
    expect(rental.readings).toEqual([{ date: today, km: 46200 }]);
    expect(normalizeRental({ startKm: '45000', currentKm: '' }, FACTORY_DEFAULTS, today).readings).toEqual([]);
  });

  it('cleans up currency codes', () => {
    expect(sanitizeCurrency(' aed ')).toBe('AED');
    expect(sanitizeCurrency('dollars')).toBe('DOLLAR');
  });
});
