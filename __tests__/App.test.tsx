import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import App from '../App';
import { STORAGE_KEY } from '../src/state/storage';

async function renderApp() {
  await render(<App />);
  // Wait for the saved data to load.
  return screen.findByTestId('start-km');
}

async function saveReading(km: string) {
  await fireEvent.changeText(screen.getByTestId('reading-km'), km);
  await fireEvent.press(screen.getByTestId('save-reading'));
}

async function pickDate(opener: string, label: string) {
  await fireEvent.press(screen.getByTestId(opener));
  await fireEvent.press(screen.getByLabelText(label));
}

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 16, 20, 0)); // Wed, Sep 16, 2026, in the evening
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

it('shows the km left once a reading is saved', async () => {
  await renderApp();

  await fireEvent.changeText(screen.getByTestId('start-km'), '45000');
  expect(screen.getByText('Odometer limit')).toBeOnTheScreen();
  expect(screen.getByTestId('result-value')).toHaveTextContent('47,500 km');

  await saveReading('46,200');
  expect(screen.getByTestId('reading-km')).toHaveDisplayValue('46200');
  expect(screen.getByText('KM remaining')).toBeOnTheScreen();
  expect(screen.getByTestId('result-value')).toHaveTextContent('1,300 km');
  expect(screen.getByText('1,200 of 2,500 km used')).toBeOnTheScreen();
  expect(screen.getByTestId('save-reading')).toHaveTextContent('Update reading');
});

it('shows the extra km and the extra charge above the allowance', async () => {
  await renderApp();
  await fireEvent.changeText(screen.getByTestId('start-km'), '45000');
  await saveReading('47800');

  expect(screen.getByText('Over the limit')).toBeOnTheScreen();
  expect(screen.getByTestId('result-value')).toHaveTextContent('+300 km');
  expect(screen.getByTestId('extra-charge')).toHaveTextContent('150.00 AED');

  await fireEvent.changeText(screen.getByTestId('extra-rate'), '0,75');
  expect(screen.getByTestId('extra-charge')).toHaveTextContent('225.00 AED');
});

it('refuses a reading below the start odometer', async () => {
  await renderApp();
  await fireEvent.changeText(screen.getByTestId('start-km'), '45000');
  await saveReading('44000');

  expect(screen.getByText('Lower than the start odometer (45,000 km).')).toBeOnTheScreen();
  expect(screen.getByText('Odometer limit')).toBeOnTheScreen();
});

it("compares today's km with the daily allowance", async () => {
  await renderApp();
  await fireEvent.changeText(screen.getByTestId('start-km'), '45000');
  // Picked up today: 2,500 km over 30 days = 83.3 km per day.
  await saveReading('45120');

  const result = screen.getByTestId('day-result');
  expect(result).toHaveTextContent(/Today/);
  expect(result).toHaveTextContent(/\+37 km \(\+44%\) over the daily allowance/);
  expect(result).toHaveTextContent(/120 km driven · allowance 83\.3 km\/day/);
});

