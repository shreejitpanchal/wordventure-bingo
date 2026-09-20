import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    // dist/dev-dist/coverage/node_modules were already excluded; android/ and
    // dist-apk/ are Capacitor's fully-regenerated native project (gitignored
    // for the same reason -- see .gitignore) and were NOT excluded here,
    // which meant every run of this config was also linting its bundled,
    // minified, vendored JS (workbox's service-worker runtime and friends)
    // as if it were our own source -- that's where the vast majority of a
    // 914-error `no-undef` run came from (self/Request/FetchEvent/URL/
    // console/minified-variable-shadowing errors, none of them real).
    // scripts/logs/ is our own dev-script output, not source, either.
    ignores: [
      'dist/**',
      'dev-dist/**',
      'coverage/**',
      'node_modules/**',
      'android/**',
      'dist-apk/**',
      'scripts/logs/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Same reasoning typescript-eslint's own docs give for why projects
      // typically turn this off: `tsc --noEmit` (the next step in `vet`)
      // already catches genuinely undefined identifiers with full type
      // awareness (including ambient browser/DOM globals from tsconfig's
      // "lib" setting) far more reliably than ESLint's base no-undef can
      // without a hand-maintained globals list -- this file had never
      // declared browser globals (window/document/localStorage/setTimeout/
      // etc.) at all, which is what made every real source file using them
      // fail too, not just the vendored bundle above.
      'no-undef': 'off',
    },
  },
  {
    // The only two plain (non-TS) JS files in this repo outside the
    // ignored/vendored dirs above -- both Node-context, not browser, and
    // not covered by tsc, so they need real Node globals declared here.
    files: ['eslint.config.js', 'scripts/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'writable',
        global: 'readonly',
      },
    },
  },
];
