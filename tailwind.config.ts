import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAF8F4",
        surface: "#FFFFFF",
        line: "#E3DED4",
        ink: { DEFAULT: "#1B2333", muted: "#4B5565", faint: "#6B7280" },
        navy: { 50: "#EEF2F8", 100: "#D9E2F0", 200: "#B3C4E0", 500: "#2E4F86", 600: "#23406F", 700: "#1B3259", 800: "#142645", 900: "#0E1B33" },
        success: { 50: "#ECF7F4", 100: "#CFEDE5", 600: "#0F766E", 700: "#0B5F58" },
        warn: { 50: "#FEF6E7", 100: "#FCE7C0", 600: "#B45309", 700: "#92400E" },
        danger: { 50: "#FDEEEE", 100: "#F9D3D3", 600: "#B91C1C", 700: "#991B1B" },
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Gujarati"', '"Noto Sans Devanagari"', "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(20, 38, 69, 0.06)" },
    },
  },
  plugins: [],
} satisfies Config;
