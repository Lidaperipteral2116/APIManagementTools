#!/usr/bin/env node
// score.mjs: per-operation view of Spectral findings, plus a percentage of
// operations with no findings. Node 22, no dependencies.
//
//   npx -y @stoplight/spectral-cli@6.16.3 lint -q -f json \
//     -r examples/spec-quality/agent-readiness/agent-readiness.spectral.yaml specs/demo-api.yaml \
//     | node examples/spec-quality/agent-readiness/score.mjs --spec specs/demo-api.yaml
//
//   node score.mjs --spec <openapi.yaml|.json> [results.json] [--min-severity error|warn|info|hint]
//
// The spec is needed to know the full list of operations (the denominator);
// Spectral's output only lists the ones with findings. YAML specs are read
// with a small indentation scanner that only looks at mapping keys, so it
// needs block-style `paths:` (the normal layout). JSON specs are parsed fully.
//
// The score is a heuristic. It counts operations with zero findings at or
// above the threshold. It cannot tell whether a description is accurate,
// whether the tool surface is the right size, or whether an agent will
// actually succeed with the API.

import { readFileSync } from 'node:fs';

const METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const SEVERITY = { error: 0, warn: 1, info: 2, hint: 3 };
const SEVERITY_NAME = ['error', 'warn', 'info', 'hint'];

function parseArgs(argv) {
  const out = { spec: null, results: null, minSeverity: 'warn' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--spec') out.spec = argv[++i];
    else if (a === '--min-severity') out.minSeverity = argv[++i];
    else if (a === '-h' || a === '--help') { usage(); process.exit(0); }
    else out.results = a;
  }
  if (!out.spec || !(out.minSeverity in SEVERITY)) { usage(); process.exit(2); }
  return out;
}

function usage() {
  console.error('usage: node score.mjs --spec <openapi.yaml|.json> [spectral-results.json] [--min-severity error|warn|info|hint]');
  console.error('       reads Spectral JSON output (spectral lint -f json) from the file or from stdin');
}

// Key-only scanner for block-style YAML. Returns [{method, path, operationId}].
function operationsFromYaml(text) {
  const ops = [];
  let inPaths = false;
  let pathIndent = -1, methodIndent = -1;
  let curPath = null, curOp = null;
  let blockIndent = -1; // inside a `|` or `>` scalar: skip deeper lines
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.search(/\S/);
    if (blockIndent >= 0) {
      if (indent > blockIndent) continue;
      blockIndent = -1;
    }
    const line = raw.trim();
    if (!inPaths) {
      if (indent === 0 && /^paths:\s*$/.test(line)) inPaths = true;
      continue;
    }
    if (indent === 0) break; // end of the paths block
    if (line.startsWith('- ')) continue; // sequence item
    const m = line.match(/^(?:'([^']*)'|"([^"]*)"|([^\s'"][^:]*?))\s*:(?:\s+(.*))?$/);
    if (!m) continue;
    const key = m[1] ?? m[2] ?? m[3];
    const value = (m[4] ?? '').trim();
    if (/^[|>]/.test(value)) blockIndent = indent;
    if (pathIndent < 0) pathIndent = indent;
    if (indent === pathIndent) {
      curPath = key.startsWith('/') ? key : null;
      curOp = null;
      continue;
    }
    if (!curPath) continue;
    if (methodIndent < 0 && indent > pathIndent) methodIndent = indent;
    if (indent === methodIndent) {
      if (METHODS.has(key)) { curOp = { method: key, path: curPath, operationId: null }; ops.push(curOp); }
      else curOp = null;
      continue;
    }
    if (curOp && key === 'operationId' && indent > methodIndent) curOp.operationId = value.replace(/^['"]|['"]$/g, '');
  }
  return ops;
}

function operationsFromJson(doc) {
  const ops = [];
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const [method, op] of Object.entries(item ?? {})) {
      if (METHODS.has(method)) ops.push({ method, path, operationId: op?.operationId ?? null });
    }
  }
  return ops;
}

function loadOperations(specPath) {
  const text = readFileSync(specPath, 'utf8');
  if (/^\s*\{/.test(text)) return operationsFromJson(JSON.parse(text));
  return operationsFromYaml(text);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const ops = loadOperations(args.spec);
  if (ops.length === 0) {
    console.error(`no operations found in ${args.spec} (is "paths:" block-style YAML or JSON?)`);
    process.exit(2);
  }
  const raw = readFileSync(args.results ?? 0, 'utf8');
  const findings = raw.trim() ? JSON.parse(raw) : [];
  const threshold = SEVERITY[args.minSeverity];

  const byOp = new Map(ops.map((o) => [`${o.method.toUpperCase()} ${o.path}`, new Set()]));
  const unattributed = [];
  let counted = 0;
  for (const f of findings) {
    if (f.severity > threshold) continue;
    counted++;
    const p = f.path ?? [];
    const key = p[0] === 'paths' && METHODS.has(p[2]) ? `${String(p[2]).toUpperCase()} ${p[1]}` : null;
    if (key && byOp.has(key)) byOp.get(key).add(f.code);
    else unattributed.push(f);
  }

  const rows = ops.map((o) => {
    const key = `${o.method.toUpperCase()} ${o.path}`;
    const rules = [...byOp.get(key)].sort();
    return [o.method.toUpperCase(), o.path, o.operationId ?? '(no operationId)', rules.length ? rules.join(', ') : '-'];
  });
  const header = ['Method', 'Path', 'operationId', 'Failing rules'];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const fmt = (r) => r.map((c, i) => (i === r.length - 1 ? c : c.padEnd(widths[i]))).join('  ');

  const clean = rows.filter((r) => r[3] === '-').length;
  const pct = Math.round((clean / ops.length) * 100);

  console.log(`Agent-readiness findings for ${args.spec} (severity ${args.minSeverity} and above; ${counted} of ${findings.length} findings counted)`);
  console.log();
  console.log(fmt(header));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(fmt(r));
  console.log();
  console.log(`Operations (candidate tools): ${ops.length}`);
  console.log(`Operations with zero findings: ${clean}/${ops.length} (${pct}%)`);
  if (unattributed.length) {
    console.log(`Findings not attributable to one operation (components, webhooks, root): ${unattributed.length}`);
    for (const f of unattributed) console.log(`  ${SEVERITY_NAME[f.severity]}  ${f.code}  ${(f.path ?? []).join('.')}`);
  }
  console.log();
  console.log('Note: the percentage is a heuristic. It counts operations with no lint findings at or above the threshold.');
  console.log('It does not measure whether descriptions are accurate or whether the tool surface is the right size.');
}

main();
