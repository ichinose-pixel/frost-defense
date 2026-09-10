import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
test("native package uses identical game assets and has no remote entry point", () => {
  execFileSync(process.execPath, ["scripts/build-mobile.mjs"], { cwd: root });
  const config = JSON.parse(
    readFileSync(new URL("../capacitor.config.json", import.meta.url)),
  );
  assert.equal(config.webDir, "www");
  assert.equal(config.server?.url, undefined);
  const files = readdirSync(new URL("../www/", import.meta.url), {
    recursive: true,
    withFileTypes: true,
  });
  assert.equal(files.filter((f) => f.isFile()).length, 4);
  for (const name of [
    "index.html",
    "styles/game.css",
    "vendor/three-0.160.0.min.js",
    "dist/game.js",
  ]) {
    assert.deepEqual(
      readFileSync(root + "www/" + name),
      readFileSync(root + name),
    );
  }
  const css = readFileSync(root + "www/styles/game.css", "utf8");
  assert.doesNotMatch(
    css,
    /url\s*\(|@import/i,
    "New CSS assets must be added to mobile packaging before release",
  );
});
