import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        asphalt: {
          DEFAULT: "#1B1F23",
          900: "#101316",
          800: "#1B1F23",
          700: "#262B30",
          600: "#383F46",
          500: "#4C555D",
        },
        steel: {
          DEFAULT: "#4B5563",
          400: "#6B7280",
          500: "#4B5563",
          600: "#374151",
          700: "#27303A",
        },
        amber: {
          DEFAULT: "#F2A71B",
          400: "#F5B846",
          500: "#F2A71B",
          600: "#D6900E",
        },
        cream: {
          DEFAULT: "#FFFFFF",
          100: "#FFFFFF",
          200: "#FAFAF9",
          300: "#EEEEEC",
        },
        rust: {
          DEFAULT: "#C62828",
          600: "#AC1F1F",
        },
        pit: {
          DEFAULT: "#1E7A3C",
          400: "#2FA35A",
          500: "#1E7A3C",
          600: "#186530",
        },
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      backgroundImage: {
        "hazard-stripes":
          "repeating-linear-gradient(135deg, #1E7A3C 0px, #1E7A3C 14px, #1B1F23 14px, #1B1F23 28px)",
        grille:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 10px)",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.6) inset, 0 20px 40px -24px rgba(27,31,35,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
