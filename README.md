# unifee

unifee is Edge friendly bundler, all assets bundle into a single HTML.

## Motivation

Since Edge Computing Platforms (e.g Cloudflare Workers, Fastly Compute@Edge, etc...) are prepared for production use, occasinally we want to server static contents on the Edge, without origin server.

To server them, it's annoying to route static assets for each paths. It occurs multiple HTTP requests and needs to bundle for each assets into runtime binary (WASM). We'd like to server more simply so we developed easy bundle tool that bundles optimized all assets into single HTML file, we dont' need to think about asset routing and also caching at the Edge for single endpoint.

unifee provides underlying features for development, local server, JavaScript (TypeScript) and CSS compiling, image optimization.

## Installation

Install via npmjs.org with your favorite package manager:

```shell
$ npm install unifee
```

```shell
$ yarn add unifee
```

## Usage

unifee is cli tool so you can run it on npm package scripts.

```shell
Usage: unifee [options] <directory>

Unify assets into single HTML file

Arguments:
  directory                 build source directory

Options:
  -V, --version             output the version number
  -o, --output <directory>  output target directory
  -s, --server              run dev server and watch changes (default: false)
  -w, --watch               watch source file change
  --yarn                    use yarn instead of npm on project build (default: false)
  -h, --help                display help for command
```

unifee supports to bundle TypeScript and SCSS, describe following.

### Basic usage

```html
<!doctype html>
<html>
  <head>
    ...
    <link rel="stylesheet" href="./styles.scss">
  </head>
  <body>
    ...
    <img src="./image.png">
    <script src="./script.ts"></script>
  </body>
</html>
```

On above HTML:

1. Find "./styles.scss" and compile from SCSS to CSS, replace `<link>` into `<style>` as inline
2. Find "./image.png" and optimize image, replace `src` attribute value as base64-encoded data-uri
3. Find "./script.ts" and compile from TypeScript to JavaScript, append built script as inline

Finally you will get single HTML file.
See [example/basic](https://github.com/ysugimoto/unifee/tree/main/example/basic) in detail.

### Build yourself

Almost project has your own build system (e.g tailwindcss for CSS, webpack or swc for TypeScript) then unifee also support them.
in project directory, you can define unifee spefic npm scripts like:

| script name | how it works                          |
|:------------|:--------------------------------------|
| unifee:js   | Build JavaScript for your project way |
| unifee:css  | Build CSS for your project way        |

If unifee finds above scripts in project directory, use it instead of unifee internal build process.
See [example/project](https://github.com/ysugimoto/unifee/tree/main/example/project) in detail.

```
Note that if you have own build scripts, make sure the build artifact is referenced from entry HTML file.
```

## CLI commands

We show some examples following.


### Simple bundle

```shell
$ npx unifee -o dist ./src
```

Find HTML files into `src`, bundles into single file and output to `dist` directory.

### Local server, hot-reload

```shell
$ npx unifee ./src -s
```

Find HTML files into `src`, bundles into single file and serve from http://localhost:4001 with hot reloading.

### Watch mode

```shell
$ npx unifee ./src -w
```

Find HTML files into `src`, bundles into single file with watching file changes.
