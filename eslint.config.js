import globals from 'globals';
import js from '@eslint/js';
export default [
  { ignores: ['node_modules/**', 'dist/**', '.local/**', '.wrangler/**'] },
  {
    files: [
      'src/domain/**/*.js',
      'src/platform/**/*.js',
      'src/features/year-game/**/*.{js,jsx}',
      'server/**/*.{js,mjs}',
      'tools/**/*.mjs',
      'tools/task-editor/**/*.jsx',
      'tests/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.serviceworker },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-constant-binary-expression': 'error',
    },
  },
];
