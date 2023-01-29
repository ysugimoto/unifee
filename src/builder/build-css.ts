import sass from "sass";

export async function buildCSS(file: string): Promise<string> {
  const result = sass.compile(file, { style: "compressed" });
  return result.css;
}
