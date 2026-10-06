# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-10-06

### Added
- Initial release of **Node Project Doctor** audit CLI and library.
- Diagnostic rules for `engines.node` runtime mismatches.
- Detection of multiple conflicting lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`).
- Detection of dev-only packages placed inside production `dependencies`.
- Detection of wildcard/unpinned dependency versions (`*`, `latest`).
- Audit checks for essential package metadata and `.gitignore` hygiene.
- Programmatic API and CLI executable with `--json` and `--fail-on-error`.
