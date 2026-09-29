import { StyleSheet, Text, View } from 'react-native';

import type { RentalSummary } from '../logic/calc';
import { formatKm, formatMoney, formatNumber, formatRate } from '../logic/numbers';
import { radius, usePalette, useThemedStyles, type Palette } from '../ui/theme';
import { ProgressBar } from './ProgressBar';

interface Props {
  summary: RentalSummary;
  currency: string;
  rate: number | null;
}

type Tone = 'ok' | 'warning' | 'danger' | 'neutral';

interface ResultContent {
  tone: Tone;
  label: string;
  value: string;
  extraCharge?: string;
  progress?: number;
  usage?: string;
  percent?: string;
  note?: string;
}

function usageLines(summary: RentalSummary) {
  const used = summary.usedKm ?? 0;
  return {
    progress: summary.usedFraction ?? 0,
    usage: `${formatKm(used, false)} of ${formatKm(summary.totalAllowanceKm ?? 0)} used`,
    percent: `${Math.round((summary.usedFraction ?? 0) * 100)}%`,
  };
}

export function describeResult(summary: RentalSummary, currency: string, rate: number | null): ResultContent {
  switch (summary.status) {
    case 'needsAllowance':
      return {
        tone: 'neutral',
        label: 'KM allowance',
        value: 'Not set',
        note: 'Enter how many km your rental includes in the contract below.',
      };
    case 'needsStart':
      return {
        tone: 'neutral',
        label: 'Included in your rental',
        value: formatKm(summary.totalAllowanceKm ?? 0),
        note: 'Enter the odometer reading from when you picked up the car to start tracking.',
      };
    case 'needsCurrent':
      return {
        tone: 'ok',
        label: 'Odometer limit',
        value: `${formatNumber(summary.limitOdometer ?? 0)} km`,
        note: "Stay below this reading to avoid extra charges. Enter today's odometer to see how many km are left.",
      };
    case 'invalidReadings':
      return {
        tone: 'danger',
        label: 'Check the readings',
        value: '—',
        note: 'The current odometer is lower than the start reading.',
      };
    case 'over':
      return {
        tone: 'danger',
        label: 'Over the limit',
        value: `+${formatKm(summary.extraKm ?? 0)}`,
        extraCharge: summary.extraCost !== null ? formatMoney(summary.extraCost, currency) : 'Set the charge per km',
        ...usageLines(summary),
        note: rate !== null ? `${formatRate(rate, currency)} for every km above the allowance.` : undefined,
      };
    case 'ok':
    case 'warning':
      return {
        tone: summary.status,
        label: 'KM remaining',
        value: formatKm(summary.remainingKm ?? 0),
        ...usageLines(summary),
        note: `The limit is reached at ${formatNumber(summary.limitOdometer ?? 0)} km on the odometer.`,
      };
  }
}

export function ResultCard({ summary, currency, rate }: Props) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const content = describeResult(summary, currency, rate);
  const background = {
    ok: palette.heroOk,
    warning: palette.heroWarning,
    danger: palette.heroDanger,
    neutral: palette.heroNeutral,
  }[content.tone];

  return (
    <View style={[styles.card, { backgroundColor: background }]} testID="result-card">
      <Text style={styles.label}>{content.label}</Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit testID="result-value">
        {content.value}
      </Text>

      {content.extraCharge ? (
        <View style={styles.charge}>
          <Text style={styles.chargeLabel}>Extra charge</Text>
          <Text style={styles.chargeValue} testID="extra-charge">
            {content.extraCharge}
          </Text>
        </View>
      ) : null}

      {content.progress !== undefined ? (
        <View style={styles.progress}>
          <ProgressBar fraction={content.progress} color={palette.onHero} trackColor="rgba(255,255,255,0.28)" />
          <View style={styles.usageRow}>
            <Text style={styles.usageText}>{content.usage}</Text>
            <Text style={styles.usageText}>{content.percent}</Text>
          </View>
        </View>
      ) : null}

      {content.note ? <Text style={styles.note}>{content.note}</Text> : null}
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    card: { padding: 20, borderRadius: radius.card + 4 },
    label: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: p.onHero,
      opacity: 0.85,
    },
    value: { marginTop: 4, fontSize: 44, fontWeight: '800', color: p.onHero, fontVariant: ['tabular-nums'] },
    charge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.field,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    chargeLabel: { fontSize: 14, fontWeight: '600', color: p.onHero },
    chargeValue: { fontSize: 22, fontWeight: '800', color: p.onHero, fontVariant: ['tabular-nums'] },
    progress: { marginTop: 16, gap: 8 },
    usageRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    usageText: { fontSize: 14, fontWeight: '600', color: p.onHero, fontVariant: ['tabular-nums'] },
    note: { marginTop: 12, fontSize: 14, lineHeight: 20, color: p.onHero, opacity: 0.9 },
  });
