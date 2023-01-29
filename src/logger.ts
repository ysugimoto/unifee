function green(message: string): string {
  return `\x1b[32m${message}\x1b[0m`;
}
function yellow(message: string): string {
  return `\x1b[33m${message}\x1b[0m`;
}
function red(message: string): string {
  return `\x1b[31m${message}\x1b[0m`;
}

const prefix = green("[unifee] ");

export function log(message: string) {
  process.stderr.write(`${prefix}${message}\n`);
}

export function info(message: string) {
  process.stderr.write(`${prefix}${green(message)}\n`);
}

export function warn(message: string) {
  process.stderr.write(`${prefix}${yellow(message)}\n`);
}

export function error(message: string) {
  process.stderr.write(`${prefix}${red(message)}\n`);
}
