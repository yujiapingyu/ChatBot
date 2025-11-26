/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          950: '#0b0c2c',
          900: '#111449',
        },
        rose: {
          500: '#f43f5e',
          600: '#e11d48',
        },
        slate: {
          900: '#0f172a',
        },
      },
      backdropBlur: {
        glass: '18px',
      },
      boxShadow: {
        glass: '0 10px 40px rgba(15, 23, 42, 0.25)',
      },
    },
  },
  plugins: [],
}

