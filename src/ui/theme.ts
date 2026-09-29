import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export interface Palette {
  scheme: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  placeholder: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  good: string;
  goodSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  /** Result card backgrounds; text on them is always `onHero`. */
  heroOk: string;
  heroWarning: string;
  heroDanger: string;
  heroNeutral: string;
  onHero: string;
  overlay: string;
}

export const lightPalette: Palette = {
  scheme: 'light',
  background: '#F2F4F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F6FA',
  border: '#DCE2EB',
  text: '#111827',
  textMuted: '#5B6475',
  placeholder: '#A7AFBD',
  primary: '#2457F5',
  onPrimary: '#FFFFFF',
  primarySoft: '#E6EDFF',
  good: '#15803D',
  goodSoft: '#E4F5EA',
  warning: '#B45309',
  warningSoft: '#FDF1DE',
  danger: '#C62828',
  dangerSoft: '#FCEBEB',
  heroOk: '#2457F5',
  heroWarning: '#B45309',
  heroDanger: '#C62828',
  heroNeutral: '#334155',
  onHero: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.55)',
};

export const darkPalette: Palette = {
  scheme: 'dark',
  background: '#0B1120',
  surface: '#151C2C',
  surfaceMuted: '#1C2538',
  border: '#2A3448',
  text: '#F1F5F9',
  textMuted: '#9AA6B8',
  placeholder: '#56627A',
  primary: '#5B87FF',
  onPrimary: '#FFFFFF',
  primarySoft: '#1D2A4D',
  good: '#4ADE80',
  goodSoft: '#10301E',
  warning: '#FBBF24',
  warningSoft: '#3A2A0C',
  danger: '#F87171',
  dangerSoft: '#3B1616',
  heroOk: '#2B50D8',
  heroWarning: '#A1500C',
  heroDanger: '#B32424',
  heroNeutral: '#27324A',
  onHero: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.65)',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? darkPalette : lightPalette;
}

/**
 * Builds styles for the active palette. `factory` must be defined at module
 * level (and should return `StyleSheet.create(...)`) so it is only re-run when
 * the color scheme changes.
 */
export function useThemedStyles<T>(factory: (palette: Palette) => T): T {
  const palette = usePalette();
  return useMemo(() => factory(palette), [factory, palette]);
}

export const radius = { card: 18, field: 12, pill: 999 };
