module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Also compile react-native-* and @react-native-* libraries (the preset only covers react-native itself).
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native(-[a-z-]+)?|@react-native(-[a-z-]+)?)/)'],
  // On a cold cache (e.g. in CI) the first UI test also pays for compiling React Native.
  testTimeout: 30000,
};
