import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toISODate, type ISODate } from '../logic/dates';
import { latestReading, removeReading, upsertReading, type Reading } from '../logic/log';
import { contractFromDefaults, newRental, type Defaults, type RentalForm } from './rental';
import { loadAppData, saveAppData, type AppData } from './storage';

/** Loads the saved data once and saves every change straight away. `data` is null while loading. */
export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAppData(toISODate()).then((loaded) => {
      if (!cancelled) setData(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // saveAppData handles its own errors.
    if (data) saveAppData(data);
  }, [data]);

  const updateRental = useCallback((changes: Partial<RentalForm>) => {
    setData((current) => current && { ...current, rental: { ...current.rental, ...changes } });
  }, []);

  const saveDefaults = useCallback((defaults: Defaults, applyToCurrentRental: boolean) => {
    setData(
      (current) =>
        current && {
          defaults,
          rental: applyToCurrentRental ? { ...current.rental, ...contractFromDefaults(defaults) } : current.rental,
        },
    );
  }, []);

  /** Adds a reading to the daily log, replacing any reading of the same day. */
  const saveReading = useCallback((reading: Reading) => {
    setData(
      (current) =>
        current && {
          ...current,
          rental: { ...current.rental, readings: upsertReading(current.rental.readings, reading) },
        },
    );
  }, []);

  const deleteReading = useCallback((date: ISODate) => {
    setData(
      (current) =>
        current && {
          ...current,
          rental: { ...current.rental, readings: removeReading(current.rental.readings, date) },
        },
    );
  }, []);

  /** Resets the rental to the defaults; `sameCar` keeps the latest odometer reading as the new start reading. */
  const startNewRental = useCallback((sameCar: boolean) => {
    setData((current) => {
      if (!current) return current;
      const latest = latestReading(current.rental.readings);
      const odometer = sameCar && latest ? String(latest.km) : '';
      return { ...current, rental: newRental(current.defaults, toISODate(), odometer) };
    });
  }, []);

  return { data, updateRental, saveDefaults, saveReading, deleteReading, startNewRental };
}

/** Today's date, refreshed when the app comes back to the foreground and every minute. */
export function useToday(): ISODate {
  const [today, setToday] = useState(() => toISODate());

  useEffect(() => {
    const refresh = () => setToday(toISODate());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const timer = setInterval(refresh, 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);

  return today;
}
