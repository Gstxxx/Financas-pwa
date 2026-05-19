import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--bg)',
          elev: 'var(--bg-elev)',
          // Legacy alias used by older components during migration
          soft: 'var(--bg-elev)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        hair: {
          DEFAULT: 'var(--hair)',
          soft: 'var(--hair-soft)',
        },
        // Legacy alias for border-*
        border: {
          DEFAULT: 'var(--hair)',
          strong: 'var(--hair)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          mid: 'var(--ink-mid)',
          mute: 'var(--ink-mute)',
          faint: 'var(--ink-faint)',
        },
        // Legacy alias for text-*
        text: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-mid)',
          3: 'var(--ink-mute)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          deep: 'var(--accent-deep)',
          tint: 'var(--accent-tint)',
          ink: 'var(--accent-ink)',
          // Legacy alias
          2: 'var(--accent-deep)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          bg: 'color-mix(in oklch, var(--warn) 15%, transparent)',
        },
        neg: {
          DEFAULT: 'var(--neg)',
          tint: 'var(--neg-tint)',
        },
        // Legacy semantic aliases (mapped to new tokens)
        income: {
          DEFAULT: 'var(--accent)',
          bg: 'color-mix(in oklch, var(--accent) 12%, transparent)',
        },
        expense: {
          DEFAULT: 'var(--neg)',
          bg: 'color-mix(in oklch, var(--neg) 12%, transparent)',
        },
        critical: {
          DEFAULT: 'var(--neg)',
          bg: 'color-mix(in oklch, var(--neg) 12%, transparent)',
        },
        cat: {
          1: 'var(--cat-1)',
          2: 'var(--cat-2)',
          3: 'var(--cat-3)',
          4: 'var(--cat-4)',
          5: 'var(--cat-5)',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--r-lg)',
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Times New Roman', 'serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
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
