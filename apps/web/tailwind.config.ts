import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#F4F6F5',
          100: '#E7ECE9',
          500: '#87958D',
          600: '#738279',
          700: '#5F6F65', // brand primary
          800: '#4E5D54',
          900: '#3F4C44',
        },
        coral: {
          50: '#FEDEE1', // brand secondary
          100: '#F9CFD3',
          400: '#E39BA4',
          500: '#CF7F8A',
          600: '#B36B75',
          700: '#93555F',
        },
        cream: {
          50: '#FFFFFF',
          100: '#FAFAF8', // brand background
          200: '#EAEAEA', // neutral UI
        },
        sand: {
          500: '#D8C3A5', // brand accent
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
