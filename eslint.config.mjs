import globals from 'globals';
import { typescript } from '@frsource/eslint-config';

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  ...typescript,
  { ignores: ['**/dist', '**/.tmp', '**/node_modules'] },
  {
    files: ['**/*.spec.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  { languageOptions: { globals: globals.node } },
];
