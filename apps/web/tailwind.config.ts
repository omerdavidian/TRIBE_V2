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
          50: '#e6f2f3',
          100: '#b3d9dc',
          500: '#007a86',
          600: '#005f6b',
          700: '#004C54', // brand primary
          800: '#003940',
          900: '#002629',
        },
        coral: {
          50: '#fdf1ed',
          100: '#f9d5c8',
          400: '#ef9076',
          500: '#E97451', // brand accent
          600: '#d45f3a',
          700: '#b84d2a',
        },
        cream: {
          50: '#fdfcfb',
          100: '#F9F7F2', // brand background
          200: '#f0ece2',
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
