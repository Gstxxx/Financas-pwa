import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#08080c',
          soft: '#0e0e14',
        },
        surface: {
          DEFAULT: '#14141c',
          2: '#1c1c26',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.12)',
        },
        text: {
          DEFAULT: '#fafafa',
          2: '#a1a1aa',
          3: '#71717a',
        },
        accent: {
          DEFAULT: '#a78bfa',
          2: '#c084fc',
        },
        income: {
          DEFAULT: '#4ade80',
          bg: 'rgba(74,222,128,0.12)',
        },
        expense: {
          DEFAULT: '#fb7185',
          bg: 'rgba(251,113,133,0.12)',
        },
        warn: {
          DEFAULT: '#fbbf24',
          bg: 'rgba(251,191,36,0.12)',
        },
        critical: {
          DEFAULT: '#ef4444',
          bg: 'rgba(239,68,68,0.12)',
        },
      },
      borderRadius: {
        DEFAULT: '18px',
        sm: '12px',
        lg: '24px',
      },
      fontFamily: {
        sans: ['var(--font-geist)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        heroFade: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        slideDown: {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(100%)' },
        },
        toastIn: {
          from: { transform: 'translateX(-50%) translateY(-130%)' },
          to: { transform: 'translateX(-50%) translateY(0)' },
        },
        toastOut: {
          from: { transform: 'translateX(-50%) translateY(0)' },
          to: { transform: 'translateX(-50%) translateY(-130%)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.45s cubic-bezier(.2,.8,.2,1) backwards',
        heroFade: 'heroFade 0.5s cubic-bezier(.2,.8,.2,1) backwards',
        slideUp: 'slideUp 0.3s cubic-bezier(.2,.8,.2,1)',
        slideDown: 'slideDown 0.3s cubic-bezier(.2,.8,.2,1)',
        toastIn: 'toastIn 0.3s cubic-bezier(.2,.8,.2,1)',
        toastOut: 'toastOut 0.3s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};

export default config;
