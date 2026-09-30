import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate, formatDateWithWeekday, type ISODate } from '../logic/dates';
import type { LogEntry } from '../logic/log';
import { formatKm, formatNumber, formatSignedKm, plural } from '../logic/numbers';
import { radius, usePalette, useThemedStyles, type Palette } from '../ui/theme';
import { DifferenceBadge } from './DailyStats';
import { Icon } from './Icon';

/** Readings shown before "Show older readings". */
const VISIBLE_ROWS = 7;

interface Props {
  /** Oldest first, as built by `buildLog`. */
  entries: LogEntry[];
  startKm: number | null;
  startDate: ISODate;
  today: ISODate;
  onDelete: (entry: LogEntry) => void;
}

/** The daily log, newest first, with each reading's km and how it compares with the daily allowance. */
export function ReadingHistory({ entries, startKm, startDate, today, onDelete }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);
  const newestFirst = [...entries].reverse();
  const shown = expanded ? newestFirst : newestFirst.slice(0, VISIBLE_ROWS);
  const hidden = newestFirst.length - shown.length;

  return (
    <View style={styles.card} testID="history">
      {shown.map((entry, index) => (
        <HistoryRow key={entry.date} entry={entry} today={today} first={index === 0} onDelete={() => onDelete(entry)} />
      ))}
      {hidden > 0 || expanded ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          style={styles.more}
          accessibilityRole="button"
          testID="history-more"
        >
          <Text style={styles.moreText}>
            {expanded ? 'Show fewer' : `Show ${hidden} older ${plural(hidden, 'reading')}`}
          </Text>
        </Pressable>
      ) : null}
      {hidden === 0 && startKm !== null ? (
        <View style={[styles.row, styles.divider]}>
          <View style={styles.flex}>
            <Text style={styles.date}>{formatDateWithWeekday(startDate)}</Text>
            <Text style={styles.detail}>Pick-up</Text>
          </View>
          <Text style={styles.km}>{formatKm(startKm)}</Text>
          <View style={styles.deleteSpacer} />
        </View>
      ) : null}
    </View>
  );
}

function HistoryRow({
  entry,
  today,
  first,
  onDelete,
}: {
  entry: LogEntry;
  today: ISODate;
  first: boolean;
  onDelete: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const palette = usePalette();
  const when = entry.date === today ? `Today, ${formatDate(entry.date, false)}` : formatDateWithWeekday(entry.date);
  const detail = !entry.valid
    ? 'Check this reading: it is before the start or lower than the one before.'
    : entry.days > 1
    ? `${formatSignedKm(entry.distanceKm)} in ${entry.days} days · ${formatNumber(entry.perDayKm)} km/day`
    : formatSignedKm(entry.distanceKm);

  return (
    <View style={[styles.row, !first && styles.divider]} testID={`history-${entry.date}`}>
      <View style={styles.flex}>
        <Text style={styles.date}>{when}</Text>
        <Text style={[styles.detail, !entry.valid && { color: palette.warning }]}>{detail}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.km}>{formatKm(entry.km)}</Text>
        {entry.valid && entry.allowanceKm > 0 ? <DifferenceBadge entry={entry} /> : null}
      </View>
      <Pressable
        onPress={onDelete}
        hitSlop={10}
        style={styles.delete}
        accessibilityRole="button"
        accessibilityLabel={`Delete the reading of ${formatDate(entry.date)}`}
        testID={`delete-${entry.date}`}
      >
        <Icon name="trash-2" size={18} color={palette.textMuted} />
      </Pressable>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    card: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderRadius: radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
    date: { fontSize: 15, fontWeight: '700', color: p.text },
    detail: { marginTop: 2, fontSize: 13, color: p.textMuted },
    right: { alignItems: 'flex-end', gap: 4 },
    km: { fontSize: 13, color: p.textMuted, fontVariant: ['tabular-nums'] },
    delete: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
    deleteSpacer: { width: 32 },
    more: {
      paddingVertical: 12,
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
    },
    moreText: { fontSize: 14, fontWeight: '700', color: p.primary },
  });
