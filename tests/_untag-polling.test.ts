import assert from "node:assert/strict";
import test from "node:test";
import { resolveDetachedTagVersion } from "../src/_untag-polling.js";

test("resolveDetachedTagVersion returns the rewritten tag target", async () => {
  const match = await resolveDetachedTagVersion(
    "acme",
    "example",
    "latest",
    {
      digest: "sha256:source",
      tags: ["latest"]
    },
    "sha256:detached",
    {
      token: "token",
      logger: _logger(),
      fetchImpl: async (input) => {
        if (String(input) === "https://api.github.com/users/acme") {
          return _jsonResponse({ type: "Organization" });
        }

        return _jsonResponse([
          {
            id: 202,
            name: "sha256:detached",
            metadata: {
              container: {
                tags: ["latest"]
              }
            }
          }
        ]);
      }
    }
  );

  assert.equal(match.sourceVersionId, 202);
  assert.equal(match.sourceDigest, "sha256:detached");
});

test("resolveDetachedTagVersion fails when the detached version never appears", async () => {
  await assert.rejects(
    () =>
      resolveDetachedTagVersion(
        "acme",
        "example",
        "latest",
        {
          digest: "sha256:source",
          tags: ["latest"]
        },
        "sha256:detached",
        {
          token: "token",
          logger: _logger(),
          fetchImpl: async (input) => {
            if (String(input) === "https://api.github.com/users/acme") {
              return _jsonResponse({ type: "Organization" });
            }

            return _jsonResponse([
              {
                id: 101,
                name: "sha256:source",
                metadata: {
                  container: {
                    tags: ["latest"]
                  }
                }
              }
            ]);
          }
        }
      ),
    /could not find temporary package version/
  );
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
