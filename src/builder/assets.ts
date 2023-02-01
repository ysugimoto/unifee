import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";
import sass from "sass";
import sharp from "sharp";
import { optimize } from "svgo";
import { log } from "../logger";

// JavaScript/TypeScript builds with esbuild
export async function buildScript(src: string): Promise<string> {
  const result = await esbuild.build({
    entryPoints: [src],
    write: false,
    format: "iife",
    bundle: true,
    minify: true,
  });

  return new TextDecoder().decode(result.outputFiles[0].contents);
}

// SCSS/CSS builds with dart-sass
export async function buildCSS(file: string): Promise<string> {
  const result = sass.compile(file, { style: "compressed" });
  return result.css;
}

// Build image with svgo or sharp
export async function buildImage(src: string): Promise<string> {
  if (!fs.existsSync(src)) {
    throw new Error(`Image ${src} is not found`);
  }

  const buffer = await fs.promises.readFile(src);
  let mime: string;
  let image: Buffer;
  switch (path.extname(src).toLowerCase()) {
    case ".svg":
      mime = "image/svg+xml";
      image = Buffer.from(
        optimize(buffer.toString("utf8"), { path: src }).data
      );
      break;
    case ".png":
      mime = "image/png";
      image = await sharp(buffer).png().toBuffer();
      break;
    case ".jpg":
    case ".jpeg":
      mime = "image/jpeg";
      image = await sharp(buffer).jpeg({ mozjpeg: true }).toBuffer();
      break;
    case ".gif":
      mime = "image/gif";
      image = await sharp(buffer).gif().toBuffer();
      break;
    default:
      throw new Error("Unsupported image");
  }

  // Output log is images are actually optimized
  if (buffer.byteLength > image.byteLength) {
    log(
      `${src} optimized: ${buffer.byteLength} bytes -> ${image.byteLength} bytes`
    );
  }

  return `data:${mime};base64,${image.toString("base64")}`;
}
