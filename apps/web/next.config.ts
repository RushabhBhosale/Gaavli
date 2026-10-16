import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  transpilePackages: [
    "@gaavli/types",
    "@gaavli/validation",
    "@gaavli/constants",
  ],
};
export default config;
