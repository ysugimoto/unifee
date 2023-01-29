import fs from "node:fs";
import path from "node:path";

export async function buildImage(src: string): Promise<string> {
  if (!fs.existsSync(src)) {
    throw new Error(`Image ${src} is not found`);
  }

  const buffer = await fs.promises.readFile(src);
  let mime: string;
  switch (path.extname(src).toLowerCase()) {
  case ".png":
      mime = "image/png";
      break;
  case ".jpg":
  case ".jpeg":
      mime = "image/jpeg";
      break;
  case ".gif":
      mime = "image/gif";
      break;
  default:
      throw new Error("Unsupported image");
  }

  if (Buffer.isBuffer(buffer)) {
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } else {
    return `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
  }
}
