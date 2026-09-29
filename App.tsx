import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
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

  // Matches the window background (visible behind the keyboard and during transitions) to the theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.background).catch(() => {});
  }, [palette.background]);

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
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <StatusBar style={palette.scheme === 'dark' ? 'light' : 'dark'} />
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
