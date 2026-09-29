import { View } from 'react-native';

interface Props {
  /** 0 to 1; values outside the range are clamped. */
  fraction: number;
  color: string;
  trackColor: string;
  height?: number;
}

export function ProgressBar({ fraction, color, trackColor, height = 10 }: Props) {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: trackColor, overflow: 'hidden' }}
    >
      <View style={{ width: `${clamped * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}
