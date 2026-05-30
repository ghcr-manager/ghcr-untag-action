import assert from "node:assert/strict";
import test from "node:test";
import { readInputs } from "../src/_inputs.js";

test("readInputs reads required action inputs", async () => {
  process.env.INPUT_TOKEN = "token";
  process.env.INPUT_OWNER = "acme";
  process.env.INPUT_PACKAGE = "example";
  process.env.INPUT_TAGS = "first\nsecond\n";

  const inputs = readInputs();
  assert.deepEqual(inputs, {
    token: "token",
    owner: "acme",
    packageName: "example",
    tags: ["first", "second"]
  });
});

test("readInputs rejects empty tags", async () => {
  process.env.INPUT_TOKEN = "token";
  process.env.INPUT_OWNER = "acme";
  process.env.INPUT_PACKAGE = "example";
  process.env.INPUT_TAGS = "\n \n";

  assert.throws(() => readInputs(), /input 'tags' must include at least one non-empty line/);
});

test("readInputs rejects sha-like tags", async () => {
  process.env.INPUT_TOKEN = "token";
  process.env.INPUT_OWNER = "acme";
  process.env.INPUT_PACKAGE = "example";
  process.env.INPUT_TAGS = "latest\nsha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n";

  assert.throws(
    () => readInputs(),
    /input 'tags' contains sha256 manifest digest references; this action rejects them and only removes regular tags/
  );
});
