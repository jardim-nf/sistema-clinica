/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MUDANÇA: Primary agora é um tom de Verde Esmeralda (#10b981 é emerald-500)
        primary: '#10b981', 
        secondary: '#64748b',
        background: '#f8fafc',
      }
    },
  },
  plugins: [],
}