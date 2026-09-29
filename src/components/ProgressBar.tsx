import { StyleSheet, View } from 'react-native';

interface Props {
  /** 0 to 1; values outside the range are clamped. */
  fraction: number;
  color: string;
  trackColor: string;
  height?: number;
}

export function ProgressBar({ fraction, color, trackColor, height = 10 }: Props) {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const rounded = { height, borderRadius: height / 2 };
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, rounded, { backgroundColor: trackColor }]}
    >
      <View style={[rounded, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
});
