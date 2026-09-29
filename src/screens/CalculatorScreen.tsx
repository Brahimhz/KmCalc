import { useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { DatePickerModal } from '../components/DatePickerModal';
import { Field } from '../components/Field';
import { Icon, type IconName } from '../components/Icon';
import { ModalCard } from '../components/ModalCard';
import { ResultCard } from '../components/ResultCard';
import { SegmentedControl } from '../components/SegmentedControl';
import { StatTile, type Tone } from '../components/StatTile';
import { summarizeRental, type RentalSummary } from '../logic/calc';
import { formatDate, formatDateWithWeekday, type ISODate } from '../logic/dates';
import { formatKm, formatMoney, formatNumber, plural } from '../logic/numbers';
import { rentalValues, sanitizeCurrency, type Defaults, type RentalForm } from '../state/rental';
import { allowanceModeOptions, describeDefaults, describePeriod, PERIOD_OPTIONS, UNIT_WORDS } from '../ui/labels';
import { radius, usePalette, useThemedStyles, type Palette } from '../ui/theme';

interface Props {
  rental: RentalForm;
  defaults: Defaults;
  today: ISODate;
  onChange: (changes: Partial<RentalForm>) => void;
  onStartNewRental: (sameCar: boolean) => void;
  onOpenDefaults: () => void;
}

export function CalculatorScreen({ rental, defaults, today, onChange, onStartNewRental, onOpenDefaults }: Props) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [openDialog, setOpenDialog] = useState<'date' | 'newRental' | null>(null);
  // Changes every time a dialog opens so it is re-created with fresh state.
  const [dialogSession, setDialogSession] = useState(0);

  const showDialog = (dialog: 'date' | 'newRental') => {
    setDialogSession((session) => session + 1);
    setOpenDialog(dialog);
  };
  const closeDialog = () => setOpenDialog(null);

  const values = useMemo(() => rentalValues(rental), [rental]);
  const summary = useMemo(() => summarizeRental(values, today), [values, today]);
  const note = paceNote(summary, rental.startDate, today, rental.currency);

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
                  label="Current odometer"
                  hint="Today"
                  value={rental.currentKm}
                  onChangeText={(currentKm) => onChange({ currentKm })}
                  suffix="km"
                  placeholder="000000"
                  size="large"
                  maxLength={7}
                  selectTextOnFocus
                  error={summary.status === 'invalidReadings' ? 'Lower than the start' : null}
                  testID="current-km"
                  style={styles.flex}
                />
              </View>
            </View>

            <View style={styles.tiles}>
              {statTiles(summary, rental.startDate, today).map((tile) => (
                <StatTile key={tile.testID} {...tile} />
              ))}
            </View>

            {note ? <PaceNote {...note} /> : null}

            <Text style={styles.sectionTitle}>Rental contract</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Start date</Text>
              <Pressable
                onPress={() => showDialog('date')}
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
        key={`date-${dialogSession}`}
        visible={openDialog === 'date'}
        value={rental.startDate}
        today={today}
        onSelect={(startDate) => {
          onChange({ startDate });
          closeDialog();
        }}
        onClose={closeDialog}
      />

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

  const needsReadings = s.usedKm === null;
  tiles.push(
    s.averageKmPerDay !== null
      ? {
          label: 'Daily average',
          value: `${formatNumber(s.averageKmPerDay)} km`,
          caption: 'per day so far',
          testID: 'daily-average',
        }
      : {
          label: 'Daily average',
          value: '—',
          caption: needsReadings ? 'Needs both odometer readings' : 'Available from day 2',
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
  } else if (s.dailyBudgetKm !== null) {
    tiles.push({
      label: 'Daily budget',
      value: `${formatNumber(Math.floor(s.dailyBudgetKm))} km`,
      caption: 'per day to stay in the limit',
      tone: s.status === 'warning' ? 'warning' : 'good',
      testID: 'daily-budget',
    });
  } else {
    tiles.push({
      label: 'Daily budget',
      value: '—',
      caption: s.phase === 'ended' ? 'Rental period ended' : 'Needs both odometer readings',
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
