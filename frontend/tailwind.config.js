/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a4b8fc',
          400: '#818cf8',
          500: '#667eea',
          600: '#764ba2',
          700: '#5a3d7a',
          800: '#4a2c5c',
          900: '#3d1f4a',
        },
      },
    },
  },
  plugins: [],
}

