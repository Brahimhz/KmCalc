module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['android/', 'ios/', 'coverage/', 'vendor/'],
  overrides: [
    {
      // Node scripts and config files.
      files: ['scripts/**/*.js', '*.config.js', '.*rc.js', 'jest.setup.js'],
      env: { node: true },
    },
  ],
};
