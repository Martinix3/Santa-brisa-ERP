import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
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
          50: 'hsl(var(--sb-neutral-50))',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        xl: `calc(var(--radius) + 4px)`,
        '2xl': `calc(var(--radius) + 8px)`,
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      }
    }
  },
  plugins: [],
}

export default config;
