const { FlatCompat } = require('@eslint/eslintrc');
const path = require('node:path');

const compat = new FlatCompat({
  baseDirectory: path.resolve()
});

module.exports = [
  // Ignorar carpetas generadas y configs JS
  {
    ignores: [
      'node_modules',
      '.next',
      'dist',
      // ignora configs y scripts JS/MJS/CJS para que no los intente tipar
      'eslint.config.*',
      'next.config.*',
      'postcss.config.*',
      'tailwind.config.*'
    ]
  },

  // Reglas de Next (equivalente a "extends: ['next/core-web-vitals']")
  ...compat.config({
    extends: ['next/core-web-vitals']
  }),

  // Regla: aplica TypeScript parser SOLO a archivos TS/TSX
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: path.resolve()
      }
    }
  }
];
