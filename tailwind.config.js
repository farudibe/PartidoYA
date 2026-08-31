/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0284c7", // celeste sólido (no pastel)
          dark: "#075985",
          light: "#38bdf8",
        },
      },
    },
  },
  plugins: [],
}
