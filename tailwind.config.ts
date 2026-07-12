import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'rgb(var(--app-bg) / <alpha-value>)',
          card: 'rgb(var(--app-surface) / <alpha-value>)',
          cardStrong: 'rgb(var(--app-surface-strong) / <alpha-value>)',
          border: 'rgb(var(--app-border) / 0.13)',
          fg: 'rgb(var(--app-fg) / <alpha-value>)',
          muted: 'rgb(var(--app-muted) / <alpha-value>)',
          contrast: 'rgb(var(--app-contrast) / <alpha-value>)',
          active: '#3da8ff',
          green: '#72df98',
          purple: '#a982ff',
          orange: '#ffa726',
          red: '#ff6a62'
        }
      },
      boxShadow: {
        soft: '0 24px 80px rgba(0, 0, 0, 0.26)',
        innerGlow: 'inset 0 1px 0 rgb(var(--app-contrast) / 0.08)'
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif'
        ]
      },
      screens: {
        xs: '390px'
      }
    }
  },
  plugins: []
} satisfies Config;
