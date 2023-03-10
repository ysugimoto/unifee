import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { error, info, log } from "../logger";
import type { BuildCommand, BuildArgs } from "./types";

type PackageJsonScripts = Record<string, string>;

// project specific npm script name in package.json
const projectJSBuildScriptName = "unifee:js";
const projectCSSBuildScriptName = "unifee:css";

export async function findBuildCommand(dir: string): Promise<BuildCommand> {
  const pkgJsonPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgJsonPath)) {
    return {};
  }

  const cmd: BuildCommand = {};
  try {
    const pkgJson: { scripts?: PackageJsonScripts } = JSON.parse(
      await fs.promises.readFile(pkgJsonPath, "utf8")
    );
    if (!pkgJson.scripts) {
      return cmd;
    }
    if (pkgJson.scripts[projectJSBuildScriptName]) {
      cmd.js = projectJSBuildScriptName;
    }
    if (pkgJson.scripts[projectCSSBuildScriptName]) {
      cmd.css = projectCSSBuildScriptName;
    }
  } catch (err) {
    // preventing error because this error will not affect to main build process
  }
  return cmd;
}

// Run project specific build script
export async function runBuild({
  command,
  cwd,
  build,
}: BuildArgs): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, ["run", build], { cwd, timeout: 10000 });
    proc.on("close", (code) => {
      if (code === 0) {
        info(`${build} command succeeded`);
        resolve();
        return;
      }
      error(`${build} command closed with error code ${code}`);
      reject(`${build} command closed with error code ${code}`);
    });
    proc.stderr.on("data", (chunk) => {
      chunk
        .toString("utf8")
        .replace(/\r?\n$/, "")
        .split(/\r?\n/g)
        .forEach(log);
    });
    proc.stdout.on("data", (chunk) => {
      chunk
        .toString("utf8")
        .replace(/\r?\n$/, "")
        .split(/\r?\n/g)
        .forEach(log);
    });
    proc.on("error", (err) => {
      error(`${build} command error: ${err}`);
      reject(err);
    });
  });
}
