# 🦀 `simple-binary-install`

A package to facilitate distributing gzipped binary tarballs (`.tar.gz` files). This package provides convenience functions for distributing theses binaries via npm and is intended to be used as a `devDependency`.

## Goals
- To have a package, with as few dependencies as possible that does the following:
  1. Download a gzipped tarball
  1. Ungzip tarball
  1. Extract tarball, and strip away the containing directory
  1. Make sure resulting file is executable
  1. Do it all securely.

### Why create this?

After using `binary-install` (on which this is based) I ran an `npm audit` and found it depended on an old, vulnerabile `axios` version. After modifying the code to use a newer version of `axios` I thought, "Why use axios at all!?". Removing the `axios` dependency and switching to `fetch()` necessitated a new method of extracting the tar package. This is why `tar-stream` was added as an optional dependency. If `tar-stream` is not found, native `tar` (provided by the operating system) will be used, or an error will be thrown.

## Installation
This package has an optional dependency on the [`tar-stream`](https://www.npmjs.com/package/tar-stream) node package. If you do a normal package install as shown in the example below, you will be using the bundled tar-stream package.

Bundled tar mode:
```shell
npm i --save-dev
```
or
```shell
pnpm i --dev
```

If you would like to use the your platform's native tar binary, use the following commands for installation.

Native tar mode:
```shell
npm i --save-dev --omit optional
```
or
```shell
pnpm i --dev --no-optional
```

## Ussage
Usage is very similar to [binary-install](https://www.npmjs.com/package/binary-install)

### Intro Concepts

The `Binary` class allows downloading a tarball containing a binary and extracting it to a given location.

An example of using it would be to create an `install.js` file that looks similar to this:

```javascript
#!/usr/bin/env node

import { Binary } from 'simple-binary-install'
let binary = new Binary('my-binary', 'https://example.com/binary/tar.gz')
binary.install()
```

> The [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)) at the top of the file lets your shell know that this script should be run with the node runtime.

In your `package.json`, you would add the following:

```json
{
  ...
  "scripts": {
    "postinstall": "node ./install.js"
  }
  ...
}
```

Then, things like this would just work in your local directory!

```shell
pnpm i && npx my-binary --version
1.0.0
```

You need one more thing before your package is ready to distribute. Make a `run.js` file that looks like this:

```javascript
#!/usr/bin/env node

import { Binary } from 'simple-binary-install'
let binary = new Binary('my-binary', 'https://example.com/binary/tar.gz')
binary.run()
```

And then in your `package.json`, add the following:

```json
{
  ...
  "bin": {
    "my-binary": "run.js"
  }
  ...
}
```

## Maintenance

This project has been built for the needs of the [translocate](https://crates.io/crates/translocate) crate, but [PRs](https://code.orbitsolutions.dev/orb-it-solutions/simple-binary-install/pulls) to extend its functionality are welcome.

### Lints

[biome](https://biomejs.dev/) is used to lint and format the project's JS files. Before contributing changes please run the format command, e.g. `npm run format`.
