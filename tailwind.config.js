/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        // Offset delle aree sicure iOS (notch, barra gesture, isola dinamica).
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
      },
      minHeight: {
        // Bersaglio tattile minimo raccomandato (WCAG 2.5.8 / Apple HIG).
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
