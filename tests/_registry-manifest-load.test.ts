import assert from "node:assert/strict";
import test from "node:test";
import { loadRegistryManifestByDigest, loadRegistryManifestByTag } from "../src/_registry-manifest-load.js";

test("loadRegistryManifestByDigest loads a manifest document", async () => {
  const manifest = await loadRegistryManifestByDigest("acme", "example", "sha256:source", "registry-token", _logger(), {
    fetchImpl: async (input) => {
      assert.equal(String(input), "https://ghcr.io/v2/acme/example/manifests/sha256:source");
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          "content-type": "application/vnd.oci.image.manifest.v1+json",
          "docker-content-digest": "sha256:source"
        }),
        async json() {
          return {
            mediaType: "application/vnd.oci.image.manifest.v1+json",
            config: {
              mediaType: "application/vnd.oci.image.config.v1+json",
              digest: "sha256:config",
              size: 10
            },
            layers: []
          };
        }
      };
    }
  });

  assert.equal(manifest.digest, "sha256:source");
  assert.equal(manifest.mediaType, "application/vnd.oci.image.manifest.v1+json");
});

test("loadRegistryManifestByTag resolves a tag to its manifest digest", async () => {
  const manifest = await loadRegistryManifestByTag("acme", "example", "latest", "registry-token", _logger(), {
    fetchImpl: async (input) => {
      assert.equal(String(input), "https://ghcr.io/v2/acme/example/manifests/latest");
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          "content-type": "application/vnd.oci.image.manifest.v1+json",
          "docker-content-digest": "sha256:resolved"
        }),
        async json() {
          return {
            mediaType: "application/vnd.oci.image.manifest.v1+json",
            layers: []
          };
        }
      };
    }
  });

  assert.equal(manifest.digest, "sha256:resolved");
  assert.equal(manifest.mediaType, "application/vnd.oci.image.manifest.v1+json");
});

test("loadRegistryManifestByDigest rejects non-ok responses", async () => {
  await assert.rejects(
    () =>
      loadRegistryManifestByDigest("acme", "example", "sha256:source", "registry-token", _logger(), {
        fetchImpl: async () => ({
          ok: false,
          status: 404,
          headers: new Headers({ "content-type": "application/json" }),
          async json() {
            return { message: "manifest unknown" };
          }
        })
      }),
    /GHCR manifest request for sha256:source failed - status 404 - manifest unknown/
  );
});

test("loadRegistryManifestByDigest requires a media type", async () => {
  await assert.rejects(
    () =>
      loadRegistryManifestByDigest("acme", "example", "sha256:source", "registry-token", _logger(), {
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          headers: new Headers(),
          async json() {
            return {};
          }
        })
      }),
    /did not include a media type/
  );
});

test("loadRegistryManifestByTag requires a digest for tag lookups", async () => {
  await assert.rejects(
    () =>
      loadRegistryManifestByTag("acme", "example", "latest", "registry-token", _logger(), {
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/vnd.oci.image.manifest.v1+json" }),
          async json() {
            return { mediaType: "application/vnd.oci.image.manifest.v1+json" };
          }
        })
      }),
    /did not include a docker-content-digest header/
  );
});

function _logger() {
  return {
    debug() {},
    info() {},
    warn() {}
  };
}
