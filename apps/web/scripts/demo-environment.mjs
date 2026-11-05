import nextEnv from "@next/env";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
const uri = new URL(process.env.MONGODB_URI);
uri.pathname = "/gaavli_demo_kalamb";
const env = {
  ...process.env,
  MONGODB_URI: uri.toString(),
  NODE_ENV: "development",
  OTP_PROVIDER: "test",
  OTP_TEST_CODE: "123456",
  MOBILE_AUTH_SECRET:
    process.env.MOBILE_AUTH_SECRET || randomBytes(32).toString("hex"),
};
if (process.argv[2] === "seed") {
  const result = spawnSync(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "scripts/seed-demo.mts",
      "--apply",
    ],
    { cwd: process.cwd(), env, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} else if (process.argv[2] === "server") {
  const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [next, "dev", "-p", "3000"], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
} else {
  throw new Error("Choose seed or server.");
}
