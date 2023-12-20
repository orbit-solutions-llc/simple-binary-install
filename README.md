# 🦀 `simple-binary-install`

A package to facilitate distributing gzipped binary tarballs (`.tar.gz` files). This package provides convenience functions for distributing theses binaries via npm and is likely best used as a **devDependency** in `package.json`.

## Goals
- To have a package with as few dependencies as possible that does the following:
  1. Downloads ***gzipped*** tarball
  1. Extracts tarball (stripping away the containing directory)
  1. Makes sure resulting file is executable
  1. Do it all securely

### Why create this?

After using `binary-install` (on which this is based) I ran an `npm audit` and found it depended on an old, vulnerabile `axios` version. After modifying the code to use a newer version of `axios` I thought, "Why use axios at all!?". Removing the `axios` dependency and switching to `fetch()` necessitated a new method of extracting the tar package. The [`tar-stream`](https://www.npmjs.com/package/tar-stream) package was chosen to fulfill that task.

## Installation

```shell
npm i --save-dev simple-binary-install
```
or
```shell
pnpm i -D simple-binary-install
```

## Usage
Usage is very similar to [binary-install](https://www.npmjs.com/package/binary-install)

### Intro Concepts

The `Binary` class allows downloading a tarball containing a binary and extracting it to a given location.

An example of its use is given below using an `install.js` file that looks like:

```javascript
#!/usr/bin/env node

import { Binary } from 'simple-binary-install'
let binary = new Binary('my-binary', 'https://example.com/binary/tar.gz')
binary.install()
```

If the install location of the binary needs to be modified, the third parameter can be a config object, used to change the `installDirectory`. e.g.

```javascript
#!/usr/bin/env node

import { Binary } from 'simple-binary-install'
let binary = new Binary('my-binary', 'https://example.com/binary/tar.gz', {installDirectory: 'new/location'})
binary.install()
```

> The [shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)) at the top of the file lets your shell know that this script should be run with the node runtime.

In your `package.json`, we would add the following:

```json
{
  ...
  "scripts": {
    "postinstall": "node ./install.js"
  }
  ...
}
```

One more change to your project would be needed before your package is ready to distribute. Make a `run.js` file that looks similar to this:

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

Then, we could use it as shown below in a local directory!

```shell
pnpm i && npx my-binary --version
1.0.0
```

## Maintenance

This project has been built for the needs of the [translocate](https://crates.io/crates/translocate) crate, but [PRs](https://code.orbitsolutions.dev/orb-it-solutions/simple-binary-install/pulls) to extend its functionality are welcome.

### Lints

[biome](https://biomejs.dev/) is used to lint and format the project's JS files. Before contributing changes please run the format command, e.g. `npm run format`.
