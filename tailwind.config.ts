// tailwind.config.ts — Tailwind v4 (TS)
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'sb-sun': 'hsl(var(--sb-sun))',
        'sb-cobre': 'hsl(var(--sb-cobre))',
        'sb-agua': 'hsl(var(--sb-agua))',
        'sb-verde-mar': 'hsl(var(--sb-verde-mar))',
        'sb-neutral': {
          950: 'hsl(var(--sb-neutral-950))',
          900: 'hsl(var(--sb-neutral-900))',
          700: 'hsl(var(--sb-neutral-700))',
          500: 'hsl(var(--sb-neutral-500))',
          400: 'hsl(var(--sb-neutral-400))',
          200: 'hsl(var(--sb-neutral-200))',
          100: 'hsl(var(--sb-neutral-100))',
          50:  'hsl(var(--sb-neutral-50))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 6px 12px -4px rgb(0 0 0 / 0.08)',
        lg: '0 16px 24px -8px rgb(0 0 0 / 0.12)',
        xl: '0 24px 32px -12px rgb(0 0 0 / 0.14)',
      },
      keyframes: {
        'fade-in-50': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in-from-top-1': { from: { transform: 'translateY(-6px)' }, to: { transform: 'translateY(0)' } },
        'scale-in': { from: { transform: 'scale(0.98)' }, to: { transform: 'scale(1)' } },
      },
      animation: {
        'fade-in-50': 'fade-in-50 .15s ease-out both',
        'slide-in-from-top-1': 'slide-in-from-top-1 .15s ease-out both',
        'scale-in': 'scale-in .12s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
