# Web Wrapper Vendor Files

This directory contains browser-ready third-party JavaScript used by the static
web wrapper.

## `ethers.umd.min.js`

- Package: `ethers`
- Vendored version: `6.16.0`
- Source used for this copy:
  `../evanopolis-deliverable/apps/web-wrapper/node_modules/ethers/dist/ethers.umd.min.js`
- Upstream project: <https://github.com/ethers-io/ethers.js>
- npm package: <https://www.npmjs.com/package/ethers>
- License: MIT
- SHA-256:
  `9a85a5aa81305f85e6546452fd2093a8a68932bed3cec4f6491e4d031a90bc95`

The wrapper uses `ethers` for:

- ABI encoding `approve(...)` and `play(...)` contract calls.
- Computing `keccak256("evanopolis:v1:" + game_id)`.

The wrapper is currently a plain static site without a package manifest or
bundler, so a browser UMD build is vendored instead of installed through npm.
Do not update this file casually. Treat updates as intentional dependency
maintenance: check upstream release notes, replace the file from a trusted npm
package install, update the version and checksum here, and re-test payment
encoding.

As of 2026-09-14, npm lists `ethers` `6.17.0` as the latest release. The
vendored `6.16.0` build is close to current and sufficient for the wrapper
helpers used here; updating can wait until we deliberately do dependency
maintenance or move the wrapper to a bundled npm app.
