/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // Semantic token palette (CSS variable powered)
        token: {
          bg: 'var(--bg-base)',
          surface: 'var(--surface)',
          'surface-raised': 'var(--surface-raised)',
          'surface-hover': 'var(--surface-hover)',
          border: 'var(--border)',
          'border-subtle': 'var(--border-subtle)',
          'border-active': 'var(--border-active)',
          text: 'var(--text-primary)',
          'text-muted': 'var(--text-secondary)',
          'text-dim': 'var(--text-tertiary)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
          'accent-subtle': 'var(--accent-subtle)',
          'accent-secondary': 'var(--accent-secondary)',
          success: 'var(--success)',
          danger: 'var(--error)',
          'danger-subtle': 'var(--error-subtle)',
        },
        // Backward-compatible arena mappings resolved to calm tokens
        arena: {
          bg: 'var(--bg-base)',
          'bg-deep': 'var(--bg-base)',
          surface: 'var(--surface)',
          'surface-light': 'var(--surface-raised)',
          border: 'var(--border)',
          'border-light': 'var(--border-active)',
          accent: 'var(--accent)',
          'accent-glow': 'var(--accent)',
          green: 'var(--accent)',
          emerald: 'var(--accent)',
          red: 'var(--error)',
          rose: 'var(--error)',
          gold: 'var(--accent-secondary)',
          amber: 'var(--accent-secondary)',
          purple: 'var(--surface-raised)',
          violet: 'var(--text-secondary)',
          pink: 'var(--error)',
        },
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        card: '0 2px 8px 0 rgba(0, 0, 0, 0.35)',
        dropdown: '0 8px 24px -4px rgba(0, 0, 0, 0.55)',
        'neon-cyan': 'none',
        'neon-purple': 'none',
        'neon-emerald': 'none',
        'neon-red': 'none',
        'glass-card': 'none',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.25s ease-out',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateY(-6px)', opacity: 0 },
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
