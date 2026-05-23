import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        prime: {
          DEFAULT: "rgb(var(--c-prime) / <alpha-value>)",
          50: "rgb(var(--c-prime-50) / <alpha-value>)",
          100: "rgb(var(--c-prime-100) / <alpha-value>)",
          200: "rgb(var(--c-prime-200) / <alpha-value>)",
          300: "rgb(var(--c-prime-300) / <alpha-value>)",
          400: "rgb(var(--c-prime-400) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          muted: "rgb(var(--c-ink-muted) / <alpha-value>)",
          subtle: "rgb(var(--c-ink-subtle) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "#1DB954",
          50: "rgb(var(--c-accent-50) / <alpha-value>)",
          100: "#C5EFD3",
          200: "#9DE4B5",
          300: "#5FD088",
          400: "#1DB954",
          500: "#19A449",
          600: "rgb(var(--c-accent-600) / <alpha-value>)",
          700: "#106C2F",
          800: "#0B5023",
          900: "#063418",
        },
        warn: "#E89C2F",
        danger: "#D7423B",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--c-shadow) / 0.04), 0 8px 24px rgb(var(--c-shadow) / 0.06)",
        ring: "0 0 0 4px rgba(29, 185, 84, 0.18)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "splash-rise": {
          "0%": { transform: "translateY(60vh)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "splash-rise":
          "splash-rise 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
