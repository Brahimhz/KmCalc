import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { radius, useThemedStyles, type Palette } from '../ui/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

/** A centered card over a dimmed backdrop. Tapping the backdrop or pressing Back closes it. */
export function ModalCard({ visible, onClose, children, testID }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={styles.card} testID={testID}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: p.overlay },
    card: {
      width: '100%',
      maxWidth: 380,
      padding: 20,
      borderRadius: radius.card + 4,
      backgroundColor: p.surface,
    },
  });
