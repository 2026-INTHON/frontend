// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Existing React Native text uses literal quotes; they render as intended.
      'react/no-unescaped-entities': 'off',
      // Animated.Value refs are consumed by RN animated styles. Keep the new check visible.
      'react-hooks/refs': 'warn',
    },
  },
]);
