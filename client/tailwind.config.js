/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      colors: {
        arena: {
          bg: '#0a0e1a',
          surface: '#111827',
          border: '#1e2d40',
          accent: '#00d4ff',
          green: '#00ff88',
          red: '#ff4757',
          gold: '#ffd700',
          purple: '#a855f7',
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px #00d4ff40' },
          '50%': { boxShadow: '0 0 20px #00d4ff80, 0 0 40px #00d4ff40' },
        },
        slideIn: {
          from: { transform: 'translateY(-10px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
