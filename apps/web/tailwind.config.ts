import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#EFF6F5',
          100: '#D8E8E4',
          500: '#2F6A63',
          600: '#285B55',
          700: '#1F4A45',
          800: '#173934',
          900: '#122D29',
        },
        coral: {
          50: '#FDECEF',
          100: '#F8D3DA',
          400: '#C85A70',
          500: '#A63D55',
          600: '#8E3349',
          700: '#74283B',
        },
        cream: {
          50: '#FFFFFF',
          100: '#F6F3ED',
          200: '#D9D1C3',
        },
        sand: {
          500: '#B5966E',
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
