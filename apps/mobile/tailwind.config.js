/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: { extend: { 
    colors: {
      arctic: {
        base: '#F7FBFD',
        card: '#D6E6EF',
        accent: '#7FA6B8',
        navy: '#2A3E4B',
      },
      status: {
        approved: '#5B8C6E',
        pending: '#C9A24B',
        rejected: '#B26B6B',
      },
    },
  } },
  plugins: [],
};