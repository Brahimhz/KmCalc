import { useCallback, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CalculatorScreen } from './src/screens/CalculatorScreen';
import { DefaultsScreen } from './src/screens/DefaultsScreen';
import type { Defaults } from './src/state/rental';
import { useAppData, useToday } from './src/state/useAppData';
import { usePalette } from './src/ui/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const palette = usePalette();
  const today = useToday();
  const { data, updateRental, saveDefaults, startNewRental } = useAppData();
  const [screen, setScreen] = useState<'calculator' | 'defaults'>('calculator');

  const openDefaults = useCallback(() => setScreen('defaults'), []);
  const closeDefaults = useCallback(() => setScreen('calculator'), []);
  const handleSaveDefaults = useCallback(
    (defaults: Defaults, applyToCurrentRental: boolean) => {
      saveDefaults(defaults, applyToCurrentRental);
      setScreen('calculator');
    },
    [saveDefaults],
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <StatusBar barStyle={palette.scheme === 'dark' ? 'light-content' : 'dark-content'} />
      {data === null ? null : screen === 'calculator' ? (
        <CalculatorScreen
          rental={data.rental}
          defaults={data.defaults}
          today={today}
          onChange={updateRental}
          onStartNewRental={startNewRental}
          onOpenDefaults={openDefaults}
        />
      ) : (
        <DefaultsScreen defaults={data.defaults} onSave={handleSaveDefaults} onClose={closeDefaults} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
