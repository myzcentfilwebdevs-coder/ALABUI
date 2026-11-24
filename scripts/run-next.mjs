import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const mode = (process.argv[2] || "local").toLowerCase();

const ENV_MAP = {
  local: {
    NEXT_PUBLIC_API_ENV: "local",
    NEXT_PUBLIC_API_URL: "http://localhost:4000",
    label: "LOCAL BACKEND (http://localhost:4000)",
  },
  main: {
    NEXT_PUBLIC_API_ENV: "main",
    NEXT_PUBLIC_API_URL: "https://alabfc.onrender.com",
    label: "RENDER BACKEND (https://alabfc.onrender.com)",
  },
};

const selected = ENV_MAP[mode] || ENV_MAP.local;

const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const extraArgs = process.argv.slice(3);

const child = spawn(process.execPath, [nextBin, "dev", ...extraArgs], {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_API_ENV: selected.NEXT_PUBLIC_API_ENV,
    NEXT_PUBLIC_API_URL: selected.NEXT_PUBLIC_API_URL,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
