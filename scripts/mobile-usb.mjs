import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const roots = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Android", "Sdk"),
].filter(Boolean);
const executable = process.platform === "win32" ? "adb.exe" : "adb";
const adb =
  roots
    .map((root) => join(root, "platform-tools", executable))
    .find(existsSync) || executable;
const target = process.env.ANDROID_SERIAL
  ? ["-s", process.env.ANDROID_SERIAL]
  : [];

function run(args) {
  const result = spawnSync(adb, [...target, ...args], {
    encoding: "utf8",
    timeout: 15000,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        "adb failed. Connect and unlock your phone, accept USB debugging, and select ANDROID_SERIAL if multiple devices are connected.",
    );
  }
  return result.stdout.trim();
}

try {
  // Android loses these mappings on device/server restart or USB reconnection.
  run(["reverse", "tcp:3000", "tcp:3000"]);
  run(["reverse", "tcp:8081", "tcp:8081"]);
  const mappings = run(["reverse", "--list"]);
  if (
    !mappings.includes("tcp:3000 tcp:3000") ||
    !mappings.includes("tcp:8081 tcp:8081")
  )
    throw new Error("USB forwarding verification failed.");
  console.log("USB forwarding ready: API 3000 and Metro 8081.");
  const response = await fetch("http://127.0.0.1:3000/api/v1/health", {
    signal: AbortSignal.timeout(10000),
  });
  const payload = await response.json();
  if (!response.ok || payload.success !== true || payload.data?.status !== "ok")
    throw new Error(
      "API health check failed. Start the backend with npm run dev:web and run this command again.",
    );
  console.log("API health: PASS. Mobile USB URL: http://localhost:3000/api/v1");
  if (process.argv.includes("--start")) {
    const npmCli = process.env.npm_execpath;
    if (!npmCli) throw new Error("Use npm run dev:mobile:usb to start Metro.");
    const child = spawn(
      process.execPath,
      [npmCli, "run", "start", "--workspace=@gaavli/mobile", "--", "--lan"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000/api/v1",
          // Bind both IP families; Windows localhost may resolve to IPv6 only,
          // while adb reverse connects to Metro over IPv4.
          REACT_NATIVE_PACKAGER_HOSTNAME: "127.0.0.1",
        },
      },
    );
    child.on("error", () => {
      console.error("Could not start Metro.");
      process.exitCode = 1;
    });
    child.on("exit", (code) => {
      process.exitCode = code ?? 1;
    });
  }
} catch (error) {
  console.error(
    error instanceof Error && error.name === "Error"
      ? error.message
      : "API connection failed. Keep the backend running with npm run dev:web.",
  );
  process.exitCode = 1;
}
