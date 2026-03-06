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
      },
      screens: {
        // 标准断点
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        // 自定义断点
        'xs': '375px',
        'landscape': { 'raw': '(orientation: landscape)' },
        'portrait': { 'raw': '(orientation: portrait)' },
        'mobile-land': { 'raw': '(max-height: 500px) and (orientation: landscape)' },
        'mobile-land-sm': { 'raw': '(max-height: 400px) and (orientation: landscape)' },
        'tablet-land': { 'raw': '(min-width: 768px) and (orientation: landscape)' },
        'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}
