import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        night: '#070b14',
        charcoal: '#161b2a',
        darkslate: '#4d5f7c',
        accent: '#f4b21b',
        padel: '#1b9aa7',
        rugby: '#7b3f00',
        soccer: '#175e27',
        cricket: '#a47c00',
        golf: '#0f4c3d',
      },
    },
  },
  plugins: [],
};

export default config;
