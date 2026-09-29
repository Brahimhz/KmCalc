import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, useThemedStyles, type Palette } from '../ui/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, testID, style }: Props<T>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.track, style]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      minHeight: 50,
      padding: 3,
      borderRadius: radius.field,
      borderWidth: 1.5,
      borderColor: p.border,
      backgroundColor: p.surfaceMuted,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      borderRadius: radius.field - 3,
    },
    segmentSelected: { backgroundColor: p.primary },
    label: { fontSize: 14, fontWeight: '600', color: p.textMuted },
    labelSelected: { color: p.onPrimary },
  });
