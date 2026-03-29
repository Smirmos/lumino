import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5B4FCF',
          50: '#F0EEFB',
          100: '#E0DCF7',
          200: '#C1B9EF',
          300: '#A296E7',
          400: '#8373DF',
          500: '#5B4FCF',
          600: '#4A3FB5',
          700: '#3A3190',
          800: '#2A236B',
          900: '#1A1546',
        },
      },
    },
  },
  plugins: [],
};

export default config;
