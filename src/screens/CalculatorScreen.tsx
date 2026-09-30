import { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { DailyStatsCard, DayResult } from '../components/DailyStats';
import { DatePickerModal } from '../components/DatePickerModal';
import { Field } from '../components/Field';
import { Icon, type IconName } from '../components/Icon';
import { ModalCard } from '../components/ModalCard';
import { ReadingHistory } from '../components/ReadingHistory';
import { ResultCard } from '../components/ResultCard';
import { SegmentedControl } from '../components/SegmentedControl';
import { StatTile, type Tone } from '../components/StatTile';
import { summarizeRental, type RentalSummary } from '../logic/calc';
import { formatDate, formatDateWithWeekday, type ISODate } from '../logic/dates';
import { buildLog, latestReading, readingError, summarizeDays, type LogEntry, type Reading } from '../logic/log';
import { formatKm, formatMoney, formatNumber, parseNumber, plural } from '../logic/numbers';
import { rentalValues, sanitizeCurrency, type Defaults, type RentalForm } from '../state/rental';
import { allowanceModeOptions, describeDefaults, describePeriod, PERIOD_OPTIONS, UNIT_WORDS } from '../ui/labels';
import { radius, usePalette, useThemedStyles, type Palette } from '../ui/theme';

type Dialog = 'startDate' | 'readingDate' | 'deleteReading' | 'newRental';

interface Props {
  rental: RentalForm;
  defaults: Defaults;
  today: ISODate;
  onChange: (changes: Partial<RentalForm>) => void;
  onSaveReading: (reading: Reading) => void;
  onDeleteReading: (date: ISODate) => void;
  onStartNewRental: (sameCar: boolean) => void;
  onOpenDefaults: () => void;
}

export function CalculatorScreen({
  rental,
  defaults,
  today,
  onChange,
  onSaveReading,
  onDeleteReading,
  onStartNewRental,
  onOpenDefaults,
}: Props) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [openDialog, setOpenDialog] = useState<Dialog | null>(null);
  // Changes every time a dialog opens so it is re-created with fresh state.
  const [dialogSession, setDialogSession] = useState(0);

  const showDialog = (dialog: Dialog) => {
    setDialogSession((session) => session + 1);
    setOpenDialog(dialog);
  };
  const closeDialog = () => setOpenDialog(null);

  // The reading being entered. The draft stays null until the user types, so the saved reading of the chosen day shows.
  const [readingDateChoice, setReadingDateChoice] = useState<ISODate | null>(null);
  const [readingDraft, setReadingDraft] = useState<string | null>(null);
  const [readingProblem, setReadingProblem] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<LogEntry | null>(null);

  const values = useMemo(() => rentalValues(rental), [rental]);
  const summary = useMemo(() => summarizeRental(values, today), [values, today]);
  const log = useMemo(
    () =>
      values.startKm === null
        ? []
        : buildLog(rental.readings, values.startKm, rental.startDate, summary.dailyAllowanceKm),
    [rental.readings, rental.startDate, values.startKm, summary.dailyAllowanceKm],
  );
  const dayStats = useMemo(() => summarizeDays(log), [log]);
  const latestEntry = [...log].reverse().find((entry) => entry.valid) ?? null;
  const note = paceNote(summary, rental.startDate, today, rental.currency);

  const readingDate = readingDateChoice ?? today;
  const savedForDate = rental.readings.find((reading) => reading.date === readingDate) ?? null;
  const readingText = readingDraft ?? (savedForDate ? String(savedForDate.km) : '');
  const latest = latestReading(rental.readings);

  const submitReading = () => {
    const km = parseNumber(readingText);
    const problem = readingError(rental.readings, values.startKm, rental.startDate, readingDate, km);
    if (problem !== null || km === null) {
      setReadingProblem(problem);
      return;
    }
    onSaveReading({ date: readingDate, km });
    setReadingDraft(null);
    setReadingProblem(null);
    setReadingDateChoice(null);
  };

  const allowanceHint =
    rental.allowanceMode === 'total'
      ? 'One allowance for the whole rental period.'
      : summary.totalAllowanceKm !== null && values.periodLength !== null
      ? `${formatKm(values.allowanceKm ?? 0)} × ${describePeriod(
          Math.floor(values.periodLength),
          rental.periodUnit,
        )} = ${formatKm(summary.totalAllowanceKm)} in total.`
      : `Allowance for each ${UNIT_WORDS[rental.periodUnit].one} of the rental.`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.column}>
            <View style={styles.header}>
              <View style={styles.brand}>
                <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
                <View>
                  <Text style={styles.title} accessibilityRole="header">
                    KM Calc
                  </Text>
                  <Text style={styles.subtitle}>Rental car mileage</Text>
                </View>
              </View>
              <Pressable
                onPress={onOpenDefaults}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel="Default values"
                hitSlop={8}
                testID="open-defaults"
              >
                <Icon name="sliders" size={20} color={palette.text} />
              </Pressable>
            </View>

            <ResultCard summary={summary} currency={rental.currency} rate={values.extraKmRate} />

            <View style={styles.card}>
              <View style={styles.row}>
                <Field
                  label="Start odometer"
                  hint="At pick-up"
                  value={rental.startKm}
                  onChangeText={(startKm) => onChange({ startKm })}
                  suffix="km"
                  placeholder="000000"
                  size="large"
                  maxLength={7}
                  selectTextOnFocus
                  testID="start-km"
                  style={styles.flex}
                />
                <Field
                  label={readingDate === today ? "Today's reading" : `Reading of ${formatDate(readingDate, false)}`}
                  value={readingText}
                  onChangeText={(text) => {
                    setReadingDraft(text);
                    setReadingProblem(null);
                  }}
                  onSubmitEditing={submitReading}
                  suffix="km"
                  placeholder={latest ? String(latest.km) : '000000'}
                  size="large"
                  maxLength={7}
                  selectTextOnFocus
                  error={readingProblem}
                  accessibilityLabel="Odometer reading"
                  testID="reading-km"
                  style={styles.flex}
                />
              </View>
              <View style={styles.readingActions}>
                <Pressable
                  onPress={() => showDialog('readingDate')}
                  style={styles.dateChip}
                  accessibilityRole="button"
                  accessibilityLabel={`Reading date: ${formatDateWithWeekday(readingDate)}`}
                  accessibilityHint="Opens a calendar to save a reading for another day"
                  testID="reading-date"
                >
                  <Icon name="calendar" size={18} color={palette.primary} />
                  <Text style={styles.dateChipText}>
                    {readingDate === today ? 'Today' : formatDate(readingDate, false)}
                  </Text>
                  <Icon name="chevron-down" size={18} color={palette.textMuted} />
                </Pressable>
                <Button
                  title={savedForDate ? 'Update reading' : 'Save reading'}
                  icon="save"
                  onPress={submitReading}
                  testID="save-reading"
                  style={styles.flex}
                />
              </View>
              {latestEntry ? (
                <DayResult entry={latestEntry} today={today} dailyAllowanceKm={summary.dailyAllowanceKm} />
              ) : (
                <Text style={styles.readingHint}>
                  Save the odometer once a day, e.g. every evening. Skipped a day? The km are spread over the days in
                  between.
                </Text>
              )}
            </View>

            {summary.dailyAllowanceKm !== null && dayStats.loggedDays > 0 ? (
              <DailyStatsCard stats={dayStats} dailyAllowanceKm={summary.dailyAllowanceKm} />
            ) : null}

            <View style={styles.tiles}>
              {statTiles(summary, rental.startDate, today).map((tile) => (
                <StatTile key={tile.testID} {...tile} />
              ))}
            </View>

            {note ? <PaceNote {...note} /> : null}

            {log.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>History</Text>
                <ReadingHistory
                  entries={log}
                  startKm={values.startKm}
                  startDate={rental.startDate}
                  today={today}
                  onDelete={(entry) => {
                    setEntryToDelete(entry);
                    showDialog('deleteReading');
                  }}
                />
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Rental contract</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Start date</Text>
              <Pressable
                onPress={() => showDialog('startDate')}
                style={styles.dateButton}
                accessibilityRole="button"
                accessibilityLabel={`Start date: ${formatDateWithWeekday(rental.startDate)}`}
                accessibilityHint="Opens a calendar"
                testID="start-date"
              >
                <Icon name="calendar" size={20} color={palette.primary} />
                <Text style={styles.dateText}>{formatDateWithWeekday(rental.startDate)}</Text>
                <Icon name="chevron-down" size={20} color={palette.textMuted} />
              </Pressable>

              <View style={styles.divider} />

              <Text style={styles.fieldLabel}>Rental period</Text>
              <View style={styles.row}>
                <Field
                  value={rental.periodLength}
                  onChangeText={(periodLength) => onChange({ periodLength })}
                  maxLength={3}
                  accessibilityLabel="Rental period length"
                  testID="period-length"
                  style={styles.periodLength}
                />
                <SegmentedControl
                  options={PERIOD_OPTIONS}
                  value={rental.periodUnit}
                  onChange={(periodUnit) => onChange({ periodUnit })}
                  accessibilityLabel="Rental period unit"
                  style={styles.flex}
                />
              </View>
              <Text style={[styles.hint, summary.endDate === null && styles.hintError]}>
                {summary.endDate !== null && summary.totalDays !== null
                  ? `Return on ${formatDateWithWeekday(summary.endDate)} · ${summary.totalDays} ${plural(
                      summary.totalDays,
                      'day',
                    )}`
                  : 'Enter the length of the rental.'}
              </Text>

              <View style={styles.divider} />

              <Field
                label="KM allowance"
                value={rental.allowanceKm}
                onChangeText={(allowanceKm) => onChange({ allowanceKm })}
                suffix="km"
                maxLength={7}
                error={
                  values.allowanceKm === null || values.allowanceKm <= 0
                    ? 'Enter the km included in the contract.'
                    : null
                }
                testID="allowance-km"
              />
              <SegmentedControl
                options={allowanceModeOptions(rental.periodUnit)}
                value={rental.allowanceMode}
                onChange={(allowanceMode) => onChange({ allowanceMode })}
                accessibilityLabel="The allowance is for"
                style={styles.gapTop}
              />
              <Text style={styles.hint}>{allowanceHint}</Text>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Field
                  label="Charge per extra km"
                  kind="decimal"
                  value={rental.extraKmRate}
                  onChangeText={(extraKmRate) => onChange({ extraKmRate })}
                  suffix={rental.currency ? `${rental.currency}/km` : 'per km'}
                  maxLength={8}
                  error={values.extraKmRate === null ? 'Enter a rate (0 if none).' : null}
                  testID="extra-rate"
                  style={styles.flex}
                />
                <Field
                  label="Currency"
                  kind="text"
                  sanitize={sanitizeCurrency}
                  value={rental.currency}
                  onChangeText={(currency) => onChange({ currency })}
                  maxLength={6}
                  testID="currency"
                  style={styles.currency}
                />
              </View>
            </View>

            <Button
              variant="secondary"
              icon="plus-circle"
              title="Start a new rental"
              onPress={() => showDialog('newRental')}
              testID="new-rental"
            />

            <Pressable
              onPress={onOpenDefaults}
              style={styles.defaultsRow}
              accessibilityRole="button"
              accessibilityLabel={`Defaults for new rentals: ${describeDefaults(defaults)}. Edit`}
              testID="edit-defaults"
            >
              <View style={styles.flex}>
                <Text style={styles.defaultsTitle}>Defaults for new rentals</Text>
                <Text style={styles.defaultsText}>{describeDefaults(defaults)}</Text>
              </View>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        key={`start-date-${dialogSession}`}
        visible={openDialog === 'startDate'}
        value={rental.startDate}
        today={today}
        title="Pick-up date"
        onSelect={(startDate) => {
          onChange({ startDate });
          closeDialog();
        }}
        onClose={closeDialog}
      />

      <DatePickerModal
        key={`reading-date-${dialogSession}`}
        visible={openDialog === 'readingDate'}
        value={readingDate}
        today={today}
        minDate={rental.startDate}
        maxDate={today}
        title="Date of the reading"
        onSelect={(date) => {
          setReadingDateChoice(date === today ? null : date);
          setReadingDraft(null);
          setReadingProblem(null);
          closeDialog();
        }}
        onClose={closeDialog}
      />

      <ModalCard visible={openDialog === 'deleteReading'} onClose={closeDialog} testID="delete-dialog">
        <Text style={styles.dialogTitle}>Delete this reading?</Text>
        <Text style={styles.dialogText}>
          {entryToDelete
            ? `${formatDateWithWeekday(entryToDelete.date)}: ${formatKm(
                entryToDelete.km,
              )}. The days around it are recalculated.`
            : ''}
        </Text>
        <View style={styles.dialogButtons}>
          <Button variant="ghost" title="Cancel" onPress={closeDialog} />
          <Button
            title="Delete"
            icon="trash-2"
            onPress={() => {
              if (entryToDelete) onDeleteReading(entryToDelete.date);
              setEntryToDelete(null);
              closeDialog();
            }}
            testID="confirm-delete"
          />
        </View>
      </ModalCard>

      <NewRentalDialog
        key={`new-rental-${dialogSession}`}
        visible={openDialog === 'newRental'}
        defaults={defaults}
        currentKm={values.currentKm}
        onClose={closeDialog}
        onConfirm={(sameCar) => {
          onStartNewRental(sameCar);
          closeDialog();
        }}
      />
    </View>
  );
}

