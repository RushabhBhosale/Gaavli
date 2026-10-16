import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
export default defineConfig([
  expo,
  { ignores: ["dist/**", ".expo/**", "expo-env.d.ts"] },
]);
