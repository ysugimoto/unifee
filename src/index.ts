import fs from "node:fs";
import path from "node:path";
import EventEmitter from "node:events";
import { Command } from "commander";
import { builder, type BuildOption } from "./builder";
import { server } from "./server";
import { log, error } from "./logger";
import glob from "glob";

async function main(target: string, options: BuildOption) {
  const event = new EventEmitter();
  try {
    const stat = await fs.promises.stat(target);
    if (!stat.isDirectory()) {
      throw new Error(`Build target "${target}" must be directory`);
    }
    const sources = glob.sync(`${target}/**/*.html`, {
      ignore: ["node_modules/*"],
      dot: true,
    });
    const builders = await Promise.all(
      sources.map(async (src) => builder({ src, event, options, target }))
    );

    if (options.server) {
      server(builders, event);
    } else if (options.watch) {
      log("Start watching files...");
    }
  } catch (err) {
    error(`${err}`);
    process.exit(1);
  }
}

(async () => {
  const pkg = JSON.parse(
    await fs.promises.readFile(path.join(__dirname, "../package.json"), "utf8")
  );
  const program = new Command();

  program
    .name("unifee")
    .description("Unify assets into single HTML file")
    .version(pkg.version)
    .argument("<directory>", "build source directory")
    .option("-o, --output <directory>", "output target directory")
    .option("-s, --server", "run dev server and watch changes", false)
    .option("-w, --watch", "watch source file change")
    .option("--yarn", "use yarn instead of npm on project build", false)
    .parse();

  const target = program.args[0];
  const options = program.opts<BuildOption>();
  await main(target, options);
})();