interface TileProps {
  label: string;
  value: string;
  caption?: string;
  tone?: Tone;
  testID: string;
}

function statTiles(s: RentalSummary, startDate: ISODate, today: ISODate): TileProps[] {
  const tiles: TileProps[] = [];

  if (s.phase === null || s.endDate === null || s.totalDays === null) {
    tiles.push({ label: 'Days left', value: '—', caption: 'Set the rental period', testID: 'days-left' });
    tiles.push({ label: 'Return date', value: '—', testID: 'return-date' });
  } else {
    const caption =
      s.phase === 'upcoming'
        ? `Starts ${formatDate(startDate, false)}`
        : s.phase === 'ended'
        ? today === s.endDate
          ? 'Return day'
          : `Ended ${formatDate(s.endDate, false)}`
        : `Day ${(s.daysElapsed ?? 0) + 1} of ${s.totalDays}`;
    tiles.push({
      label: 'Days left',
      value: formatNumber(s.daysLeft ?? 0),
      caption,
      tone: s.phase === 'ended' ? 'warning' : 'neutral',
      testID: 'days-left',
    });
    tiles.push({
      label: 'Return date',
      value: formatDate(s.endDate, false),
      caption: `${s.totalDays} ${plural(s.totalDays, 'day')} in total`,
      testID: 'return-date',
    });
  }

  const needsReading = s.usedKm === null;
  tiles.push(
    s.averageKmPerDay !== null
      ? {
          label: 'Daily average',
          value: `${formatNumber(s.averageKmPerDay)} km`,
          caption: `per day over ${s.loggedDays} ${plural(s.loggedDays ?? 0, 'day')}`,
          testID: 'daily-average',
        }
      : {
          label: 'Daily average',
          value: '—',
          caption: needsReading ? 'Save a reading first' : 'Set the rental period',
          testID: 'daily-average',
        },
  );

  if (s.status === 'over') {
    tiles.push({
      label: 'Daily budget',
      value: '0 km',
      caption: 'Allowance used up',
      tone: 'danger',
      testID: 'daily-budget',
    });
  } else if (s.dailyBudgetKm !== null && s.budgetDays !== null) {
    tiles.push({
      label: 'Daily budget',
      value: `${formatNumber(Math.floor(s.dailyBudgetKm))} km`,
      caption: `per day for the next ${s.budgetDays} ${plural(s.budgetDays, 'day')}`,
      tone: s.status === 'warning' ? 'warning' : 'good',
      testID: 'daily-budget',
    });
  } else {
    tiles.push({
      label: 'Daily budget',
      value: '—',
      caption: needsReading
        ? 'Save a reading first'
        : s.phase === 'ended'
        ? 'Rental period ended'
        : 'All rental days are logged',
      testID: 'daily-budget',
    });
  }

  return tiles;
}

