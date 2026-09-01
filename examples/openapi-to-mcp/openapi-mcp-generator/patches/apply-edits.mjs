#!/usr/bin/env node
/**
 * Rewrites tool descriptions in the generated server from descriptions.json.
 *
 *   node patches/apply-edits.mjs                 # edits generated/src/index.ts in place
 *   node patches/apply-edits.mjs --target FILE   # edit another copy (used to build descriptions.patch)
 *   node patches/apply-edits.mjs --check         # exit 1 if any edit is not yet applied
 *
 * Why a script and not just a .patch: the generator stamps a timestamp into
 * index.ts and re-orders nothing else, so a line-based patch breaks on every
 * regeneration while a name-keyed rewrite survives it. Rebuild afterwards:
 *   cd generated && npm run build
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const check = args.includes("--check");
const targetIdx = args.indexOf("--target");
const target = targetIdx >= 0 ? path.resolve(args[targetIdx + 1]) : path.join(here, "..", "generated", "src", "index.ts");

const map = JSON.parse(readFileSync(path.join(here, "descriptions.json"), "utf8"));
delete map._comment;

let src = readFileSync(target, "utf8");
let applied = 0;
let pending = 0;

for (const [tool, text] of Object.entries(map)) {
  // Matches:   ["tool", {\n    name: "tool",\n    description: `...`,
  // The body is template-literal text: any char except backtick/backslash, or an escape pair.
  const re = new RegExp(`(\\["${tool}", \\{\\s*name: "${tool}",\\s*description: \`)((?:[^\`\\\\]|\\\\[\\s\\S])*)(\`,)`);
  const m = src.match(re);
  if (!m) {
    console.error(`apply-edits: tool "${tool}" not found in ${target}`);
    process.exitCode = 1;
    continue;
  }
  const current = m[2];
  const tagSuffix = current.match(/\n+\(Tags: [^)]*\)$/)?.[0] ?? "";
  const escaped = text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const next = escaped + tagSuffix;
  if (current === next) {
    applied++;
    continue;
  }
  pending++;
  if (!check) src = src.replace(re, `$1${next}$3`);
}

if (check) {
  console.log(`apply-edits --check: ${applied} applied, ${pending} pending`);
  if (pending) process.exitCode = 1;
} else {
  writeFileSync(target, src);
  console.log(`apply-edits: rewrote ${pending} description(s) in ${target} (${applied} already current)`);
}
