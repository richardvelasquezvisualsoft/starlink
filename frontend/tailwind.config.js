/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'st-bg': '#000000',
        'st-surface': '#111111',
        'st-border': '#222222',
        'st-primary': '#FFFFFF',
        'st-accent': '#00A8E8',
        'st-muted': '#9CA3AF',
        'st-online': '#10B981',
        'st-offline': '#EF4444',
        'st-warning': '#F59E0B',
      },
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
