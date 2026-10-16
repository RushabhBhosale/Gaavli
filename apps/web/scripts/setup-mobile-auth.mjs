import { readFile, appendFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const file = new URL("../.env.local", import.meta.url);
const content = await readFile(file, "utf8").catch((error) => {
  if (error.code === "ENOENT") return "";
  throw error;
});
const defaults = {
  OTP_PROVIDER: "test",
  OTP_TEST_CODE: "123456",
  MOBILE_AUTH_SECRET: randomBytes(32).toString("hex"),
  MOBILE_TRUST_PROXY: "false",
};
const missing = Object.entries(defaults).filter(
  ([key]) => !new RegExp(`^${key}=`, "m").test(content),
);
if (missing.length)
  await appendFile(
    file,
    `\n# Local mobile test authentication; never use for public launch.\n${missing.map(([key, value]) => `${key}=${value}`).join("\n")}\n`,
  );
console.log(
  "Local mobile authentication configuration is ready. Existing values were preserved. Restart Next.js to load changes.",
);
