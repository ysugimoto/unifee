import EventEmitter from "node:events";

// BuildOption is type for CLI options
export type BuildOption = {
  server: boolean;
  output: string;
  yarn: boolean;
  watch: boolean;
};

// BuilderArgs is type for builder creation
export type BuilderArgs = {
  src: string;
  event: EventEmitter;
  options: BuildOption;
  target: string;
};

// BuildCommand is type for project specific build commands
export type BuildCommand = {
  js?: string;
  css?: string;
};

// BuildArgs is type for project specific command build args, use for child_process.spawn
export type BuildArgs = {
  command: "npm" | "yarn";
  cwd: string;
  build: string;
};
