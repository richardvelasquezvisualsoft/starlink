/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'st-bg': 'var(--color-bg-app, #000000)',
        'st-surface': 'var(--color-bg-surface, #111111)',
        'st-border': 'var(--color-border, #222222)',
        'st-primary': 'var(--color-text-primary, #FFFFFF)',
        'st-accent': 'var(--color-brand-primary, #00A8E8)',
        'st-muted': 'var(--color-text-muted, #9CA3AF)',
        'st-online': 'var(--color-status-success, #10B981)',
        'st-offline': 'var(--color-status-danger, #EF4444)',
        'st-warning': 'var(--color-status-warning, #F59E0B)',

        // CLIENTE Specific Tokens
        'client-bg-app': 'var(--client-bg-app, #000000)',
        'client-bg-surface': 'var(--client-bg-surface, #111111)',
        'client-bg-subtle': 'var(--client-bg-subtle, #1A1A1A)',
        'client-bg-emphasis': 'var(--client-bg-emphasis, #1E293B)',
        
        'client-border': 'var(--client-border, #222222)',
        'client-border-strong': 'var(--client-border-strong, #334155)',
        
        'client-text-primary': 'var(--client-text-primary, #FFFFFF)',
        'client-text-secondary': 'var(--client-text-secondary, #94A3B8)',
        'client-text-muted': 'var(--client-text-muted, #94A3B8)',
        'client-text-disabled': 'var(--client-text-disabled, #64748B)',
        
        'client-primary': 'var(--client-primary)',
        'client-primary-hover': 'var(--client-primary-hover)',
        'client-primary-active': 'var(--client-primary-active)',
        'client-primary-soft': 'var(--client-primary-soft)',
        'client-primary-contrast': 'var(--client-primary-contrast)',
        'client-primary-hover-contrast': 'var(--client-primary-hover-contrast)',
        'client-primary-active-contrast': 'var(--client-primary-active-contrast)',
        
        'client-accent': 'var(--client-accent)',
        'client-accent-hover': 'var(--client-accent-hover)',
        'client-accent-soft': 'var(--client-accent-soft)',
        'client-accent-contrast': 'var(--client-accent-contrast)',
        'client-accent-hover-contrast': 'var(--client-accent-hover-contrast)',
        'client-accent-active-contrast': 'var(--client-accent-active-contrast)',
        
        'client-highlight': 'var(--client-highlight)',
        'client-highlight-hover': 'var(--client-highlight-hover)',
        'client-highlight-soft': 'var(--client-highlight-soft)',
        
        'client-success': 'var(--client-success)',
        'client-success-soft': 'var(--client-success-soft)',
        
        'client-warning': 'var(--client-warning)',
        'client-warning-soft': 'var(--client-warning-soft)',
        
        'client-danger': 'var(--client-danger)',
        'client-danger-soft': 'var(--client-danger-soft)',
        
        'client-info': 'var(--client-info)',
        'client-info-soft': 'var(--client-info-soft)',
      },
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
