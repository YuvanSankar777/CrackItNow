/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme-bg': '#F6F9FC',
        'theme-surface': '#EEF2F6',
        'theme-border': '#D6DEE8',
        'theme-text': '#1E293B',
        'theme-text-muted': '#64748B',
        'theme-accent': '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'breathe': 'breathe 1.5s ease-in-out infinite',
        'pulse-fast': 'pulse 1.2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease both',
        'slide-up': 'slideUp 0.4s ease both',
        'slide-in-right': 'slideInRight 0.4s ease both',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { boxShadow: '0 0 0 0px rgba(59, 130, 246, 0.2)' },
          '50%': { boxShadow: '0 0 0 10px rgba(59, 130, 246, 0.05)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
