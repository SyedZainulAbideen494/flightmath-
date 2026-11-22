/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme-resolved="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        elevated: 'rgb(var(--elevated-rgb) / <alpha-value>)',
        inset: 'rgb(var(--inset-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        faint: 'rgb(var(--faint-rgb) / <alpha-value>)',
        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        amber: 'rgb(var(--amber-rgb) / <alpha-value>)',
        gold: 'rgb(var(--gold-rgb) / <alpha-value>)',
        sienna: 'rgb(var(--sienna-rgb) / <alpha-value>)',
        sage: 'rgb(var(--success-rgb) / <alpha-value>)',
        coral: 'rgb(var(--error-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Manrope Variable', 'Manrope', 'sans-serif'],
        sans: ['DM Sans Variable', 'DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        chip: '6px',
        tile: '14px',
        panel: '20px',
        btn: '25px',
      },
      boxShadow: {
        float: 'var(--shadow-float)',
        glass: 'inset 0 1px 0 var(--glass-highlight), 0 24px 60px -34px var(--glow)',
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
      keyframes: {
        breathe: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
        drift: { '0%': { transform: 'translate3d(0,0,0)' }, '100%': { transform: 'translate3d(24px,-18px,0)' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        breathe: 'breathe 5s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite alternate',
        rise: 'rise 260ms ease-out both',
      },
    },
  },
  plugins: [],
}
