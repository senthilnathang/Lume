import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import typescriptEslint from 'typescript-eslint'
import globals from 'globals'

// Phase-1 config fix (CODE_QUALITY.md P3-1):
//   Previously emitted 267 `no-undef` errors for runtime-provided globals
//   (`process`, `Buffer`, `__dirname`, `window`, `document`, `URL`, etc.).
//   Flat config doesn't auto-resolve these — they have to be declared per
//   file pattern. The four blocks below cover the four execution contexts
//   in this monorepo: backend node, frontend browser, test runner, build
//   scripts.

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.nuxt/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '**/.DS_Store'
    ]
  },
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,

  // Backend (Node/ESM). All backend/src code + scripts.
  {
    files: ['backend/**/*.{js,mjs,cjs,ts}', 'scripts/**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
  },

  // Frontend (browser). Vue admin + Nuxt public site.
  {
    files: ['apps/**/*.{js,mjs,cjs,ts,tsx,vue}', 'frontend/**/*.{js,mjs,cjs,ts,tsx,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
  },

  // Test files everywhere. Adds Jest + Vitest globals on top of the
  // file's normal environment (we apply this AFTER the env-specific
  // blocks above so the merge is additive).
  {
    files: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,tsx}',
      '**/tests/**/*.{js,mjs,cjs,ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },

  // TS-specific severity tuning (carried over from the original config).
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }]
    }
  },

  // Vue plugin essential + repo-specific tunings.
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: typescriptEslint.parser,
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn'
    }
  }
]
