/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The real provider waits for insets from the native side before rendering its children.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
