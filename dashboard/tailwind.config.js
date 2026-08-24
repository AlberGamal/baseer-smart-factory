/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Baseer textile identity — Menoufia indigo + woven gold + terracotta
        indigo: {
          DEFAULT: '#1B3A5B',
          50: '#EAF0F6',
          100: '#D5E0EC',
          600: '#1B3A5B',
          700: '#15314D',
          800: '#102538',
          900: '#0B1B2A',
        },
        gold: {
          DEFAULT: '#C9A24B',
          light: '#E2C786',
          dark: '#A9842F',
        },
        terracotta: {
          DEFAULT: '#B5552F',
          light: '#CE7A55',
        },
        paper: '#F7F3EC',
        sand: '#EFE7D8',
      },
      fontFamily: {
        sans: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
        display: ['Cairo', 'Tajawal', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -4px rgba(27, 58, 91, 0.12)',
        gold: '0 0 0 1px rgba(201, 162, 75, 0.4)',
      },
      backgroundImage: {
        'weave': "repeating-linear-gradient(45deg, rgba(201,162,75,0.06) 0px, rgba(201,162,75,0.06) 2px, transparent 2px, transparent 10px)",
      },
    },
  },
  plugins: [],
};
