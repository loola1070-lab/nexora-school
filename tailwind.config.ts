import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f5fb", 100: "#e1eaf6", 200: "#c3d4ec", 300: "#9bb5dc", 400: "#6a8fc6",
          500: "#4a72ad", 600: "#385b92", 700: "#2d4a77", 800: "#1e3558", 900: "#12233f", 950: "#0b172b",
        },
      },
      fontFamily: { sans: ["Tajawal", '"IBM Plex Sans Arabic"', "system-ui", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(18,35,63,.05), 0 8px 24px -12px rgba(18,35,63,.14)" },
    },
  },
  plugins: [],
};
export default config;
