import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { SegmentedControl } from '../components/SegmentedControl';
import { parseNumber } from '../logic/numbers';
import { contractFromDefaults, FACTORY_DEFAULTS, sanitizeCurrency, type ContractFields, type Defaults } from '../state/rental';
import { allowanceModeOptions, describeDefaults, PERIOD_OPTIONS } from '../ui/labels';
import { radius, usePalette, useThemedStyles, type Palette } from '../ui/theme';

/** White in both themes so the thumb stands out on the light and the dark track. */
const SWITCH_THUMB = '#FFFFFF';

interface Props {
  defaults: Defaults;
  onSave: (defaults: Defaults, applyToCurrentRental: boolean) => void;
  onClose: () => void;
}

export function validateDefaults(form: ContractFields) {
  const allowanceKm = parseNumber(form.allowanceKm);
  const periodLength = parseNumber(form.periodLength);
  const extraKmRate = parseNumber(form.extraKmRate);
  const errors = {
    allowanceKm: allowanceKm === null || allowanceKm <= 0 ? 'Enter a distance above 0.' : null,
    periodLength: periodLength === null || periodLength < 1 ? 'At least 1.' : null,
    extraKmRate: extraKmRate === null ? 'Enter a rate (0 if there is no charge).' : null,
  };
  const defaults: Defaults | null =
    allowanceKm !== null && allowanceKm > 0 && periodLength !== null && periodLength >= 1 && extraKmRate !== null
      ? {
          allowanceKm,
          allowanceMode: form.allowanceMode,
          periodLength: Math.floor(periodLength),
          periodUnit: form.periodUnit,
          extraKmRate,
          currency: form.currency,
        }
      : null;
  return { errors, defaults };
}

export function DefaultsScreen({ defaults, onSave, onClose }: Props) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<ContractFields>(() => contractFromDefaults(defaults));
  const [applyToCurrent, setApplyToCurrent] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const { errors, defaults: parsed } = validateDefaults(form);

  const update = (changes: Partial<ContractFields>) => setForm((current) => ({ ...current, ...changes }));

  // Android back button returns to the calculator.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  const save = () => {
    if (parsed) onSave(parsed, applyToCurrent);
    else setShowErrors(true);
  };

  const restoreOriginal = () => {
    setForm(contractFromDefaults(FACTORY_DEFAULTS));
    setShowErrors(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={[styles.topBar, { paddingLeft: insets.left + 8, paddingRight: insets.right + 8 }]}>
        <Pressable
          onPress={onClose}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          testID="defaults-back"
        >
          <Feather name="arrow-left" size={24} color={palette.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          Default values
        </Text>
      </View>

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
            <Text style={styles.intro}>These values fill in the contract whenever you start a new rental.</Text>

            <View style={styles.card}>
              <Field
                label="KM allowance"
                value={form.allowanceKm}
                onChangeText={(allowanceKm) => update({ allowanceKm })}
                suffix="km"
                maxLength={7}
                error={showErrors ? errors.allowanceKm : null}
                testID="default-allowance"
              />
              <Text style={[styles.fieldLabel, styles.gapTop]}>The allowance is for</Text>
              <SegmentedControl
                options={allowanceModeOptions(form.periodUnit)}
                value={form.allowanceMode}
                onChange={(allowanceMode) => update({ allowanceMode })}
                accessibilityLabel="The allowance is for"
              />

              <View style={styles.divider} />

              <Text style={styles.fieldLabel}>Rental period</Text>
              <View style={styles.row}>
                <Field
                  value={form.periodLength}
                  onChangeText={(periodLength) => update({ periodLength })}
                  maxLength={3}
                  error={showErrors ? errors.periodLength : null}
                  accessibilityLabel="Default rental period length"
                  testID="default-period"
                  style={styles.periodLength}
                />
                <SegmentedControl
                  options={PERIOD_OPTIONS}
                  value={form.periodUnit}
                  onChange={(periodUnit) => update({ periodUnit })}
                  accessibilityLabel="Default rental period unit"
                  style={styles.flex}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Field
                  label="Charge per extra km"
                  kind="decimal"
                  value={form.extraKmRate}
                  onChangeText={(extraKmRate) => update({ extraKmRate })}
                  suffix={form.currency ? `${form.currency}/km` : 'per km'}
                  maxLength={8}
                  error={showErrors ? errors.extraKmRate : null}
                  testID="default-rate"
                  style={styles.flex}
                />
                <Field
                  label="Currency"
                  kind="text"
                  sanitize={sanitizeCurrency}
                  value={form.currency}
                  onChangeText={(currency) => update({ currency })}
                  maxLength={6}
                  testID="default-currency"
                  style={styles.currency}
                />
              </View>
            </View>

            <View style={[styles.card, styles.switchRow]}>
              <View style={styles.flex}>
                <Text style={styles.switchTitle}>Apply to the current rental</Text>
                <Text style={styles.switchText}>
                  Also update the contract of the rental you are tracking now. Odometer readings and the start date stay as
                  they are.
                </Text>
              </View>
              <Switch
                value={applyToCurrent}
                onValueChange={setApplyToCurrent}
                trackColor={{ false: palette.border, true: palette.primary }}
                thumbColor={Platform.OS === 'ios' ? undefined : SWITCH_THUMB}
                // react-native-web colors the "on" thumb separately.
                {...(Platform.OS === 'web' ? { activeThumbColor: SWITCH_THUMB } : null)}
                accessibilityLabel="Apply to the current rental"
                testID="apply-to-current"
              />
            </View>

            <Button title="Save defaults" icon="save" onPress={save} testID="save-defaults" />
            <Button variant="ghost" title="Restore original values" icon="rotate-ccw" onPress={restoreOriginal} testID="restore-defaults" />
            <Text style={styles.footnote}>Original values: {describeDefaults(FACTORY_DEFAULTS)}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: p.background },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '800', color: p.text },
    content: { flexGrow: 1, paddingTop: 4 },
    column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 16 },
    intro: { fontSize: 15, lineHeight: 22, color: p.textMuted },
    card: {
      padding: 16,
      borderRadius: radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    row: { flexDirection: 'row', gap: 12 },
    fieldLabel: { marginBottom: 6, fontSize: 13, fontWeight: '600', color: p.textMuted },
    gapTop: { marginTop: 14 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 16, backgroundColor: p.border },
    periodLength: { width: 84 },
    currency: { width: 96 },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    switchTitle: { fontSize: 15, fontWeight: '700', color: p.text },
    switchText: { marginTop: 4, fontSize: 13, lineHeight: 18, color: p.textMuted },
    footnote: { fontSize: 12, textAlign: 'center', color: p.textMuted },
  });
