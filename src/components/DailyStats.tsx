import { StyleSheet, Text, View } from 'react-native';

import { addDays, formatDate, formatDateWithWeekday, type ISODate } from '../logic/dates';
import type { DailyStats, DayStatus, LogEntry } from '../logic/log';
import { formatKm, formatNumber, formatPercent, formatSignedKm, plural } from '../logic/numbers';
import { radius, usePalette, useThemedStyles, type Palette } from '../ui/theme';
import { Icon, type IconName } from './Icon';

function useToneColors() {
  const palette = usePalette();
  return (status: DayStatus) =>
    ({
      over: { soft: palette.dangerSoft, strong: palette.danger },
      under: { soft: palette.goodSoft, strong: palette.good },
      even: { soft: palette.primarySoft, strong: palette.primary },
    }[status]);
}

const STATUS_ICON: Record<DayStatus, IconName> = { over: 'trending-up', under: 'trending-down', even: 'check-circle' };

/** "+44%" in red when above the daily allowance, "−28%" in green when below. */
export function DifferenceBadge({ entry }: { entry: LogEntry }) {
  const styles = useThemedStyles(makeStyles);
  const { soft, strong } = useToneColors()(entry.status);
  return (
    <View style={[styles.badge, { backgroundColor: soft }]}>
      <Text style={[styles.badgeText, { color: strong }]}>{formatPercent(entry.differenceFraction)}</Text>
    </View>
  );
}

/** How the latest reading compares with the daily allowance. */
export function DayResult({
  entry,
  today,
  dailyAllowanceKm,
}: {
  entry: LogEntry;
  today: ISODate;
  dailyAllowanceKm: number | null;
}) {
  const styles = useThemedStyles(makeStyles);
  const { soft, strong } = useToneColors()(entry.status);
  const from = addDays(entry.date, 1 - entry.days);
  const when =
    entry.days > 1
      ? `${formatDate(from, false)} – ${formatDate(entry.date, false)} (${entry.days} days)`
      : entry.date === today
      ? 'Today'
      : formatDateWithWeekday(entry.date);
  const driven =
    entry.days > 1
      ? `${formatKm(entry.distanceKm)} in ${entry.days} days (${formatNumber(entry.perDayKm)} km/day)`
      : `${formatKm(entry.distanceKm)} driven`;

  let headline = driven;
  let detail: string | null = null;
  if (dailyAllowanceKm !== null) {
    detail = `${driven} · allowance ${formatNumber(dailyAllowanceKm, 1)} km/day`;
    headline =
      entry.status === 'even'
        ? 'Right on your daily allowance'
        : `${formatSignedKm(entry.differenceKm)} (${formatPercent(entry.differenceFraction)}) ${
            entry.status === 'over' ? 'over' : 'under'
          } the daily allowance`;
  }

  return (
    <View style={[styles.result, { backgroundColor: soft }]} testID="day-result">
      <Icon name={STATUS_ICON[entry.status]} size={20} color={strong} style={styles.resultIcon} />
      <View style={styles.flex}>
        <Text style={styles.resultWhen}>{when}</Text>
        <Text style={[styles.resultHeadline, { color: strong }]}>{headline}</Text>
        {detail ? <Text style={styles.resultDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

/** Days over and under the daily allowance, with the km and percentages. */
export function DailyStatsCard({ stats, dailyAllowanceKm }: { stats: DailyStats; dailyAllowanceKm: number }) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const share = (days: number) => (stats.loggedDays > 0 ? formatPercent(days / stats.loggedDays, false) : '0%');
  const netColor = stats.netKm >= 0.5 ? palette.danger : stats.netKm <= -0.5 ? palette.good : palette.primary;

  return (
    <View style={styles.card} testID="daily-stats">
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Daily stats</Text>
        <Text style={styles.cardMeta}>Allowance {formatNumber(dailyAllowanceKm, 1)} km/day</Text>
      </View>
      <View style={styles.columns}>
        <StatColumn
          status="over"
          label="Over"
          days={stats.overDays}
          share={share(stats.overDays)}
          km={formatSignedKm(stats.overKm)}
          percent={formatPercent(stats.overFraction)}
          testID="stats-over"
        />
        <StatColumn
          status="under"
          label="Under"
          days={stats.underDays}
          share={share(stats.underDays)}
          km={formatSignedKm(-stats.underKm)}
          percent={formatPercent(-stats.underFraction)}
          testID="stats-under"
        />
      </View>
      <View style={styles.netRow} testID="stats-net">
        <View style={styles.flex}>
          <Text style={styles.netLabel}>Overall</Text>
          <Text style={styles.netCaption}>
            {stats.loggedDays} {plural(stats.loggedDays, 'day')} logged
            {stats.evenDays > 0 ? ` · ${stats.evenDays} on target` : ''}
          </Text>
        </View>
        <Text style={[styles.netValue, { color: netColor }]}>
          {formatSignedKm(stats.netKm)} ({formatPercent(stats.netFraction)})
        </Text>
      </View>
    </View>
  );
}

function StatColumn({
  status,
  label,
  days,
  share,
  km,
  percent,
  testID,
}: {
  status: DayStatus;
  label: string;
  days: number;
  share: string;
  km: string;
  percent: string;
  testID: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const { soft, strong } = useToneColors()(status);
  return (
    <View style={[styles.column, { backgroundColor: soft }]} testID={testID}>
      <View style={styles.columnHeader}>
        <Icon name={STATUS_ICON[status]} size={18} color={strong} />
        <Text style={[styles.columnLabel, { color: strong }]}>{label}</Text>
      </View>
      <Text style={styles.columnDays}>
        {days} {plural(days, 'day')}
      </Text>
      <Text style={styles.columnCaption}>{share} of the days</Text>
      <Text style={[styles.columnKm, { color: strong }]}>{km}</Text>
      <Text style={styles.columnCaption}>{percent} vs allowance</Text>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    badgeText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
    result: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 14,
      padding: 12,
      borderRadius: radius.field,
    },
    resultIcon: { marginTop: 2 },
    resultWhen: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: p.textMuted },
    resultHeadline: { marginTop: 2, fontSize: 16, fontWeight: '800' },
    resultDetail: { marginTop: 2, fontSize: 13, color: p.text },
    card: {
      padding: 16,
      borderRadius: radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 12,
    },
    cardTitle: { fontSize: 17, fontWeight: '800', color: p.text },
    cardMeta: { fontSize: 12, color: p.textMuted },
    columns: { flexDirection: 'row', gap: 12 },
    column: { flex: 1, padding: 12, borderRadius: radius.field },
    columnHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    columnLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
    columnDays: { marginTop: 8, fontSize: 22, fontWeight: '800', color: p.text, fontVariant: ['tabular-nums'] },
    columnKm: { marginTop: 8, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
    columnCaption: { fontSize: 12, color: p.textMuted },
    netRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
    },
    netLabel: { fontSize: 15, fontWeight: '700', color: p.text },
    netCaption: { fontSize: 12, color: p.textMuted },
    netValue: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  });
