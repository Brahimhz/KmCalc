import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { sanitizeDecimal, sanitizeInteger } from '../logic/numbers';
import { radius, usePalette, useThemedStyles, webNoOutline, type Palette } from '../ui/theme';

export type FieldKind = 'integer' | 'decimal' | 'text';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  /** `integer` and `decimal` fields drop anything that is not part of a number. */
  kind?: FieldKind;
  /** Extra clean-up applied to the typed text, e.g. upper-casing a currency code. */
  sanitize?: (text: string) => string;
  /** Unit shown inside the field after the value, e.g. "km". */
  suffix?: string;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  size?: 'regular' | 'large';
  selectTextOnFocus?: boolean;
  maxLength?: number;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const INPUT_MODES = { integer: 'numeric', decimal: 'decimal', text: 'text' } as const;

export function Field({
  label,
  value,
  onChangeText,
  kind = 'integer',
  sanitize,
  suffix,
  placeholder,
  hint,
  error,
  size = 'regular',
  selectTextOnFocus,
  maxLength,
  accessibilityLabel,
  testID,
  style,
}: Props) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const cleaned = kind === 'integer' ? sanitizeInteger(text) : kind === 'decimal' ? sanitizeDecimal(text) : text;
    onChangeText(sanitize ? sanitize(cleaned) : cleaned);
  };

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}>
        <TextInput
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode={INPUT_MODES[kind]}
          placeholder={placeholder}
          placeholderTextColor={palette.placeholder}
          selectTextOnFocus={selectTextOnFocus}
          maxLength={maxLength}
          autoCorrect={false}
          autoCapitalize={kind === 'text' ? 'characters' : 'none'}
          returnKeyType="done"
          accessibilityLabel={accessibilityLabel ?? label}
          testID={testID}
          style={[styles.input, size === 'large' && styles.inputLarge]}
        />
        {suffix ? (
          <Text style={styles.suffix} numberOfLines={1}>
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    label: { fontSize: 13, fontWeight: '600', color: p.textMuted, marginBottom: 6 },
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 50,
      paddingHorizontal: 12,
      borderRadius: radius.field,
      borderWidth: 1.5,
      borderColor: p.border,
      backgroundColor: p.surfaceMuted,
    },
    boxFocused: { borderColor: p.primary },
    boxError: { borderColor: p.danger },
    input: {
      flex: 1,
      minWidth: 0,
      paddingVertical: 10,
      fontSize: 17,
      color: p.text,
      fontVariant: ['tabular-nums'],
      ...webNoOutline,
    },
    inputLarge: { fontSize: 24, fontWeight: '700', paddingVertical: 12 },
    suffix: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: p.textMuted },
    hint: { marginTop: 6, fontSize: 12, color: p.textMuted },
    error: { marginTop: 6, fontSize: 12, fontWeight: '600', color: p.danger },
  });
