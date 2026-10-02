const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: ['dist/*', 'supabase/functions/*', 'src/data/db/migrations/*'],
  },
  {
    // Die Fachlogik bleibt reines TypeScript: testbar ohne Gerät, wiederverwendbar.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react/*'],
              message: 'Fachlogik darf React nicht importieren.',
            },
            {
              group: ['expo', 'expo-*', '@expo/*'],
              message: 'Fachlogik darf Expo nicht importieren.',
            },
            {
              group: ['@/data/*', '@/services/*', '@/ui/*', '@/hooks/*', '@/app/*'],
              message: 'Fachlogik darf nur aus src/domain importieren.',
            },
          ],
        },
      ],
    },
  },
]);
