import { Image, type ImageStyle, type StyleProp } from 'react-native';

// Feather icons (https://feathericons.com, MIT license) rendered to white PNGs by
// scripts/generate-ui-icons.js; `tintColor` gives them their color.
const ICONS = {
  'alert-circle': require('../assets/icons/alert-circle.png'),
  'arrow-left': require('../assets/icons/arrow-left.png'),
  calendar: require('../assets/icons/calendar.png'),
  'check-circle': require('../assets/icons/check-circle.png'),
  'check-square': require('../assets/icons/check-square.png'),
  'chevron-down': require('../assets/icons/chevron-down.png'),
  'chevron-left': require('../assets/icons/chevron-left.png'),
  'chevron-right': require('../assets/icons/chevron-right.png'),
  clock: require('../assets/icons/clock.png'),
  flag: require('../assets/icons/flag.png'),
  'plus-circle': require('../assets/icons/plus-circle.png'),
  'rotate-ccw': require('../assets/icons/rotate-ccw.png'),
  save: require('../assets/icons/save.png'),
  sliders: require('../assets/icons/sliders.png'),
  square: require('../assets/icons/square.png'),
};

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  color: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/** A decorative icon: screen readers skip it, so give the surrounding control a label. */
export function Icon({ name, color, size = 20, style }: Props) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size, tintColor: color }, style]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
