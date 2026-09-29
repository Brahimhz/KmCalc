import {
  FACTORY_DEFAULTS,
  newRental,
  normalizeDefaults,
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

  it('fills a new rental with the defaults, starting today', () => {
    expect(newRental(FACTORY_DEFAULTS, today)).toEqual({
      startKm: '',
      currentKm: '',
      startDate: today,
      periodLength: '1',
      periodUnit: 'month',
      allowanceKm: '2500',
      allowanceMode: 'total',
      extraKmRate: '0.5',
      currency: 'AED',
    });
  });

  it('can start a new rental from the current odometer of the same car', () => {
    const rental = newRental(FACTORY_DEFAULTS, today, '46200');
    expect(rental.startKm).toBe('46200');
    expect(rental.currentKm).toBe('46200');
  });

  it('converts the form to numbers for the calculation', () => {
    expect(rentalValues({ ...newRental(FACTORY_DEFAULTS, today), startKm: '45000', currentKm: '' })).toMatchObject({
      startKm: 45000,
      currentKm: null,
      allowanceKm: 2500,
      periodLength: 1,
      extraKmRate: 0.5,
    });
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
      { startKm: '45,000', currentKm: 46200, startDate: 'yesterday', periodUnit: 'year', extraKmRate: '0,75' },
      FACTORY_DEFAULTS,
      today,
    );
    expect(rental).toEqual({
      startKm: '45000',
      currentKm: '',
      startDate: today,
      periodLength: '1',
      periodUnit: 'month',
      allowanceKm: '2500',
      allowanceMode: 'total',
      extraKmRate: '0.75',
      currency: 'AED',
    });
  });

  it('cleans up currency codes', () => {
    expect(sanitizeCurrency(' aed ')).toBe('AED');
    expect(sanitizeCurrency('dollars')).toBe('DOLLAR');
  });
});
