// Package exactly the browser entry point and its local dependencies for offline use.
import "./build.mjs";
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "www");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const files = new Set(["index.html"]);
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const path = match[1].split(/[?#]/)[0];
  if (/^(?:[a-z]+:|\/\/)/i.test(path)) {
    throw new Error(`Mobile entry must work offline: ${path}`);
  }
  const local = relative(root, resolve(root, path));
  if (!local || local.startsWith("..") || path.startsWith("/")) {
    throw new Error(`Invalid bundled path: ${path}`);
  }
  files.add(local);
}
// Fail before removing the previous package if a required input is missing.
for (const file of files) readFileSync(resolve(root, file));
rmSync(output, { recursive: true, force: true });
for (const file of files) {
  const destination = resolve(output, file);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(resolve(root, file), destination);
}
console.log(`Packaged ${files.size} local files in www/ for iOS and Android.`);
