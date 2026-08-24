import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef3ff",
          100: "#dae2ff",
          600: "#0052cc",
          700: "#003d9b",
          800: "#00317d",
        },
        success: "#087a32",
        warning: "#a85700",
        danger: "#ba1a1a",
        ink: "#191c1e",
        canvas: "#f7f9fb",
      },
      boxShadow: { card: "0 4px 12px rgba(25,28,30,.05)" },
      maxWidth: { page: "1280px" },
    },
  },
  plugins: [],
} satisfies Config;
