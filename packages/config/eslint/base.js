// Flat config (ESLint 9) compartilhada. Cada pacote cria um eslint.config.mjs
// que reexporta este array; o web tem o próprio, combinando com o preset do Next.
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'build/**', '.next/**', 'node_modules/**', '.turbo/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
