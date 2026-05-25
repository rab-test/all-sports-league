import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light theme tokens (player-facing)
        surface:  '#F4F5F7',
        navy:     '#1B2A4A',
        muted:    '#6B7280',
        accent:   '#B8972E',
        success:  '#16A34A',
        red:      '#E8192C',
        // Sport pill colours (light-bg friendly)
        padel:    '#2563EB',
        rugby:    '#DC2626',
        soccer:   '#16A34A',
        cricket:  '#D97706',
        golf:     '#475569',
        // Dark theme tokens (admin only)
        night:    '#0F1724',
        charcoal: '#1B2A4A',
        darkslate: '#4d5f7c',
      },
    },
  },
  plugins: [],
};

export default config;
