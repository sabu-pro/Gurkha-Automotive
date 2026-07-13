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
          DEFAULT: "#16181B",
          900: "#0F1113",
          800: "#16181B",
          700: "#1E2124",
          600: "#2A2E33",
          500: "#3A3F45",
        },
        steel: {
          DEFAULT: "#2E3A46",
          400: "#5A6B7A",
          500: "#3E4C59",
          600: "#2E3A46",
          700: "#222B34",
        },
        amber: {
          DEFAULT: "#F2A71B",
          400: "#F5B846",
          500: "#F2A71B",
          600: "#D6900E",
        },
        cream: {
          DEFAULT: "#F6F4EF",
          100: "#FCFBF9",
          200: "#F6F4EF",
          300: "#EDE9E0",
        },
        rust: {
          DEFAULT: "#C13B3B",
          600: "#A93030",
        },
        pit: {
          DEFAULT: "#2F8F5B",
          600: "#25774A",
        },
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      backgroundImage: {
        "hazard-stripes":
          "repeating-linear-gradient(135deg, #F2A71B 0px, #F2A71B 14px, #16181B 14px, #16181B 28px)",
        grille:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 10px)",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
