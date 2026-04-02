/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFA301',
          50: '#FFF8E6',
          100: '#FFECB3',
          200: '#FFE080',
          300: '#FFD54D',
          400: '#FFCA1A',
          500: '#FFA301',
          600: '#E6920E',
          700: '#CC8200',
          800: '#B37200',
          900: '#996200',
        },
        // Semantic tokens using CSS vars (dark mode aware)
        brand: 'var(--color-brand)',
        'brand-dark': 'var(--color-brand-dark)',
        'brand-light': 'var(--color-brand-light)',
        'bg-primary': 'var(--color-bg)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'text-primary': 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        'surface': 'var(--color-surface)',
        'border-primary': 'var(--color-border)',
        black: '#000000',
        white: '#FFFFFF',
        gray: {
          50: '#F8F8F8',
          100: '#F0F0F0',
          200: '#E8E8E8',
          300: '#D0D0D0',
          400: '#A0A0A0',
          500: '#808080',
          600: '#606060',
          700: '#404040',
          800: '#202020',
          900: '#101010',
        }
      },
      fontFamily: {
        sans: ['Signika', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
