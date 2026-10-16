import { spawn } from "node:child_process";

// Reuse the invoking npm CLI. A legacy npm on an ancestor PATH must not hijack
// nested workspace commands (older npm versions ignore workspace arguments).
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run workspace commands through npm run.");
const child = spawn(process.execPath, [npmCli, ...process.argv.slice(2)], {
  stdio: "inherit",
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
