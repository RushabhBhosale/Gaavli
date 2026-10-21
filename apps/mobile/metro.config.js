const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const existing = config.resolver.blockList;

// Native build caches can live at the monorepo root when C: is low on space.
// Keep Metro from crawling those artifacts while preserving Expo's defaults.
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  /(?:^|[\\/])\.gradle(?:[\\/]|$)/,
];

module.exports = config;
