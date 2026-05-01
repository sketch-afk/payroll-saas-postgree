/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#080810',
          900: '#080810',
          800: '#0F0F1E',
          700: '#18182E',
          600: '#25253F',
          500: '#3A3A5C',
          400: '#5C5C85',
          300: '#8E8EAD',
          200: '#C4C4DA',
          100: '#EEEEF5',
        },
        gold: {
          DEFAULT: '#C9963A',
          light: '#E8B95A',
          dark: '#9B7020',
        },
        emerald: {
          DEFAULT: '#3DBF82',
          light: '#5DD89A',
          dark: '#2A8F5F',
        },
        rose: { DEFAULT: '#E05A5A' },
        amber: { DEFAULT: '#E0A03A' },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-right': 'slideRight 0.4s ease forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        slideRight: {
          from: { opacity: 0, transform: 'translateX(-20px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
