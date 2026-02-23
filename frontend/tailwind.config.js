/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        'flex', 'flex-1', 'flex-col', 'flex-shrink-0', 'min-h-screen', 'min-w-0', 'w-full', 'max-w-full',
        'overflow-x-hidden', 'overflow-y-auto', 'overflow-hidden', 'overflow-visible', 'ml-0', 'pt-14', 'p-4', 'sm:p-6', 'md:ml-64', 'md:pt-0', 'md:p-8', 'md:border-l',
        'bg-[var(--background)]', 'border-[var(--border-light)]', 'bg-[var(--surface)]', 'bg-[var(--background-subtle)]',
        'text-[var(--text)]', 'text-[var(--text-muted)]', 'text-[var(--primary)]', 'text-[var(--text-subtle)]', 'border-[var(--border)]',
        'transition-all', 'duration-300', 'ease-out',
        'fixed', 'inset-0', 'inset-y-0', 'left-0', 'right-0', 'top-0', 'z-30', 'z-40', 'z-50', 'md:hidden',
        'translate-x-0', '-translate-x-full', 'md:translate-x-0', 'transform',
        'w-64', 'max-w-[85vw]', 'border-r', 'border-b', 'border-t',
        'space-y-8', 'space-y-6', 'space-y-4', 'space-y-1', 'gap-3', 'gap-4', 'rounded-xl', 'rounded-lg', 'rounded-2xl',
        'break-words', 'truncate',
        'scale-105', 'scale-110', 'active:scale-95', 'active:scale-[0.98]',
        'page-header', 'page-title', 'page-title-lg', 'page-subtitle', 'card', 'card-elevated',
        'btn-primary', 'btn-secondary', 'input-field', 'label', 'table-header', 'table-th', 'table-td', 'table-td-muted', 'empty-state', 'loading-state',
        'grid', 'grid-cols-1', 'grid-cols-2', 'grid-cols-4', 'grid-cols-7', 'sm:grid-cols-2', 'lg:grid-cols-4', 'lg:grid-cols-2',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#D4140F',
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#D4140F',
                    700: '#b0100c',
                    800: '#8c0c09',
                    900: '#7f1d1d',
                },
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            borderRadius: {
                'app': '0.75rem',
                'app-lg': '1rem',
                'app-xl': '1.25rem',
            },
            boxShadow: {
                'focus': '0 0 0 3px rgb(212 20 15 / 0.25)',
            },
        },
    },
    plugins: [],
}
