import fs from "node:fs";
import path from "node:path";
import EventEmitter from "node:events";
import { randomUUID } from "node:crypto";
import cheerio from "cheerio";
import chokidar from "chokidar";
import { minify } from "html-minifier";
import { buildScript, buildCSS, buildImage } from "./assets";
import { log, error } from "../logger";
import { findBuildCommand, runBuild } from "./command";
import type { BuildOption, BuildCommand, BuilderArgs } from "./types";

// hot reload script, inject to build HTML is server mode is enabled
const hotreload = `
<script>
(function() {
  var w = new WebSocket("ws://" + location.host + "/__hotreload");
  w.onmessage = function(message) { location.reload(); };
})();
</script>
`;

export async function builder(args: BuilderArgs): Promise<Builder> {
  return Builder.create(args);
}

// Main builder class, manage assets build
export class Builder {
  // Source HTML file path
  // @private
  private file: string;

  // CLI options
  // @private
  private options: BuildOption;

  // Project specific build commans
  // @private
  private command: Promise<BuildCommand>;

  // Target directory
  // @private
  private target: string;

  // Build HTML buffer
  // @public
  public html = "";

  constructor(src: string, target: string, options: BuildOption) {
    this.file = src;
    this.target = target;
    this.options = options;
    this.command = findBuildCommand(path.dirname(src));
  }

  public static async create({
    src,
    event,
    options,
    target,
  }: BuilderArgs): Promise<Builder> {
    const builder = new Builder(src, target, options);

    try {
      await builder.build();
    } catch (err) {
      error(`Failed to build: ${err}`);
      builder.html = err instanceof Error ? err.message : `${err}`;
    }

    // If '-w' or '-s' cli option is provided, watch changes
    if (options.watch || options.server) {
      builder.watch(event);
    }

    return builder;
  }

  // match, requested url is matched to source file name
  // @public
  public match(pathname: string): boolean {
    return pathname === `/${path.basename(this.file)}`;
  }

  // Get asset path, relative to source file
  // @private
  private getPath(src: string): string {
    return path.join(path.dirname(this.file), src);
  }

  // Project specific build if needs
  // @private
  private async buildProject(command: BuildCommand): Promise<unknown> {
    const cwd = path.join(process.cwd(), this.target);

    const procs: Array<Promise<void>> = [];
    if (command.js) {
      // unifee:js
      procs.push(
        runBuild({
          command: this.options.yarn ? "yarn" : "npm",
          cwd,
          build: command.js,
        })
      );
    }
    if (command.css) {
      // unifee:css
      procs.push(
        runBuild({
          command: this.options.yarn ? "yarn" : "npm",
          cwd,
          build: command.css,
        })
      );
    }

    return Promise.all(procs);
  }

  // Build HTML file
  // @public
  public async build() {
    const start = Date.now();
    const $ = cheerio.load(await fs.promises.readFile(this.file), {
      decodeEntities: true,
    });

    // If project specific build commands are found, run them
    const command = await this.command;
    await this.buildProject(command);

    for (const script of $("script")) {
      const src = $(script).attr("src");
      if (src && !/^https?:\/\//.test(src)) {
        const inline = command.js
          ? await fs.promises.readFile(this.getPath(src))
          : await buildScript(this.getPath(src));
        $(script).replaceWith(`<script>${inline}</script>`);
      }
    }

    for (const link of $("link")) {
      if ($(link).attr("rel")?.toLowerCase() === "stylesheet") {
        const href = $(link).attr("href");
        if (href && !/^https?:\/\//.test(href)) {
          const inline = command.css
            ? await fs.promises.readFile(this.getPath(href))
            : await buildCSS(this.getPath(href));
          $(link).replaceWith(`<style>${inline}</style>`);
        }
      }
    }

    // Image optimization sould be run asynchronousely
    const imagePromises: Array<Promise<void>> = [];
    for (const img of $("img")) {
      const src = $(img).attr("src");
      if (src && !/^https?:\/\//.test(src)) {
        imagePromises.push(
          buildImage(this.getPath(src)).then((buffer) => {
            $(img).attr("src", buffer);
          })
        );
      }
    }
    await Promise.all(imagePromises);

    // When server option is enabled, inject hot reload script
    if (this.options.server) {
      const head = $("head");
      if (head.length > 0) {
        head.append(hotreload);
      } else {
        $("body").append(hotreload);
      }
    }

    this.html = minify($.html(), {
      collapseWhitespace: true,
      minifyCSS: true,
    });

    log(`${this.file} built in ${Date.now() - start}ms`);

    if (!this.options.server) {
      await this.output();
    }
  }

  // Watch and rebuild source file
  public watch(event: EventEmitter) {
    const id = randomUUID();
    const dir = path.dirname(this.file);

    event.on(`assets:${id}`, async () => {
      log(`Related asset of ${path.basename(this.file)} is changed, rebuild`);
      try {
        await this.build();
        event.emit("hotreload");
      } catch (err) {
        error(`Failed to build: ${err}`);
      }
    });

    const watcher = chokidar.watch(dir, { persistent: true });
    watcher.on("change", (file) => {
      const ext = path.extname(file).toLowerCase();
      if (watchExtensions.includes(ext)) {
        event.emit(`assets:${id}`);
      }
    });
  }

  private async output(): Promise<void> {
    const dest = path.resolve(
      process.cwd(),
      this.options.output || this.target
    );

    try {
      await fs.promises.stat(dest);
    } catch (err) {
      await fs.promises.mkdir(dest, { recursive: true, mode: 0o755 });
    }

    return fs.promises.writeFile(
      path.join(dest, path.basename(this.file)),
      this.html,
      "utf8"
    );
  }
}

const watchExtensions = [
  ".ts",
  ".js",
  ".css",
  ".scss",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".html",
  // Currently React related file does not support.
  // ".jsx",
  // ".tsx",
];
