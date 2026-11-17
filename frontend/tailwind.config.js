/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
        'modal': '0 25px 60px rgba(0,0,0,0.2)',
        'inner': 'inset 0 2px 4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
