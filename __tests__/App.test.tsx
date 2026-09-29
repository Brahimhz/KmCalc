import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { STORAGE_KEY } from '../src/state/storage';

async function renderApp() {
  await render(<App />);
  // Wait for the saved data to load.
  return screen.findByTestId('start-km');
}

async function enterReadings(start: string, current: string) {
  await fireEvent.changeText(screen.getByTestId('start-km'), start);
  await fireEvent.changeText(screen.getByTestId('current-km'), current);
}

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 16, 10, 0)); // Wed, Sep 16, 2026
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

it('starts with the default values: 2,500 km for 1 month at 0.5 AED per extra km', async () => {
  await renderApp();

  expect(screen.getByText('Included in your rental')).toBeOnTheScreen();
  expect(screen.getByTestId('result-value')).toHaveTextContent('2,500 km');
  expect(screen.getByTestId('allowance-km')).toHaveDisplayValue('2500');
  expect(screen.getByTestId('period-length')).toHaveDisplayValue('1');
  expect(screen.getByTestId('extra-rate')).toHaveDisplayValue('0.5');
  expect(screen.getByTestId('currency')).toHaveDisplayValue('AED');
  expect(screen.getByText('Return on Fri, Oct 16, 2026 · 30 days')).toBeOnTheScreen();
});

it('shows the km left from the start and current odometer readings', async () => {
  await renderApp();

  await fireEvent.changeText(screen.getByTestId('start-km'), '45000');
  expect(screen.getByText('Odometer limit')).toBeOnTheScreen();
  expect(screen.getByTestId('result-value')).toHaveTextContent('47,500 km');

  await fireEvent.changeText(screen.getByTestId('current-km'), '46,200');
  expect(screen.getByTestId('current-km')).toHaveDisplayValue('46200');
  expect(screen.getByText('KM remaining')).toBeOnTheScreen();
  expect(screen.getByTestId('result-value')).toHaveTextContent('1,300 km');
  expect(screen.getByText('1,200 of 2,500 km used')).toBeOnTheScreen();
  expect(screen.getByText('The limit is reached at 47,500 km on the odometer.')).toBeOnTheScreen();
});

it('shows the extra km and the extra charge above the allowance', async () => {
  await renderApp();
  await enterReadings('45000', '47800');

  expect(screen.getByText('Over the limit')).toBeOnTheScreen();
  expect(screen.getByTestId('result-value')).toHaveTextContent('+300 km');
  expect(screen.getByTestId('extra-charge')).toHaveTextContent('150.00 AED');

  await fireEvent.changeText(screen.getByTestId('extra-rate'), '0,75');
  expect(screen.getByTestId('extra-charge')).toHaveTextContent('225.00 AED');
});

it('flags a current reading below the start reading', async () => {
  await renderApp();
  await enterReadings('45000', '44000');

  expect(screen.getByText('Check the readings')).toBeOnTheScreen();
  expect(screen.getByText('Lower than the start')).toBeOnTheScreen();
});

it('multiplies a per-month allowance by the rental length', async () => {
  await renderApp();
  await fireEvent.changeText(screen.getByTestId('period-length'), '3');
  await fireEvent.press(screen.getByRole('radio', { name: 'Per month' }));

  expect(screen.getByText('2,500 km × 3 months = 7,500 km in total.')).toBeOnTheScreen();
  expect(screen.getByTestId('result-value')).toHaveTextContent('7,500 km');
});

it('uses the start date for the days left and the pace', async () => {
  await renderApp();
  await enterReadings('45000', '46200');

  await fireEvent.press(screen.getByTestId('start-date'));
  await fireEvent.press(screen.getByLabelText('Sep 1, 2026'));

  expect(screen.getByText('Tue, Sep 1, 2026')).toBeOnTheScreen();
  expect(screen.getByTestId('days-left')).toHaveTextContent(/15.*Day 16 of 30/);
  expect(screen.getByTestId('daily-average')).toHaveTextContent(/80 km/);
  expect(screen.getByTestId('pace-note')).toHaveTextContent(/On track: at 80 km\/day you will drive about 2,400 km/);
});

it('remembers everything after a restart', async () => {
  const { unmount } = await render(<App />);
  await screen.findByTestId('start-km');
  await enterReadings('45000', '46200');
  await fireEvent.changeText(screen.getByTestId('allowance-km'), '3000');

  const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
  expect(saved.rental).toMatchObject({ startKm: '45000', currentKm: '46200', allowanceKm: '3000' });

  await unmount();
  await renderApp();
  expect(screen.getByTestId('current-km')).toHaveDisplayValue('46200');
  expect(screen.getByTestId('result-value')).toHaveTextContent('1,800 km');
});

it('lets the user change the default values', async () => {
  await renderApp();
  await fireEvent.press(screen.getByTestId('open-defaults'));
  expect(screen.getByText('Default values')).toBeOnTheScreen();

  await fireEvent.changeText(screen.getByTestId('default-allowance'), '3000');
  await fireEvent.changeText(screen.getByTestId('default-rate'), '0.75');
  await fireEvent.press(screen.getByTestId('save-defaults'));

  // Back on the calculator, applied to the current rental as well.
  expect(screen.getByTestId('allowance-km')).toHaveDisplayValue('3000');
  expect(screen.getByTestId('extra-rate')).toHaveDisplayValue('0.75');
  expect(screen.getByText('3,000 km · 1 month · 0.75 AED/km')).toBeOnTheScreen();
});

it('does not save invalid default values', async () => {
  await renderApp();
  await fireEvent.press(screen.getByTestId('open-defaults'));
  await fireEvent.changeText(screen.getByTestId('default-allowance'), '');
  await fireEvent.press(screen.getByTestId('save-defaults'));

  expect(screen.getByText('Enter a distance above 0.')).toBeOnTheScreen();
  expect(screen.getByText('Default values')).toBeOnTheScreen();
});

it('restores the original default values', async () => {
  await renderApp();
  await fireEvent.press(screen.getByTestId('open-defaults'));
  await fireEvent.changeText(screen.getByTestId('default-allowance'), '4000');
  await fireEvent.press(screen.getByTestId('restore-defaults'));

  expect(screen.getByTestId('default-allowance')).toHaveDisplayValue('2500');
});

it('starts a new rental for the same car from the current odometer', async () => {
  await renderApp();
  await enterReadings('45000', '47800');

  await fireEvent.press(screen.getByTestId('new-rental'));
  await fireEvent.press(screen.getByTestId('same-car'));
  await fireEvent.press(screen.getByTestId('confirm-new-rental'));

  expect(screen.getByTestId('start-km')).toHaveDisplayValue('47800');
  expect(screen.getByTestId('current-km')).toHaveDisplayValue('47800');
  expect(screen.getByTestId('result-value')).toHaveTextContent('2,500 km');
});

it('starts a new rental for another car with empty readings', async () => {
  await renderApp();
  await enterReadings('45000', '46200');

  await fireEvent.press(screen.getByTestId('new-rental'));
  await fireEvent.press(screen.getByTestId('confirm-new-rental'));

  expect(screen.getByTestId('start-km')).toHaveDisplayValue('');
  expect(screen.getByText('Included in your rental')).toBeOnTheScreen();
});
