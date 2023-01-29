import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { error, info } from "../logger";

export type BuildCommand = {
  js?: string;
  css?: string;
}

type PackageJsonScripts = Record<string, string>;

export async function findBuildCommand(dir: string): Promise<BuildCommand> {
  const pkgJsonPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgJsonPath)) {
    return {};
  }

  const cmd: BuildCommand = {};
  try {
    const pkgJson: { scripts?: PackageJsonScripts } = JSON.parse(await fs.promises.readFile(pkgJsonPath, "utf8"));
    if (!pkgJson.scripts) {
      return cmd;
    }
    if (pkgJson.scripts["unifee:js"]) {
      cmd.js = pkgJson.scripts["unifee:js"];
    }
    if (pkgJson.scripts["unifee:css"]) {
      cmd.css = pkgJson.scripts["unifee:css"];
    }
    return cmd;
  } catch (err) {
    return {};
  }
}

type BuildArgs = {
  command: "npm" | "yarn";
  cwd: string;
  build: string;
}

export async function runBuild({ command, cwd, build }: BuildArgs): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, ["run", build], { cwd, timeout: 10000 });
    proc.on("close", (code) => {
      if (code === 0) {
        info(`${build} command succeeded`);
        resolve();
        return;
      }
      error(`${build} command closed with error code ${code}`);
      reject();
    });
    proc.on("error", (err) => {
      error(`${build} command error: ${err}`);
      reject();
    });
  });
}
