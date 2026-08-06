import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "node_modules/**", "public/**"]),
  {
    rules: {
      // Cosmetic only — unescaped quotes/apostrophes render fine in JSX text.
      "react/no-unescaped-entities": "off",
      // React Compiler advisory rules: keep them visible as warnings rather than
      // build-breaking errors (they guide RC optimization, not correctness).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
])

export default eslintConfig
