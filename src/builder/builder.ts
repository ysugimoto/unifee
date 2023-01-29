import fs from "node:fs";
import path from "node:path";
import EventEmitter from "node:events";
import { randomUUID } from "node:crypto";
import cheerio from "cheerio";
import chokidar from "chokidar";
import { minify } from "html-minifier";
import { buildScript } from "./build-script";
import { buildCSS } from "./build-css";
import { buildImage } from "./build-image";
import { log } from "../logger";
import { findBuildCommand, runBuild, type BuildCommand } from "./command";

export type BuildOption = {
  server: boolean;
  output: string;
  yarn: boolean;
  watch: boolean;
};

const hotreload = `
<script>
(function() {
  var w = new WebSocket("ws://" + location.host + "/__hotreload");
  w.onmessage = function(message) { location.reload(); };
})();
</script>
`;

type BuilderArgs = {
  src: string;
  event: EventEmitter;
  options: BuildOption;
  target: string;
}

export function builder(args: BuilderArgs): Builder {
  return Builder.create(args);
}

export class Builder {
  private file: string;
  private options: BuildOption;
  private command: Promise<BuildCommand>;
  private target: string;
  public html: string = "";

  constructor(src: string, target: string, options: BuildOption) {
    this.file = src;
    this.target = target;
    this.options = options;
    this.command = findBuildCommand(path.dirname(src));
  }

  public static create({ src, event, options, target }: BuilderArgs): Builder {
    const builder = new Builder(src, target, options);
    builder.build();
    if (options.watch) {
      builder.watch(event);
    }
    return builder;
  }

  public match(pathname: string): boolean {
    return pathname === `/${path.basename(this.file)}`;
  }

  private getPath(src: string): string {
    return path.join(path.dirname(this.file), src);
  }

  private async buildProject(command: BuildCommand): Promise<unknown> {
    const cwd = path.dirname(this.file);

    const procs: Array<Promise<void>> = [];
    if (command.js) {
      procs.push(runBuild({
        command: this.options.yarn ? "yarn" : "npm",
        cwd,
        build: command.js,
      }));
    }
    if (command.css) {
      procs.push(runBuild({
        command: this.options.yarn ? "yarn" : "npm",
        cwd,
        build: command.css,
      }));
    }

    return Promise.all(procs);
  }

  public async build() {
    const start = Date.now();
    const $ = cheerio.load(await fs.promises.readFile(this.file), { decodeEntities: true });

    const command = await this.command;
    await this.buildProject(command);

    for (const script of $("script")) {
      const src = $(script).attr("src");
      if (src && !/^https?:\/\//.test(src)) {
        const inline = (command.js)
          ? await fs.promises.readFile(this.getPath(src))
          : await buildScript(this.getPath(src));
        $(script).replaceWith(`<script>${inline}</script>`);
      }
    }

    for (const link of $("link")) {
      if ($(link).attr("rel")?.toLowerCase() === "stylesheet") {
        const href = $(link).attr("href");
        if (href && !/^https?:\/\//.test(href)) {
          const inline = (command.css)
            ? await fs.promises.readFile(this.getPath(href))
            : await buildCSS(this.getPath(href));
          $(link).replaceWith(`<style>${inline}</style>`);
        }
      }
    }

    for (const img of $("img")) {
      const src = $(img).attr("src");
      if (src && !/^https?:\/\//.test(src)) {
        const i = await buildImage(this.getPath(src));
        $(img).attr("src", i);
      }
    }

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

  public watch(event: EventEmitter) {
    const id = randomUUID();
    const dir = path.dirname(this.file);

    event.on(`assets:${id}`, async () => {
      log(`Related asset of ${path.basename(this.file)} is changed, rebuild`);
      await this.build();
      event.emit("hotreload");
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
    const dest = path.resolve(process.cwd(), this.options.output || this.target);

    try {
      await fs.promises.stat(dest);
    } catch (err) {
      await fs.promises.mkdir(dest, { recursive: true, mode: 0o755 });
    }

    return fs.promises.writeFile(
      path.join(dest, path.basename(this.file)),
      this.html,
      "utf8",
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

