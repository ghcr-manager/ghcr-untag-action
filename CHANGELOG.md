# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.3] - 2026-05-30

### Added

- Optional `log-level` input with `warn`, `info`, and `debug` values. The default remains `info`.

### Changed

- Expand debug logging across the untag flow to cover owner resolution, page scanning, manifest fetch and publish
  requests, temporary version lookup polling, and cleanup steps.

## [1.0.2] - 2026-05-30

### Changed

- Resolve requested source tags through GHCR manifest lookups instead of scanning GitHub package-version pages to find
  the original tagged manifest.
- Keep GitHub package-version paging only for locating and deleting the temporary detached copy created during
  untagging.
- Print a normal stack trace on action failures while keeping the failing request URL in leaf HTTP error messages.

### Fixed

- Reject `sha256:...` manifest digest references in the `tags` input early; this action rejects them and only removes
  regular tags.

## [1.0.1] - 2026-05-29

### Added

- Dependabot configuration for weekly GitHub Actions and npm dependency updates.

### Changed

- Updated `docker/login-action` from `v4.1.0` to `v4.2.0` in the live test scenario setup workflow.
- Excluded `.github/workflows/test_live-untag.yml` from the immutable-actions CI check because that workflow runs the
  locally built action from this repository.

## [1.0.0] - 2026-05-28

### Added

- First stable release of `ghcr-manager/ghcr-untag-action`.
- Remove one or more tags from a GHCR container package while leaving the underlying manifest in place for any tags that
  should continue to reference it.
- Inputs for `token`, `owner`, `package`, and newline-separated `tags`.
- Support for both user-owned and organization-owned packages.
- Automatic handling for the temporary manifest copy and cleanup workflow required to emulate tag removal in GHCR.
- Unit tests covering configuration parsing, HTTP helpers, registry operations, manifest detaching, owner resolution,
  package version lookup, polling, and the end-to-end untag flow.
- Live GHCR test workflows covering multiple manifest scenarios, including image manifests, single-platform indexes, and
  artifact manifests, for both single-tag and multi-tag untag operations.
- Release automation that validates release tags, rebuilds the bundled action, creates detached immutable release tags,
  and publishes GitHub releases.
- Project documentation covering usage, token requirements, implementation notes, and live test package setup.

### Constraints

- Documented and enforced the GHCR limitation that the last remaining tag on a package cannot be removed by this action.
