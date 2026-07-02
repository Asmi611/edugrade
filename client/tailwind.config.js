/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // EduGrade brand palette — dark navy + indigo
        navy: {
          50:  '#eef2f9',
          100: '#d6deec',
          200: '#aebcd9',
          300: '#7e91bf',
          400: '#516aa3',
          500: '#324a85',
          600: '#243869',
          700: '#1a2a4f',
          800: '#111d39',
          900: '#0a142a',
          950: '#060c1c',
        },
        indigo: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(99, 102, 241, 0.45)',
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(circle at 25% 20%, rgba(99,102,241,0.18), transparent 45%), radial-gradient(circle at 80% 60%, rgba(79,70,229,0.18), transparent 45%)',
      },
    },
  },
  plugins: [],
};
