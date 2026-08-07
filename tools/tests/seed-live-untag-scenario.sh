#!/usr/bin/env bash
set -euo pipefail

scenario="${1:?missing scenario}"
image_ref="${2:?missing image ref}"
keep_tag="${3:?missing keep tag}"
delete_tag="${4:?missing delete tag}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fixture_dir="$repo_root/tools/tests/fixtures/minimal-image"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

cp "$fixture_dir/Dockerfile" "$work_dir/Dockerfile"
printf '%s\n' "$scenario" >"$work_dir/payload.txt"

case "$scenario" in
  image-manifest-multiple-tags)
    docker buildx build \
      --platform linux/amd64 \
      --provenance=false \
      --push \
      --tag "$image_ref:$keep_tag" \
      --tag "$image_ref:$delete_tag" \
      "$work_dir"
    ;;
  image-manifest-single-tag)
    printf '%s\n' "$scenario-keep" >"$work_dir/payload.txt"
    docker buildx build \
      --platform linux/amd64 \
      --provenance=false \
      --push \
      --tag "$image_ref:$keep_tag" \
      "$work_dir"
    printf '%s\n' "$scenario-delete" >"$work_dir/payload.txt"
    docker buildx build \
      --platform linux/amd64 \
      --provenance=false \
      --push \
      --tag "$image_ref:$delete_tag" \
      "$work_dir"
    ;;
  single-platform-index-multiple-tags)
    seed_tag="seed-platform"
    docker buildx build \
      --platform linux/amd64 \
      --provenance=false \
      --push \
      --tag "$image_ref:$seed_tag" \
      "$work_dir"
    docker buildx imagetools create \
      --tag "$image_ref:$keep_tag" \
      --tag "$image_ref:$delete_tag" \
      "$image_ref:$seed_tag"
    ;;
  single-platform-index-single-tag)
    keep_seed_tag="seed-platform-keep"
    delete_seed_tag="seed-platform-delete"
    printf '%s\n' "$scenario-keep" >"$work_dir/payload.txt"
    docker buildx build \
      --platform linux/amd64 \
      --provenance=false \
      --push \
      --tag "$image_ref:$keep_seed_tag" \
      "$work_dir"
    docker buildx imagetools create \
      --tag "$image_ref:$keep_tag" \
      "$image_ref:$keep_seed_tag"
    printf '%s\n' "$scenario-delete" >"$work_dir/payload.txt"
    docker buildx build \
      --platform linux/amd64 \
      --provenance=false \
      --push \
      --tag "$image_ref:$delete_seed_tag" \
      "$work_dir"
    docker buildx imagetools create \
      --tag "$image_ref:$delete_tag" \
      "$image_ref:$delete_seed_tag"
    ;;
  artifact-manifest-multiple-tags)
    artifact_output="$work_dir/oras-push.json"
    (
      cd "$work_dir"
      oras push \
        --artifact-type application/vnd.ghcr-manager.live-untag-test.v1 \
        --format json \
        "$image_ref:$keep_tag" \
        "payload.txt:text/plain" >"$artifact_output"
    )
    artifact_digest="$(jq -r '.digest' "$artifact_output")"
    [[ -n "$artifact_digest" && "$artifact_digest" != "null" ]] || {
      echo "oras push did not return a digest" >&2
      exit 1
    }
    oras tag "$image_ref@$artifact_digest" "$delete_tag"
    ;;
  artifact-manifest-single-tag)
    printf '%s\n' "$scenario-keep" >"$work_dir/keep.txt"
    (
      cd "$work_dir"
      oras push \
        --artifact-type application/vnd.ghcr-manager.live-untag-test.v1 \
        "$image_ref:$keep_tag" \
        "keep.txt:text/plain"
    )
    printf '%s\n' "$scenario-delete" >"$work_dir/delete.txt"
    (
      cd "$work_dir"
      oras push \
        --artifact-type application/vnd.ghcr-manager.live-untag-test.v1 \
        "$image_ref:$delete_tag" \
        "delete.txt:text/plain"
    )
    ;;
  *)
    echo "unsupported scenario seed strategy: $scenario" >&2
    exit 1
    ;;
esac
