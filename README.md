# GHCR Untag Action

[![GitHub Marketplace](https://img.shields.io/badge/marketplace-ghcr--untag--action-blue?logo=github&labelColor=333&style=flat-square)](https://github.com/marketplace/actions/ghcr-untag-action)
[![Release](https://img.shields.io/github/v/release/ghcr-manager/ghcr-untag-action?style=flat-square)](https://github.com/ghcr-manager/ghcr-untag-action/releases)
[![Immutable Releases](https://img.shields.io/badge/releases-immutable-blue?labelColor=333)](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases)
[![Tests](https://img.shields.io/github/actions/workflow/status/ghcr-manager/ghcr-untag-action/.github/workflows/ci_unit-test-lint.yml?branch=main&label=test&style=flat-square)](https://github.com/ghcr-manager/ghcr-untag-action/actions/workflows/ci_unit-test-lint.yml)

Remove one or more tags from a GHCR container package while keeping everything else in place - including timestamps.

GitHub Container Registry does not offer a direct "remove this tag only" operation. This action automates a workaround
for you.

## Inputs

| Input     | Required | Description                                                    |
| --------- | -------- | -------------------------------------------------------------- |
| `token`   | yes      | GitHub token with package read, write, and delete permissions. |
| `owner`   | yes      | Package owner name, either an org or a user.                   |
| `package` | yes      | Container package name.                                        |
| `tags`    | yes      | Newline-separated tags to remove.                              |

## Example

```yaml
name: Untag in GHCR package

on:
  workflow_dispatch:

jobs:
  untag:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - name: Remove tags
        uses: ghcr-manager/ghcr-untag-action@v1
        with:
          token: ${{ github.token }}
          owner: package-owner
          package: package-name
          tags: |
            old-tag
            old-tag-2
```

## When `github.token` Is Not Enough

Use a classic PAT instead of `${{ github.token }}` when the default workflow token does not have package admin rights
for the target package.

If you use a classic PAT, create it with these scopes:

- `read:packages`
- `write:packages`
- `delete:packages`

> This action does not delete entire packages. `delete:packages` is needed to delete the temporary package version
> created during untagging.

## Constraints

GHCR will not let you remove the last remaining tag from a package.

## How It Works

The action creates a temporary copy of the manifest with the tag assigned to it, then deletes that temporary copy.
