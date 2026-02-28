/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src-alpine/**/*.{js,html}',
    './examples/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        selectize: {
          primary: 'var(--selectize-primary, #3b82f6)',
          'primary-light': 'var(--selectize-primary-light, #eff6ff)',
          'primary-dark': 'var(--selectize-primary-dark, #1d4ed8)',
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'dropdown-in': 'dropdown-in 0.15s ease-out',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'dropdown-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
