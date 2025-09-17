import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#ffffff'
        }
      },
      boxShadow: {
        card: '0 20px 45px rgba(15, 23, 42, 0.18)'
      }
    }
  },
  plugins: []
};

export default config;
