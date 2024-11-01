# 🦀 `simple-binary-install`

`simple-binary-install` makes it easy to distribute (specifically) gzipped binary tarballs (aka `.tar.gz` files).
This [jsr hosted package](https://jsr.io/@orb/simple-binary-install) provides convenience functions for distributing binaries.
Version 1.0.0 will also be [released to npm](https://www.npmjs.com/package/simple-binary-install).

If used in a project with a `package.json` file, it is likely best used as a **devDependency**.

## Goals
- To have a package with the minimum number of dependencies that securely:
  1. Downloads a ***gzipped*** tarball
  1. Extracts the tarball (while stripping away the containing directory)
  1. Makes sure resulting file is executable

### Why create this?

This package is based on the `binary-install` [npm package](https://www.npmjs.com/package/binary-install).
An `npm audit` of that package revealed dependedencies on old, vulnerable `axios` versions. After updating to a newer version
of `axios` I asked, "Why use axios at all!?".

Removing `axios` and switching to `fetch()` necessitated a new method of extracting tar files, so the
[`tar-stream`](https://www.npmjs.com/package/tar-stream) package was chosen to fulfill that role.

## Installation

### deno project
```shell
deno add jsr:@orb/simple-binary-install
```

### npm project
```shell
npx jsr add @orb/simple-binary-install
```

### pnpm project
```shell
pnpm dlx jsr add @orb/simple-binary-install
```

## Usage

### Intro Concepts

The `Binary` class allows downloading a tarball and extracting it to a given location.

An example of its use is given below using an `install.js` file that looks like:

```javascript
import { Binary } from '@orb/simple-binary-install'
let binary = new Binary('binary-name', 'https://example.com/binary/tar.gz')
binary.install()
```

Or, if a custom install path is needed, the third parameter is a config object that can change that. e.g.

```javascript
import { Binary } from '@orb/simple-binary-install'
let binary = new Binary('binary-name', 'https://example.com/binary/tar.gz', { installDirectory: '/path/to/new/location' })
binary.install()
```

In your `deno.json`, you would add the following:

```json
{
  "tasks": {
    "install": "deno --allow-read --allow-write --allow-net install.js"
  }
}
```

In your `package.json`, you would add the following:

```json
{
  "scripts": {
    "postinstall": "node ./install.js"
  }
}
```

One more change to your project would be needed before your package is ready to distribute. Make a `run.js` file that looks similar to this:

```javascript

import { Binary } from '@orb/simple-binary-install'
let binary = new Binary('my-binary', 'https://example.com/binary/tar.gz')
binary.run()
```

And then in your `package.json`, add the following:

```json
{
  ...
  "bin": {
    "binary-name": "run.js"
  }
  ...
}
```

Then, we could use it as shown below in a local directory!

```shell
pnpm i && npx my-binary --version
1.0.0
```

## Maintenance

This project has been created for the needs of the [translocate](https://crates.io/crates/translocate) crate, but [PRs](https://code.orbitsolutions.dev/orb-it-solutions/simple-binary-install/pulls) to extend its functionality are welcome.
