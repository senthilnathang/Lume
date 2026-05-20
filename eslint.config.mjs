import lumeEslintConfig from './packages/@lume/eslint-config/index.mjs'
import globals from 'globals'

// Phase 1 config fix (CODE_QUALITY.md → P3-1, May 2026)
//
// The reusable flat config in packages/@lume/eslint-config/index.mjs is
// gitignored (the whole `packages/` directory is). To make sure the
// globals fix actually ships, the per-file-pattern globals declarations
// live here in the tracked root config, layered on top of the base.
//
// Result: `no-undef` dropped 267 → 3 (the remaining 3 are real bugs,
// not config gaps — see CODE_QUALITY.md "ESLint top rules").

export default [
  ...lumeEslintConfig,

  // Phase 3 (CODE_QUALITY.md): paths excluded from lint because they're
  // not part of the actual compile target.
  //
  // backend/src/core/graphql/**:
  //   Orphan NestJS scaffolding from a planned/abandoned migration.
  //   Zero callers in the codebase, dependencies (@nestjs/common,
  //   @nestjs/apollo, graphql, etc.) not even installed. Already excluded
  //   from tsconfig (Phase 1.2). Excluding from lint drops 173 problems.
  //   Drop this ignore if/when the GraphQL adapter is actually wired in.
  //
  // backend/src/modules/*/static/**:
  //   Vue frontend files served as backend static assets. Linted (and
  //   compiled) by apps/web-lume's own toolchain. Backend lint of these
  //   produces false positives for browser globals + @tiptap/* imports.
  {
    ignores: [
      'backend/src/core/graphql/**',
      'backend/src/modules/*/static/**',
    ],
  },

  // Backend (Node/ESM): backend/src + scripts.
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

  // Frontend (browser): Vue admin (apps/web-lume) + Nuxt public site
  // (apps/riagri-website). Vue files also caught by the .vue block below.
  {
    files: ['apps/**/*.{js,mjs,cjs,ts,tsx}', 'frontend/**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
  },

  // Vue SFCs — same browser globals as the rest of the frontend.
  {
    files: ['**/*.vue'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
  },

  // Test files (Jest + Vitest). Applied AFTER the env-specific blocks
  // so the merge is additive — a backend test gets node + jest, a
  // frontend test gets browser + jest.
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

  // no-console policy — error in production builds, off in dev so quick
  // console.log debugging doesn't fail CI on every PR.
  {
    files: ['**/*.ts', '**/*.js', '**/*.vue'],
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
]
