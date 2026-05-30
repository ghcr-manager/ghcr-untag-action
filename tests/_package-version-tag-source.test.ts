import assert from "node:assert/strict";
import test from "node:test";
import { listPackageVersionTagSources } from "../src/_package-version-tag-source.js";

test("listPackageVersionTagSources resolves requested tags to source versions and digests", async () => {
  const matches = await listPackageVersionTagSources("acme", "example", ["latest", "stable"], {
    token: "token",
    logger: _logger(),
    fetchImpl: async (input) => {
      if (input === "https://api.github.com/users/acme") {
        return _jsonResponse({ type: "Organization" });
      }

      if (input === "https://api.github.com/orgs/acme/packages/container/example/versions?per_page=100&page=1") {
        return _jsonResponse([
          {
            id: 101,
            name: "sha256:root-a",
            metadata: {
              container: {
                tags: ["latest", "stable"]
              }
            }
          }
        ]);
      }

      throw new Error(`unexpected request: ${input}`);
    }
  });

  assert.deepEqual(matches, [
    {
      tag: "latest",
      sourceVersionId: 101,
      sourceDigest: "sha256:root-a"
    },
    {
      tag: "stable",
      sourceVersionId: 101,
      sourceDigest: "sha256:root-a"
    }
  ]);
});

test("listPackageVersionTagSources short-circuits empty input", async () => {
  const matches = await listPackageVersionTagSources("acme", "example", [], {
    token: "token",
    logger: _logger(),
    fetchImpl: async () => {
      throw new Error("should not fetch");
    }
  });

  assert.deepEqual(matches, []);
});

function _jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    async json() {
      return body;
    }
  };
}

function _logger() {
  return {
    debug() {},
    info() {},
    warn() {}
  };
}
