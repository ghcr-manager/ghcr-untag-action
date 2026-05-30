import assert from "node:assert/strict";
import test from "node:test";
import { loadPackageVersionPage } from "../src/_package-version-page.js";

test("loadPackageVersionPage requests the expected package-version page", async () => {
  let seenUrl = "";

  const items = await loadPackageVersionPage("acme", "example", 3, "token", _logger(), async (input) => {
    const url = String(input);
    if (url === "https://api.github.com/users/acme") {
      return _jsonResponse({ type: "Organization" });
    }

    seenUrl = url;
    return _jsonResponse([]);
  });

  assert.deepEqual(items, []);
  assert.equal(seenUrl, "https://api.github.com/orgs/acme/packages/container/example/versions?per_page=100&page=3");
});

test("loadPackageVersionPage surfaces non-ok responses", async () => {
  await assert.rejects(
    () =>
      loadPackageVersionPage("acme", "example", 1, "token", _logger(), async (input) => {
        if (String(input) === "https://api.github.com/users/acme") {
          return _jsonResponse({ type: "Organization" });
        }

        return {
          ok: false,
          status: 403,
          headers: new Headers({
            "content-type": "application/json"
          }),
          async json() {
            return { message: "forbidden" };
          }
        };
      }),
    /GitHub Packages request for page 1 \(https:\/\/api\.github\.com\/orgs\/acme\/packages\/container\/example\/versions\?per_page=100&page=1\) failed - status 403 - forbidden/
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
