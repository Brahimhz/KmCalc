import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ISODate } from '../logic/dates';
import {
  FACTORY_DEFAULTS,
  isRecord,
  newRental,
  normalizeDefaults,
  normalizeRental,
  type Defaults,
  type RentalForm,
} from './rental';

export const STORAGE_KEY = 'kmcalc.state.v1';

export interface AppData {
  rental: RentalForm;
  defaults: Defaults;
}

export function initialAppData(today: ISODate): AppData {
  return { defaults: FACTORY_DEFAULTS, rental: newRental(FACTORY_DEFAULTS, today) };
}

/** Loads the saved rental and defaults, falling back to the factory defaults. */
export async function loadAppData(today: ISODate): Promise<AppData> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) {
      const saved: unknown = JSON.parse(json);
      if (isRecord(saved)) {
        const defaults = normalizeDefaults(saved.defaults);
        return { defaults, rental: normalizeRental(saved.rental, defaults, today) };
      }
    }
  } catch (error) {
    console.warn('KM Calc: could not read saved data', error);
  }
  return initialAppData(today);
}

export async function saveAppData(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...data }));
  } catch (error) {
    console.warn('KM Calc: could not save data', error);
  }
}
