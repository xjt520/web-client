/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-green': '#1a472a',
        'card-red': '#dc2626',
        'card-black': '#1f2937',
      }
    },
  },
  plugins: [],
}
