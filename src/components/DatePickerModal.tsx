import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  daysInMonth,
  formatDate,
  formatISODate,
  MONTH_NAMES,
  parseISODate,
  weekdayOf,
  type ISODate,
} from '../logic/dates';
import { usePalette, useThemedStyles, type Palette } from '../ui/theme';
import { Button } from './Button';
import { ModalCard } from './ModalCard';

interface Props {
  visible: boolean;
  value: ISODate;
  today: ISODate;
  onSelect: (date: ISODate) => void;
  onClose: () => void;
}

interface MonthRef {
  year: number;
  month: number;
}

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Day numbers for a month laid out in 6 rows of Monday-first weeks (null = empty cell). */
export function calendarRows({ year, month }: MonthRef): (number | null)[][] {
  const leadingBlanks = (weekdayOf(formatISODate({ year, month, day: 1 })) + 6) % 7;
  const cells: (number | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth(year, month); day++) cells.push(day);
  while (cells.length < 42) cells.push(null);
  return Array.from({ length: 6 }, (_, row) => cells.slice(row * 7, row * 7 + 7));
}

function monthOf(date: ISODate): MonthRef {
  const parts = parseISODate(date);
  return parts ? { year: parts.year, month: parts.month } : { year: 2000, month: 1 };
}

/**
 * Calendar in a modal. It starts on the month of `value` when mounted, so give
 * it a new `key` each time it is opened.
 */
export function DatePickerModal({ visible, value, today, onSelect, onClose }: Props) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const [shown, setShown] = useState<MonthRef>(() => monthOf(value));
  const rows = useMemo(() => calendarRows(shown), [shown]);

  const shiftMonth = (delta: number) =>
    setShown(({ year, month }) => {
      const index = year * 12 + (month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });

  return (
    <ModalCard visible={visible} onClose={onClose} testID="date-picker">
      <View style={styles.header}>
        <Pressable onPress={() => shiftMonth(-1)} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8}>
          <Feather name="chevron-left" size={26} color={palette.text} />
        </Pressable>
        <Text style={styles.monthTitle} accessibilityRole="header">
          {MONTH_NAMES[shown.month - 1]} {shown.year}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8}>
          <Feather name="chevron-right" size={26} color={palette.text} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAY_INITIALS.map((initial, index) => (
          <Text key={index} style={[styles.cell, styles.weekday]}>
            {initial}
          </Text>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.week}>
          {row.map((day, dayIndex) => {
            if (day === null) return <View key={dayIndex} style={styles.cell} />;
            const date = formatISODate({ ...shown, day });
            const selected = date === value;
            const isToday = date === today;
            return (
              <Pressable
                key={dayIndex}
                onPress={() => onSelect(date)}
                style={styles.cell}
                accessibilityRole="button"
                accessibilityLabel={formatDate(date)}
                accessibilityState={{ selected }}
              >
                <View style={[styles.day, isToday && styles.today, selected && styles.selected]}>
                  <Text style={[styles.dayText, isToday && styles.todayText, selected && styles.selectedText]}>{day}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.footer}>
        <Button variant="ghost" title="Today" onPress={() => onSelect(today)} />
        <Button variant="ghost" title="Cancel" onPress={onClose} />
      </View>
    </ModalCard>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    navButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    monthTitle: { fontSize: 17, fontWeight: '700', color: p.text },
    week: { flexDirection: 'row' },
    cell: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
    weekday: { fontSize: 12, fontWeight: '700', color: p.textMuted, textAlign: 'center', textAlignVertical: 'center', lineHeight: 42 },
    day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    today: { borderWidth: 1.5, borderColor: p.primary },
    selected: { backgroundColor: p.primary, borderWidth: 0 },
    dayText: { fontSize: 15, color: p.text, fontVariant: ['tabular-nums'] },
    todayText: { color: p.primary, fontWeight: '700' },
    selectedText: { color: p.onPrimary, fontWeight: '700' },
    footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  });
