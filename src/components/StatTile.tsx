import { StyleSheet, Text, View } from 'react-native';

import { radius, usePalette, useThemedStyles, type Palette } from '../ui/theme';

export type Tone = 'neutral' | 'good' | 'warning' | 'danger';

interface Props {
  label: string;
  value: string;
  caption?: string;
  tone?: Tone;
  testID?: string;
}

export function StatTile({ label, value, caption, tone = 'neutral', testID }: Props) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const valueColor = { neutral: palette.text, good: palette.good, warning: palette.warning, danger: palette.danger }[
    tone
  ];
  return (
    <View style={styles.tile} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {caption ? (
        <Text style={styles.caption} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    tile: {
      flexGrow: 1,
      flexBasis: '40%',
      padding: 14,
      borderRadius: radius.card - 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: p.textMuted },
    value: { marginTop: 6, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
    caption: { marginTop: 2, fontSize: 12, color: p.textMuted },
  });
