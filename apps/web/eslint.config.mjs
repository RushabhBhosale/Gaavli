import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Auth redirects deliberately reload the document to discard private client state.
  {
    files: ["src/lib/api.ts", "src/components/layout/admin-shell.tsx"],
    rules: { "@next/next/no-location-assign-relative-destination": "off" },
  },
  globalIgnores([".next/**", "next-env.d.ts"]),
]);
