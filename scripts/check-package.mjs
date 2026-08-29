import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const projectRoot = resolve(import.meta.dirname, "..");
const executableExtension = process.platform === "win32" ? ".cmd" : "";
const packageJson = JSON.parse(
  await readFile(resolve(projectRoot, "package.json"), "utf8"),
);

const esmServer = await import("../dist/server/index.js");
const cjsServer = require("../dist/server/index.cjs");

for (const [format, entry] of [
  ["ESM", esmServer],
  ["CommonJS", cjsServer],
]) {
  if (typeof entry.createMetrikaServerClient !== "function") {
    throw new Error(`${format} server entry point is missing its public API`);
  }
}

const packDirectory = await mkdtemp(join(tmpdir(), "yandex-metrika-pack-"));

try {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error("npm_execpath is unavailable; run this check through npm");
  }

  const pack = spawnSync(
    process.execPath,
    [npmCli, "pack", "--ignore-scripts", "--pack-destination", packDirectory],
    {
      cwd: projectRoot,
      stdio: "inherit",
    },
  );

  if (pack.status !== 0) {
    throw new Error(`npm pack failed with exit code ${pack.status}`);
  }

  const filename = `${packageJson.name.replace(/^@/, "").replaceAll("/", "-")}-${
    packageJson.version
  }.tgz`;

  const attw = spawnSync(
    resolve(projectRoot, "node_modules", ".bin", `attw${executableExtension}`),
    ["--profile", "node16", join(packDirectory, filename)],
    { cwd: projectRoot, stdio: "inherit" },
  );

  if (attw.status !== 0) {
    throw new Error(`attw failed with exit code ${attw.status}`);
  }
} finally {
  await rm(packDirectory, { recursive: true, force: true });
}
