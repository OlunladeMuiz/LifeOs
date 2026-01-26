import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Local backups / duplicates (not shipped code)
    "**/*_duplicate_backup/**",
  ]),

  // Project-level rule overrides
  {
    rules: {
      // This rule is too strict for standard async data loading patterns.
      // It flags calling async loaders inside effects, which is normal in Next client components.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);

export default eslintConfig;
