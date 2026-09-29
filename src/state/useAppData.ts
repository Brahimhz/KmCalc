import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toISODate, type ISODate } from '../logic/dates';
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

  /** Resets the rental to the defaults; `sameCar` keeps the current odometer as the new start reading. */
  const startNewRental = useCallback((sameCar: boolean) => {
    setData((current) => {
      if (!current) return current;
      const odometer = sameCar ? current.rental.currentKm : '';
      return { ...current, rental: newRental(current.defaults, toISODate(), odometer) };
    });
  }, []);

  return { data, updateRental, saveDefaults, startNewRental };
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
