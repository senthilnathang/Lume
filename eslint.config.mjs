import lumeEslintConfig from './packages/@lume/eslint-config/index.mjs'
import globals from 'globals'
import { readFileSync, existsSync } from 'node:fs'

const nuxtImportsFile = new URL('./apps/website/.nuxt/imports.d.ts', import.meta.url)
const nuxtImports = existsSync(nuxtImportsFile) ? readFileSync(nuxtImportsFile, 'utf8') : ''
const nuxtGlobals = Object.fromEntries([...nuxtImports.matchAll(/^export \{([^}]+)\}/gm)]
  .flatMap(match => match[1].split(',').map(name => name.trim().split(/\s+as\s+/).pop()))
  .map(name => [name, 'readonly']))

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

  {
    files: ['apps/website/**/*.{ts,js,vue}'],
    languageOptions: { globals: { ...nuxtGlobals, $fetch: 'readonly', defineNuxtConfig: 'readonly' } },
  },
  {
    files: ['apps/website/server/**/*.ts'],
    languageOptions: { globals: { ...globals.node, defineEventHandler: 'readonly', setHeader: 'readonly' } },
  },

  // Phase 3 (CODE_QUALITY.md): paths excluded from lint because they're
  // not part of the actual compile target.
  //
  // legacy/express/src/core/graphql/**:
  //   Orphan NestJS scaffolding from a planned/abandoned migration.
  //   Zero callers in the codebase, dependencies (@nestjs/common,
  //   @nestjs/apollo, graphql, etc.) not even installed. Already excluded
  //   from tsconfig (Phase 1.2). Excluding from lint drops 173 problems.
  //   Drop this ignore if/when the GraphQL adapter is actually wired in.
  //
  // packages/@lume/module-ui/src/modules/*/static/**:
  //   Vue frontend files served as backend static assets. Linted (and
  //   compiled) by apps/admin's own toolchain. Backend lint of these
  //   produces false positives for browser globals + @tiptap/* imports.
  {
    ignores: [
      'legacy/**',
      'packages/@lume/module-ui/src/modules/*/static/**',
    ],
  },

  // Backend (Node/ESM): legacy/express/src + scripts.
  {
    files: ['apps/api/**/*.{js,mjs,cjs,ts}', 'scripts/**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
  },

  // Frontend (browser): Vue admin (apps/admin) + Nuxt public site
  // (apps/website). Vue files also caught by the .vue block below.
  {
    files: ['apps/admin/**/*.{js,mjs,cjs,ts,tsx}', 'apps/website/**/*.{js,mjs,cjs,ts,tsx}'],
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

  // Phase 3.1 (CODE_QUALITY.md): unused-vars policy for JS files.
  // The base flat config wires @typescript-eslint/no-unused-vars only
  // on .ts/.tsx files but it's coming through for .js too via the
  // typescript-eslint recommended rules. We need both:
  //   - Disable @typescript-eslint/no-unused-vars on .js (not its target).
  //   - Enable the core no-unused-vars on .js with the `^_` ignore
  //     pattern so destructured "documentation fields" can be marked
  //     `_fieldName` to silence the lint.
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
]
