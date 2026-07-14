// js/tailwind-config.js
// Externalized Tailwind configuration to satisfy Content Security Policy (no unsafe-inline).
window.tailwind = window.tailwind || {};
window.tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                bebas: ['"Bebas Neue"', 'cursive'],
            },
            colors: {
                fifa: {
                    purple: '#4f145b',
                    gold: '#ffb81c'
                }
            }
        }
    }
};
