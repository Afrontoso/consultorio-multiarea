/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
          foreground: 'hsl(var(--brand-foreground) / <alpha-value>)',
        },
      },
    },
  },
};
