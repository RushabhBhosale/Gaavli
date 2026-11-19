import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const mobile = new URL("../apps/mobile/", import.meta.url);
// Match Expo's production precedence; shell values take priority over files.
for (const name of [
  ".env.production.local",
  ".env.local",
  ".env.production",
  ".env",
]) {
  const file = new URL(name, mobile);
  if (existsSync(file)) process.loadEnvFile(fileURLToPath(file));
}
const value = process.env.EXPO_PUBLIC_API_BASE_URL;
let address;
try {
  address = new URL(value);
} catch {
  throw new Error(
    "Set EXPO_PUBLIC_API_BASE_URL to the production HTTPS /api/v1 address.",
  );
}
if (
  address.protocol !== "https:" ||
  address.username ||
  address.password ||
  address.search ||
  address.hash ||
  address.pathname.replace(/\/$/, "") !== "/api/v1"
)
  throw new Error(
    "Release builds require an HTTPS API address ending in /api/v1.",
  );

console.log(
  `Building Android release for ${address.origin}${address.pathname}`,
);
const child = spawn(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  [":app:assembleRelease"],
  {
    cwd: fileURLToPath(new URL("android/", mobile)),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NODE_ENV: "production",
      EXPO_PUBLIC_API_BASE_URL: address.toString().replace(/\/$/, ""),
      EXPO_NO_CLIENT_ENV_VARS: "0",
    },
  },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
