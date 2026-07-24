/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2f7',
          100: '#d5ddea',
          200: '#a8bdd4',
          300: '#7a9cbe',
          400: '#4d7aa8',
          500: '#2a5a8e',
          600: '#1e4270',
          700: '#162f54',
          800: '#0f1f3a',
          900: '#0a1428',
          950: '#070d1c',
        },
        accent: {
          50: '#fef9eef',
          100: '#fef0d4',
          200: '#fce0a8',
          300: '#f9cb72',
          400: '#f5b041',
          500: '#e8951c',
          600: '#c2760e',
          700: '#9b5a0a',
          800: '#7a4708',
          900: '#5e3806',
        },
        cream: {
          50: '#fdfbf7',
          100: '#f9f3e8',
          200: '#f0e4d0',
          300: '#e6d3b5',
          400: '#d4bd95',
          500: '#c0a878',
        },
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
        error: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'timer-shake': 'timerShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite',
        'skeleton-shimmer': 'skeletonShimmer 1.6s ease-in-out infinite',
        'foil-sheen': 'foilSheen 5s ease-in-out infinite',
        'spotlight-drift': 'spotlightDrift 12s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 176, 65, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 176, 65, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        timerShake: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '25%': { transform: 'translate3d(-2px, 0, 0) scale(1.03)' },
          '50%': { transform: 'translate3d(0, 0, 0) scale(1.06)' },
          '75%': { transform: 'translate3d(2px, 0, 0) scale(1.03)' },
        },
        skeletonShimmer: {
          '0%': { opacity: '0.5' },
          '50%': { opacity: '0.9' },
          '100%': { opacity: '0.5' },
        },
        foilSheen: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        spotlightDrift: {
          '0%, 100%': { transform: 'translate(-50%, 0) scale(1)', opacity: '0.55' },
          '50%': { transform: 'translate(-50%, 10px) scale(1.06)', opacity: '0.75' },
        },
      },
    },
  },
  plugins: [],
}
