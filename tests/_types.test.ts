import assert from "node:assert/strict";
import test from "node:test";
import type {
  LoadedRegistryManifest,
  PackageVersionPageItem,
  TagSource,
  UntagOperation,
  UntagRootSelection
} from "../src/_types.js";

test("type-only module remains aligned with the untag domain shapes", () => {
  const pageItem: PackageVersionPageItem = {
    id: 1,
    name: "sha256:source",
    metadata: {
      container: {
        tags: ["latest"]
      }
    }
  };
  const tagSource: TagSource = {
    tag: "latest",
    sourceVersionId: 1,
    sourceDigest: "sha256:source"
  };
  const root: UntagRootSelection = {
    digest: "sha256:source",
    tags: ["latest"]
  };
  const manifest: LoadedRegistryManifest = {
    digest: "sha256:source",
    mediaType: "application/vnd.oci.image.manifest.v1+json",
    rawJson: "{}"
  };
  const operation: UntagOperation = {
    tag: "latest",
    sourceDigest: "sha256:source",
    detachedVersionId: 2,
    detachedDigest: "sha256:detached"
  };

  assert.equal(pageItem.id, 1);
  assert.equal(tagSource.sourceDigest, root.digest);
  assert.equal(manifest.digest, operation.sourceDigest);
});
