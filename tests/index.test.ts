import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("index entrypoint wires the action main flow through setFailed handling", async () => {
  const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
  assert.match(source, /void main\(\)\.catch/);
  assert.match(source, /core\.error\(error\.stack \?\? error\.message\)/);
  assert.match(source, /core\.setFailed/);
});
