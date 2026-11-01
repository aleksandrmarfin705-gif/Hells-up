import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050505',
        surface: { DEFAULT: '#0c0c0e', 2: '#131316', 3: '#1a1a1e' },
        line: 'rgba(212,175,55,0.16)',
        gold: { 50: '#fbf3d4', 100: '#f5e3a0', 200: '#f0d57a', 300: '#e8c55a', 400: '#d4af37', 500: '#b8922a', 600: '#8f6f1f', 700: '#6b5217' },
        rarity: { common: '#9ca3af', uncommon: '#5fbf7a', rare: '#4c8dff', epic: '#a95bff', legendary: '#ffb02e', mythic: '#ff4560' },
        ember: '#e2552b',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 0 0 1px rgba(198,244,50,0.35), 0 10px 30px -12px rgba(198,244,50,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 14px 36px -18px rgba(0,0,0,0.85)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        glow: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
        sheen: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        floaty: 'floaty 5s ease-in-out infinite',
        glow: 'glow 3s ease-in-out infinite',
        sheen: 'sheen 6s linear infinite',
      },
    },
  },
  plugins: [],
};
export default config;
