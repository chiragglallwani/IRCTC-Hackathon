import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // Client-side storage is intentionally read after hydration in this app.
      "react-hooks/set-state-in-effect": "off",
      // IDs and payment references are created only inside user event handlers.
      "react-hooks/purity": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "irctc-hackathon-mock/**",
  ]),
]);
