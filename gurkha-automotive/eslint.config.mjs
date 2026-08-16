import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// Flat config, required by ESLint 9 and by eslint-config-next 16 (which no
// longer ships an eslintrc-compatible config). Rule set is unchanged from the
// previous .eslintrc.json: next/core-web-vitals and nothing else.
const config = [
  {
    ignores: [".next/**", ".vercel/**", "next-env.d.ts", "public/**"],
  },
  ...nextCoreWebVitals,
];

export default config;
