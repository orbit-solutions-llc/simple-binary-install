# 🦀 `simple-binary-install`

Utility to facilitate distributing gzipped binary tarballs.

This package is published to npm as [`simple-binary-install`](https://npmjs.com/package/simple-binary-install) and provides convenience functions for distributing binaries via npm. It is intended to be used for rust projects which are being wrapped as npm packages.

## Maintenance

This project has been built for the needs of [translocate](https://crates.io/crates/translocate), but PRs are welcome if you wish to extend this version for your needs.

### Lints

[biome](https://biomejs.dev/) will be used to lint and format the project's files. Before contributing changes please run the format command, e.g. `npm run format`.

## But Why?

After initially using `binary-install` and running an npm audit I noticed it had a vulnerability because it was using a very old version of axios. I updated the code to use a newer version of axios and then thought, "Why use axios at all?".

After removing the axios dependency and switching to `fetch()` for downloads to tar package did not play nicely with the node streaming APIs in use and I tried a new tar package, which is how `tar-stream` became the sole dependency.

Ultimately I'd like to have no external dependencies, but that's probably a few months away.

## Goals
- To have one simple package, with a few dependencies as possible that does that task that is needed.
  What is that task?
  1. Download a gzipped tarball (`.tar.gz` file)
  1. Ungzip tarball
  1. Extract tarball, stripping away the containing directory
  1. Make sure resulting file is executable
  1. Do it all securely.
