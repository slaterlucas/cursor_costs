/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1f1f1f',
        'dark-grey': '#262626',
        'light-grey': '#323232',
        'cursor-dark': '#1E1E1E',
        'text-muted': '#9ca3af',
      },
    },
  },
  plugins: [],
} 