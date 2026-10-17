/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        usc: {
          cardinal: '#990000',
          'cardinal-light': '#B31B1B',
          'cardinal-dark': '#7A0000',
          gold: '#FFCC00',
          'gold-light': '#FFE066',
          'gold-dark': '#E6B800'
        }
      }
    },
  },
  plugins: [],
}
