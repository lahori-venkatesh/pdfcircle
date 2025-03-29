/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Add any custom colors here if needed
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.900'),
            '[class~="dark"] &': {
              color: theme('colors.gray.100'),
            },
            a: {
              color: theme('colors.indigo.600'),
              '&:hover': {
                color: theme('colors.indigo.700'),
              },
              '[class~="dark"] &': {
                color: theme('colors.indigo.400'),
                '&:hover': {
                  color: theme('colors.indigo.300'),
                },
              },
            },
            h1: {
              color: theme('colors.gray.900'),
              '[class~="dark"] &': {
                color: theme('colors.white'),
              },
            },
            h2: {
              color: theme('colors.gray.900'),
              '[class~="dark"] &': {
                color: theme('colors.white'),
              },
            },
            h3: {
              color: theme('colors.gray.900'),
              '[class~="dark"] &': {
                color: theme('colors.white'),
              },
            },
            h4: {
              color: theme('colors.gray.900'),
              '[class~="dark"] &': {
                color: theme('colors.white'),
              },
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};