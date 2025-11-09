/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff4e6',
          100: '#ffe0b3',
          200: '#ffcc80',
          300: '#ffb84d',
          400: '#ffa31a',
          500: '#ff8c00', // PNC Orange
          600: '#e67e00',
          700: '#cc7000',
          800: '#b36200',
          900: '#995400',
        },
        pnc: {
          orange: '#F58025', // Official PNC Orange
          'orange-dark': '#D66A1F',
          'orange-light': '#FF9A4D',
          blue: '#0069AA', // Official PNC Blue
          'blue-dark': '#005288',
          'blue-light': '#007BC4',
        },
      },
    },
  },
  plugins: [],
}

