import {
  buildLog,
  latestReading,
  readingError,
  removeReading,
  summarizeDays,
  upsertReading,
  type Reading,
} from '../log';
import { formatPercent, formatSignedKm } from '../numbers';

// Picked up on Sep 1 at 45,000 km, with a daily allowance of 100 km.
const START_KM = 45000;
const START_DATE = '2026-09-01';

const readings: Reading[] = [
  { date: '2026-09-05', km: 45530 }, // 330 km in 3 days (Sep 3-5): 110 km/day
  { date: '2026-09-01', km: 45120 }, // 120 km on the pick-up day
  { date: '2026-09-02', km: 45200 }, // 80 km
];

describe('buildLog', () => {
  const log = buildLog(readings, START_KM, START_DATE, 100);

  it('compares every reading with the daily allowance, oldest first', () => {
    expect(log.map((e) => e.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-05']);
    expect(log[0]).toMatchObject({ days: 1, distanceKm: 120, allowanceKm: 100, differenceKm: 20, status: 'over' });
    expect(log[0].differenceFraction).toBeCloseTo(0.2);
    expect(log[1]).toMatchObject({ days: 1, distanceKm: 80, differenceKm: -20, status: 'under' });
    expect(log[1].differenceFraction).toBeCloseTo(-0.2);
  });

  it('spreads the km of skipped days evenly', () => {
    expect(log[2]).toMatchObject({ days: 3, distanceKm: 330, perDayKm: 110, allowanceKm: 300, status: 'over' });
    expect(log[2].differenceKm).toBeCloseTo(30);
    expect(log[2].differenceFraction).toBeCloseTo(0.1);
  });

  it('counts the days since pick-up for the first reading', () => {
    const [first] = buildLog([{ date: '2026-09-04', km: 45400 }], START_KM, START_DATE, 100);
    expect(first).toMatchObject({ days: 4, distanceKm: 400, status: 'even', differenceKm: 0 });
  });

  it('treats a day within half a km of the allowance as on target', () => {
    const [first] = buildLog([{ date: '2026-09-01', km: 45100.4 }], START_KM, START_DATE, 100);
    expect(first.status).toBe('even');
  });

  it('flags readings before the start or lower than the previous one and skips them', () => {
    const entries = buildLog(
      [
        { date: '2026-08-30', km: 44900 },
        { date: '2026-09-02', km: 45300 },
        { date: '2026-09-03', km: 45250 },
        { date: '2026-09-04', km: 45400 },
      ],
      START_KM,
      START_DATE,
      100,
    );
    expect(entries.map((e) => e.valid)).toEqual([false, true, false, true]);
    // Sep 4 is compared with Sep 2, the last valid reading.
    expect(entries[3]).toMatchObject({ days: 2, distanceKm: 100 });
  });

  it('only reports distances when the allowance is unknown', () => {
    const [first] = buildLog([{ date: '2026-09-01', km: 45150 }], START_KM, START_DATE, null);
    expect(first).toMatchObject({ distanceKm: 150, allowanceKm: 0, differenceKm: 0, status: 'even' });
  });
});

describe('summarizeDays', () => {
  it('adds up the days and km over and under the allowance', () => {
    const stats = summarizeDays(buildLog(readings, START_KM, START_DATE, 100));
    expect(stats).toMatchObject({ loggedDays: 5, overDays: 4, underDays: 1, evenDays: 0 });
    expect(stats.overKm).toBeCloseTo(50); // +20 on Sep 1 and +30 on Sep 3-5
    expect(stats.overFraction).toBeCloseTo(50 / 400);
    expect(stats.underKm).toBeCloseTo(20);
    expect(stats.underFraction).toBeCloseTo(0.2);
    expect(stats.netKm).toBeCloseTo(30); // 530 km driven for 500 km of allowance
    expect(stats.netFraction).toBeCloseTo(0.06);
  });

  it('is empty without readings', () => {
    expect(summarizeDays([])).toEqual({
      loggedDays: 0,
      overDays: 0,
      overKm: 0,
      overFraction: 0,
      underDays: 0,
      underKm: 0,
      underFraction: 0,
      evenDays: 0,
      netKm: 0,
      netFraction: 0,
    });
  });

  it('formats as signed km and percentages', () => {
    const stats = summarizeDays(buildLog(readings, START_KM, START_DATE, 100));
    expect(formatSignedKm(stats.overKm)).toBe('+50 km');
    expect(formatPercent(stats.overFraction)).toBe('+13%');
    expect(formatSignedKm(-stats.underKm)).toBe('−20 km');
    expect(formatPercent(-stats.underFraction)).toBe('−20%');
  });
});

describe('editing the log', () => {
  it('keeps one reading per day, sorted', () => {
    const edited = upsertReading(readings, { date: '2026-09-02', km: 45210 });
    expect(edited.map((r) => `${r.date}=${r.km}`)).toEqual([
      '2026-09-01=45120',
      '2026-09-02=45210',
      '2026-09-05=45530',
    ]);
    expect(removeReading(edited, '2026-09-02').map((r) => r.date)).toEqual(['2026-09-01', '2026-09-05']);
    expect(latestReading(readings)).toEqual({ date: '2026-09-05', km: 45530 });
    expect(latestReading([])).toBeNull();
  });
});

describe('readingError', () => {
  const check = (date: string, km: number | null, startKm: number | null = START_KM) =>
    readingError(readings, startKm, START_DATE, date, km);

  it('accepts readings that follow the odometer', () => {
    expect(check('2026-09-06', 45600)).toBeNull();
    expect(check('2026-09-03', 45300)).toBeNull(); // between Sep 2 and Sep 5
    expect(check('2026-09-05', 45560)).toBeNull(); // replaces the reading of that day
  });

  it('explains what is wrong', () => {
    expect(check('2026-09-06', null)).toBe('Enter the odometer reading.');
    expect(check('2026-09-06', 45600, null)).toBe('Enter the start odometer first.');
    expect(check('2026-08-31', 45000)).toBe('The rental starts on Sep 1, 2026.');
    expect(check('2026-09-06', 44000)).toBe('Lower than the start odometer (45,000 km).');
    expect(check('2026-09-06', 45500)).toBe('Lower than the reading of Sep 5 (45,530 km).');
    expect(check('2026-09-03', 45600)).toBe('Higher than the reading of Sep 5 (45,530 km).');
  });
});
