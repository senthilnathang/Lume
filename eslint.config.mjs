import lumeEslintConfig from './packages/@lume/eslint-config/index.mjs'

export default [
  ...lumeEslintConfig,
  {
    files: ['**/*.ts', '**/*.js', '**/*.vue'],
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
]
