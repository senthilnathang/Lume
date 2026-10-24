import baseConfig from '../../packages/@lume/tailwind-config/index.js'

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    '../../packages/@lume/module-ui/src/modules/**/static/**/*.{vue,js,ts,jsx,tsx}',
  ],
}