it('keeps a daily log with the days over and under the allowance', async () => {
  await renderApp();
  await fireEvent.changeText(screen.getByTestId('start-km'), '45000');
  await pickDate('start-date', 'Sep 1, 2026');

  // Today (Sep 16) after skipping two weeks: 1,200 km spread over 16 days = 75 km/day.
  await saveReading('46200');
  expect(screen.getByTestId('day-result')).toHaveTextContent(/Sep 1 – Sep 16 \(16 days\)/);
  expect(screen.getByTestId('day-result')).toHaveTextContent(/−133 km \(−10%\) under the daily allowance/);

  // Fill in a missed day: Sep 10 at 46,000 km, i.e. 100 km/day until then and 33 km/day after.
  await pickDate('reading-date', 'Sep 10, 2026');
  expect(screen.getByText('Reading of Sep 10')).toBeOnTheScreen();
  await saveReading('46000');

  const over = within(screen.getByTestId('stats-over'));
  expect(over.getByText('10 days')).toBeOnTheScreen();
  expect(over.getByText('63% of the days')).toBeOnTheScreen();
  expect(over.getByText('+167 km')).toBeOnTheScreen();
  expect(over.getByText('+20% vs allowance')).toBeOnTheScreen();

  const under = within(screen.getByTestId('stats-under'));
  expect(under.getByText('6 days')).toBeOnTheScreen();
  expect(under.getByText('38% of the days')).toBeOnTheScreen();
  expect(under.getByText('−300 km')).toBeOnTheScreen();
  expect(under.getByText('−60% vs allowance')).toBeOnTheScreen();

  expect(screen.getByTestId('stats-net')).toHaveTextContent(/16 days logged/);
  expect(screen.getByTestId('stats-net')).toHaveTextContent(/−133 km \(−10%\)/);

  expect(screen.getByTestId('history-2026-09-10')).toHaveTextContent(/\+1,000 km in 10 days/);
  expect(screen.getByTestId('history-2026-09-10')).toHaveTextContent(/\+20%/);
  expect(screen.getByTestId('history-2026-09-16')).toHaveTextContent(/\+200 km in 6 days/);
  expect(screen.getByTestId('history-2026-09-16')).toHaveTextContent(/−60%/);

  // Deleting a reading recalculates the days around it.
  await fireEvent.press(screen.getByTestId('delete-2026-09-10'));
  await fireEvent.press(screen.getByTestId('confirm-delete'));
  expect(screen.queryByTestId('history-2026-09-10')).toBeNull();
  expect(within(screen.getByTestId('stats-under')).getByText('16 days')).toBeOnTheScreen();
});

it('multiplies a per-month allowance by the rental length', async () => {
  await renderApp();
  await fireEvent.changeText(screen.getByTestId('period-length'), '3');
  await fireEvent.press(screen.getByRole('radio', { name: 'Per month' }));

  expect(screen.getByText('2,500 km × 3 months = 7,500 km in total.')).toBeOnTheScreen();
  expect(screen.getByTestId('result-value')).toHaveTextContent('7,500 km');
});

it('remembers everything after a restart', async () => {
  const { unmount } = await render(<App />);
  await screen.findByTestId('start-km');
  await fireEvent.changeText(screen.getByTestId('start-km'), '45000');
  await saveReading('46200');
  await fireEvent.changeText(screen.getByTestId('allowance-km'), '3000');

  const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
  expect(saved.rental).toMatchObject({
    startKm: '45000',
    allowanceKm: '3000',
    readings: [{ date: '2026-09-16', km: 46200 }],
  });

  await unmount();
  await renderApp();
  expect(screen.getByTestId('reading-km')).toHaveDisplayValue('46200');
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

it('starts a new rental for the same car from the latest reading', async () => {
  await renderApp();
  await fireEvent.changeText(screen.getByTestId('start-km'), '45000');
  await saveReading('47800');

  await fireEvent.press(screen.getByTestId('new-rental'));
  await fireEvent.press(screen.getByTestId('same-car'));
  await fireEvent.press(screen.getByTestId('confirm-new-rental'));

  expect(screen.getByTestId('start-km')).toHaveDisplayValue('47800');
  expect(screen.getByTestId('reading-km')).toHaveDisplayValue('');
  expect(screen.queryByTestId('history')).toBeNull();
  expect(screen.getByTestId('result-value')).toHaveTextContent('50,300 km');
});

it('starts a new rental for another car with empty readings', async () => {
  await renderApp();
  await fireEvent.changeText(screen.getByTestId('start-km'), '45000');
  await saveReading('46200');

  await fireEvent.press(screen.getByTestId('new-rental'));
  await fireEvent.press(screen.getByTestId('confirm-new-rental'));

  expect(screen.getByTestId('start-km')).toHaveDisplayValue('');
  expect(screen.getByText('Included in your rental')).toBeOnTheScreen();
});
