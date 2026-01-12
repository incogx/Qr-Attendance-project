/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './contexts/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          maroon: '#7A1431',
          maroonDark: '#5C0F26',
          maroonLight: '#FBECEF',
          gold: '#F2C14E',
          surface: '#FFFFFF',
          text: '#4A4A4A',
          muted: '#7A6A6A',
        },
        primary: '#771C32',
        muted: '#F3F4F6',
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '34px',
      },
    },
  },
  plugins: [],
};
