import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { radius, usePalette, useThemedStyles, type Palette } from '../ui/theme';
import { Icon, type IconName } from './Icon';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', icon, testID, style }: Props) {
  const palette = usePalette();
  const styles = useThemedStyles(makeStyles);
  const textColor = variant === 'primary' ? palette.onPrimary : palette.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, style]}
    >
      {icon ? <Icon name={icon} size={19} color={textColor} /> : null}
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      paddingHorizontal: 18,
      borderRadius: radius.field,
    },
    primary: { backgroundColor: p.primary },
    secondary: { backgroundColor: p.primarySoft },
    ghost: { backgroundColor: 'transparent' },
    pressed: { opacity: 0.75 },
    title: { fontSize: 16, fontWeight: '700' },
  });