interface Note {
  tone: Tone;
  icon: IconName;
  text: string;
}

export function paceNote(s: RentalSummary, startDate: ISODate, today: ISODate, currency: string): Note | null {
  if (s.endDate === null) return null;
  if (s.phase === 'upcoming') {
    return { tone: 'neutral', icon: 'clock', text: `The rental starts on ${formatDateWithWeekday(startDate)}.` };
  }
  if (s.phase === 'ended') {
    return today === s.endDate
      ? { tone: 'neutral', icon: 'flag', text: `Today is the return date (${formatDateWithWeekday(s.endDate)}).` }
      : {
          tone: 'neutral',
          icon: 'flag',
          text: `This rental ended on ${formatDateWithWeekday(s.endDate)}. Tap "Start a new rental" for your next one.`,
        };
  }
  if (s.averageKmPerDay === null || s.projectedTotalKm === null) return null;

  const pace = `${formatNumber(s.averageKmPerDay)} km/day`;
  const by = formatDate(s.endDate, false);
  if ((s.projectedExtraKm ?? 0) > 0) {
    const cost = s.projectedExtraCost !== null ? ` (about ${formatMoney(s.projectedExtraCost, currency)})` : '';
    const limit = s.limitReachedOn ? ` You would reach the limit around ${formatDate(s.limitReachedOn, false)}.` : '';
    return {
      tone: 'warning',
      icon: 'alert-circle',
      text: `At ${pace} you will drive about ${formatKm(s.projectedTotalKm)} by ${by}, which is ${formatKm(
        s.projectedExtraKm ?? 0,
      )} over the allowance${cost}.${limit}`,
    };
  }
  return {
    tone: 'good',
    icon: 'check-circle',
    text: `On track: at ${pace} you will drive about ${formatKm(s.projectedTotalKm)} of your ${formatKm(
      s.totalAllowanceKm ?? 0,
    )} by ${by}.`,
  };
}

