import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { resolveSourceTagRoots, runUntag } from "../src/_untag.js";

test("runUntag retargets tags and deletes the temporary package versions", async () => {
  const requests: Array<{
    body: string | undefined;
    method: string | undefined;
    url: string;
  }> = [];
  let detachedDigest: string | undefined;

  const operations = await runUntag("acme", "example", ["latest"], {
    token: "token",
    logger: _logger(),
    fetchImpl: async (input, init) => {
      const url = String(input);
      requests.push({
        url,
        method: init?.method,
        body: typeof init?.body === "string" ? init.body : undefined
      });

      if (url === "https://api.github.com/users/acme") {
        return _jsonResponse({ type: "Organization" });
      }

      if (url === "https://api.github.com/orgs/acme/packages/container/example/versions?per_page=100&page=1") {
        if (requests.filter((request) => request.url === url).length === 1) {
          assert.ok(detachedDigest);
          return _jsonResponse([
            {
              id: 202,
              name: detachedDigest,
              metadata: {
                container: {
                  tags: ["latest"]
                }
              }
            }
          ]);
        }

        return _jsonResponse([]);
      }

      if (url === "https://ghcr.io/token?service=ghcr.io&scope=repository%3Aacme%2Fexample%3Apull%2Cpush") {
        return _jsonResponse({ token: "registry-token" });
      }

      if (url === "https://ghcr.io/v2/acme/example/manifests/latest" && init?.method === "PUT") {
        const body = typeof init.body === "string" ? init.body : "";
        detachedDigest = `sha256:${createHash("sha256").update(body).digest("hex")}`;
        return {
          ok: true,
          status: 201,
          headers: new Headers(),
          async json() {
            return {};
          }
        };
      }

      if (url === "https://ghcr.io/v2/acme/example/manifests/latest") {
        return _jsonResponse(
          {
            mediaType: "application/vnd.oci.image.manifest.v1+json",
            config: {
              mediaType: "application/vnd.oci.image.config.v1+json",
              digest: "sha256:config",
              size: 10
            },
            layers: []
          },
          {
            "docker-content-digest": "sha256:source"
          }
        );
      }

      if (
        url === "https://api.github.com/orgs/acme/packages/container/example/versions/202" &&
        init?.method === "DELETE"
      ) {
        return {
          ok: true,
          status: 204,
          headers: new Headers(),
          async json() {
            return {};
          }
        };
      }

      throw new Error(`unexpected request: ${url}`);
    }
  });

  assert.equal(operations.length, 1);
  assert.equal(operations[0]?.tag, "latest");
  assert.match(
    requests.find(
      (request) => request.url === "https://ghcr.io/v2/acme/example/manifests/latest" && request.method === "PUT"
    )?.body ?? "",
    /detached-tag/
  );
});

test("runUntag fails when a requested tag cannot be resolved", async () => {
  await assert.rejects(
    () =>
      runUntag("acme", "example", ["missing"], {
        token: "token",
        logger: _logger(),
        fetchImpl: async (input) => {
          if (input === "https://ghcr.io/token?service=ghcr.io&scope=repository%3Aacme%2Fexample%3Apull%2Cpush") {
            return _jsonResponse({ token: "registry-token" });
          }

          if (input === "https://ghcr.io/v2/acme/example/manifests/missing") {
            return {
              ok: false,
              status: 404,
              headers: new Headers({ "content-type": "application/json" }),
              async json() {
                return { message: "manifest unknown" };
              }
            };
          }

          throw new Error(`unexpected request: ${input}`);
        }
      }),
    /could not resolve tag\(s\): missing/
  );
});

test("resolveSourceTagRoots groups tags by resolved manifest digest", async () => {
  const roots = await resolveSourceTagRoots("acme", "example", ["latest", "stable"], "registry-token", {
    token: "token",
    logger: _logger(),
    fetchImpl: async (input) => {
      const url = String(input);
      if (
        url === "https://ghcr.io/v2/acme/example/manifests/latest" ||
        url === "https://ghcr.io/v2/acme/example/manifests/stable"
      ) {
        return _jsonResponse(
          {
            mediaType: "application/vnd.oci.image.manifest.v1+json",
            layers: []
          },
          {
            "docker-content-digest": "sha256:source"
          }
        );
      }

      throw new Error(`unexpected request: ${input}`);
    }
  });

  assert.deepEqual(
    roots.map((root) => ({ digest: root.digest, tags: root.tags })),
    [{ digest: "sha256:source", tags: ["latest", "stable"] }]
  );
});

function _jsonResponse(body: unknown, headers?: Record<string, string>) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json", ...headers }),
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
