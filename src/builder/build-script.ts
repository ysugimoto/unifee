import * as esbuild from "esbuild";

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
