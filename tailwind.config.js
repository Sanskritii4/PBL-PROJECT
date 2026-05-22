/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0e1a',
        'bg-secondary': '#111827',
        'bg-card': 'rgba(17, 24, 39, 0.7)',
        'bg-glass': 'rgba(255, 255, 255, 0.04)',
        'border-glass': 'rgba(255, 255, 255, 0.08)',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        'accent-blue': '#3b82f6',
        'accent-cyan': '#06b6d4',
        'accent-green': '#10b981',
        'accent-red': '#ef4444',
        'accent-orange': '#f59e0b',
        'accent-purple': '#8b5cf6',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3b82f6, #06b6d4)',
        'gradient-success': 'linear-gradient(135deg, #10b981, #06b6d4)',
        'gradient-danger': 'linear-gradient(135deg, #ef4444, #f59e0b)',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
      }
    },
  },
  plugins: [],
}
