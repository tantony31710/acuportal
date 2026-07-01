/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        arabic: ['Noto Naskh Arabic', 'Amiri', 'serif'],
      },
      colors: {
        primary: { DEFAULT: 'oklch(0.74 0.14 175)', foreground: 'oklch(0.16 0.025 200)' },
        secondary: { DEFAULT: 'oklch(0.28 0.04 200)', foreground: 'oklch(0.97 0.01 180)' },
        background: 'oklch(0.16 0.025 200)',
        foreground: 'oklch(0.97 0.01 180)',
        card: { DEFAULT: 'oklch(0.21 0.03 200)', foreground: 'oklch(0.97 0.01 180)' },
        muted: { DEFAULT: 'oklch(0.25 0.03 200)', foreground: 'oklch(0.7 0.02 190)' },
        border: 'oklch(0.3 0.03 200)',
        input: 'oklch(0.25 0.03 200)',
        destructive: { DEFAULT: 'oklch(0.65 0.22 25)', foreground: 'oklch(0.98 0 0)' },
        success: { DEFAULT: 'oklch(0.72 0.18 150)', foreground: 'oklch(0.16 0.025 200)' },
        warning: { DEFAULT: 'oklch(0.8 0.17 80)', foreground: 'oklch(0.16 0.025 200)' },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
      },
      perspective: {
        '500': '500px',
        '800': '800px',
        '1000': '1000px',
        '1200': '1200px',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px) scale(1)', opacity: '0.6' },
          '33%': { transform: 'translateY(-18px) translateX(8px) scale(1.04)', opacity: '0.9' },
          '66%': { transform: 'translateY(8px) translateX(-10px) scale(0.97)', opacity: '0.7' },
        },
        'float-medium': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(-12px) translateX(6px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px 2px oklch(0.74 0.14 175 / 0.3)', opacity: '0.7' },
          '50%': { boxShadow: '0 0 24px 8px oklch(0.74 0.14 175 / 0.6)', opacity: '1' },
        },
        'glow-pulse-blue': {
          '0%, 100%': { boxShadow: '0 0 8px 2px oklch(0.65 0.2 240 / 0.3)', opacity: '0.7' },
          '50%': { boxShadow: '0 0 24px 8px oklch(0.65 0.2 240 / 0.6)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '75%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg) translateX(60px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(60px) rotate(-360deg)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'border-spin': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'pin-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
        'success-bounce': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '60%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'particle-float': {
          '0%': { transform: 'translateY(100vh) translateX(0px)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-10vh) translateX(30px)', opacity: '0' },
        },
      },
      animation: {
        'float-slow': 'float-slow 7s ease-in-out infinite',
        'float-medium': 'float-medium 5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'glow-pulse-blue': 'glow-pulse-blue 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'slide-up': 'slide-up 0.5s ease-out both',
        'slide-in-left': 'slide-in-left 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.4s ease-out both',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'orbit': 'orbit 6s linear infinite',
        'count-up': 'count-up 0.4s ease-out both',
        'border-spin': 'border-spin 3s ease infinite',
        'pin-pop': 'pin-pop 0.2s ease-out',
        'success-bounce': 'success-bounce 0.5s ease-out both',
        'particle-float': 'particle-float 8s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-teal': '0 0 20px 4px oklch(0.74 0.14 175 / 0.35)',
        'glow-blue': '0 0 20px 4px oklch(0.65 0.2 240 / 0.35)',
        'glow-emerald': '0 0 20px 4px oklch(0.72 0.18 150 / 0.35)',
        'glass': '0 8px 32px 0 rgba(0,0,0,0.45)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.perspective-500': { perspective: '500px' },
        '.perspective-800': { perspective: '800px' },
        '.perspective-1000': { perspective: '1000px' },
        '.perspective-1200': { perspective: '1200px' },
        '.transform-style-3d': { 'transform-style': 'preserve-3d' },
        '.backface-hidden': { 'backface-visibility': 'hidden' },
        '.glass': {
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(16px)',
          '-webkit-backdrop-filter': 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
        },
        '.glass-dark': {
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)',
        },
        '.text-glow-teal': {
          textShadow: '0 0 20px oklch(0.74 0.14 175 / 0.8)',
        },
        '.text-glow-blue': {
          textShadow: '0 0 20px oklch(0.65 0.2 240 / 0.8)',
        },
      })
    },
  ],
}
