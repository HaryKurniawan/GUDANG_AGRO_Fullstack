/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f8f5',
          100: '#e1efe8',
          200: '#c5dfd3',
          300: '#9bc8b5',
          400: '#6ca992',
          500: '#4c8d76',
          600: '#3a715e',
          700: '#305b4d',
          800: '#274a3f',
          900: '#213e35',
          950: '#12241f',
        }
      }
    },
  },
  plugins: [],
}
