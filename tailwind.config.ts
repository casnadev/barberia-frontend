import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'barber-dark': '#0f172a',
        'barber-card': '#1e293b',
        'barber-border': '#334155',
        'barber-accent': '#2791F5',
      }
    },
  },
  plugins: [],
} satisfies Config