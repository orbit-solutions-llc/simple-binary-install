# 🦀 `simple-binary-install`

Utility to facilitate distributing gzipped binary tarballs.

This package is published to npm as [`simple-binary-install`](https://npmjs.com/package/simple-binary-install) and provides convenience functions for distributing binaries via npm. It is intended to be used for rust projects which are being wrapped as npm packages.

## Maintenance

This project has been built for the needs of [translocate](https://crates.io/crates/translocate), but PRs are welcome if you wish to extend this version for your needs.


### Lints

We use [biome](https://biomejs.dev/) to format the JS in this package. CI will run `npm run fmt:check` to make sure everything is in line. Before pushing up changes on a branch, you should make sure to run `npm run fmt` from the root of the repository to make sure that this check does not fail.