function PaceNote({ tone, icon, text }: Note) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const [background, accent] = {
    neutral: [palette.primarySoft, palette.primary],
    good: [palette.goodSoft, palette.good],
    warning: [palette.warningSoft, palette.warning],
    danger: [palette.dangerSoft, palette.danger],
  }[tone];
  return (
    <View style={[styles.note, { backgroundColor: background }]} testID="pace-note">
      <Icon name={icon} size={20} color={accent} style={styles.noteIcon} />
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

interface NewRentalDialogProps {
  visible: boolean;
  defaults: Defaults;
  currentKm: number | null;
  onClose: () => void;
  onConfirm: (sameCar: boolean) => void;
}

/** Give it a new `key` each time it is opened so the checkbox starts unticked. */
function NewRentalDialog({ visible, defaults, currentKm, onClose, onConfirm }: NewRentalDialogProps) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const [sameCar, setSameCar] = useState(false);

  return (
    <ModalCard visible={visible} onClose={onClose} testID="new-rental-dialog">
      <Text style={styles.dialogTitle}>Start a new rental?</Text>
      <Text style={styles.dialogText}>
        The odometer readings are cleared, the start date becomes today and the contract is reset to your defaults:{' '}
        {describeDefaults(defaults)}.
      </Text>
      {currentKm !== null ? (
        <Pressable
          onPress={() => setSameCar((value) => !value)}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: sameCar }}
          testID="same-car"
        >
          <Icon name={sameCar ? 'check-square' : 'square'} size={22} color={palette.primary} />
          <Text style={styles.checkText}>Same car: start from the current odometer ({formatKm(currentKm)})</Text>
        </Pressable>
      ) : null}
      <View style={styles.dialogButtons}>
        <Button variant="ghost" title="Cancel" onPress={onClose} />
        <Button
          title="Start new rental"
          onPress={() => onConfirm(sameCar && currentKm !== null)}
          testID="confirm-new-rental"
        />
      </View>
    </ModalCard>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: p.background },
    content: { flexGrow: 1, paddingTop: 8 },
    column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logo: { width: 44, height: 44, borderRadius: 12 },
    title: { fontSize: 22, fontWeight: '800', color: p.text },
    subtitle: { fontSize: 13, color: p.textMuted },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    card: {
      padding: 16,
      borderRadius: radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    row: { flexDirection: 'row', gap: 12 },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: radius.card - 2 },
    noteIcon: { marginTop: 1 },
    noteText: { flex: 1, fontSize: 14, lineHeight: 20, color: p.text },
    sectionTitle: {
      marginTop: 8,
      marginBottom: -6,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: p.textMuted,
    },
    fieldLabel: { marginBottom: 6, fontSize: 13, fontWeight: '600', color: p.textMuted },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 50,
      paddingHorizontal: 12,
      borderRadius: radius.field,
      borderWidth: 1.5,
      borderColor: p.border,
      backgroundColor: p.surfaceMuted,
    },
    dateText: { flex: 1, fontSize: 17, color: p.text },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 16, backgroundColor: p.border },
    periodLength: { width: 84 },
    currency: { width: 96 },
    readingActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    dateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: radius.field,
      borderWidth: 1.5,
      borderColor: p.border,
      backgroundColor: p.surfaceMuted,
    },
    dateChipText: { fontSize: 15, fontWeight: '600', color: p.text },
    readingHint: { marginTop: 12, fontSize: 13, lineHeight: 18, color: p.textMuted },
    gapTop: { marginTop: 10 },
    hint: { marginTop: 6, fontSize: 12, color: p.textMuted },
    hintError: { fontWeight: '600', color: p.danger },
    defaultsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: radius.card - 2,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: p.border,
    },
    defaultsTitle: { fontSize: 13, fontWeight: '700', color: p.text },
    defaultsText: { marginTop: 2, fontSize: 13, color: p.textMuted },
    link: { fontSize: 15, fontWeight: '700', color: p.primary },
    dialogTitle: { fontSize: 20, fontWeight: '800', color: p.text },
    dialogText: { marginTop: 8, fontSize: 15, lineHeight: 22, color: p.textMuted },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
      padding: 12,
      borderRadius: radius.field,
      backgroundColor: p.surfaceMuted,
    },
    checkText: { flex: 1, fontSize: 15, color: p.text },
    dialogButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 20 },
  });
