import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  experimental: {
    agentUpgrade: "security",
  },
  transpilePackages: [
    "@gaavli/types",
    "@gaavli/validation",
    "@gaavli/constants",
    "@gaavli/utils",
  ],
};
export default config;
