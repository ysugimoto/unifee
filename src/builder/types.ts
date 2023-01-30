import EventEmitter from "node:events";

export type BuildOption = {
  server: boolean;
  output: string;
  yarn: boolean;
  watch: boolean;
};

export type BuilderArgs = {
  src: string;
  event: EventEmitter;
  options: BuildOption;
  target: string;
};

export type BuildCommand = {
  js?: string;
  css?: string;
};

export type BuildArgs = {
  command: "npm" | "yarn";
  cwd: string;
  build: string;
};
