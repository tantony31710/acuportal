/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#020617', // Slate 950
        card: '#0f172a',      // Slate 900
        border: '#1e293b',    // Slate 800
        primary: {
          DEFAULT: '#2dd4bf', // Teal 400
          foreground: '#020617',
        },
        muted: {
          DEFAULT: '#64748b', // Slate 500
          foreground: '#94a3b8', // Slate 400
        },
        success: '#10b981', // Emerald 500
        warning: '#f59e0b', // Amber 500
        destructive: '#ef4444', // Red 500
      },
    },
  },
  plugins: [],
}
