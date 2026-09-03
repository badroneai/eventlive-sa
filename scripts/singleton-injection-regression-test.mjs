// Strip-then-append injection is only idempotent while the strip matches what
// the append wrote. Twice now it did not, and the page grew a copy per build:
//
//   1. the Plausible tag — the matcher required `async` but the DOM serializer
//      wrote `async=""`, and index.html reached 13 copies
//   2. this comment — the matcher spelled "self-hosted Umami" while
//      analyticsHeadSnippet emits ANALYTICS.provider verbatim, "umami". Across
//      git history dist/en/index.html went 0 -> 1 -> 4 copies, unbounded.
//
// Both were found by hand, months apart, after the growth was already committed.
// Nothing in the build noticed, because each individual build looked fine — the
// defect is only visible as a difference between builds.
//
// This gate asserts the invariant directly: a marker that must appear once must
// appear exactly once, on every built page.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');

// Written as patterns, not literals: a matcher that names the current vendor is
// exactly what failed twice above.
const SINGLETONS = [
  { label: 'analytics provenance comment', pattern: /<!-- Privacy-friendly analytics by [^>]*-->/gi },
  { label: 'analytics runtime script', pattern: /<script id="eventlive-analytics-runtime">/gi },
  { label: 'analytics vendor script tag', pattern: /<script[^>]+src="https:\/\/[^"]*(?:umami|plausible)[^"]*"[^>]*>/gi },
  { label: 'brand pulse style block', pattern: /<style id="eventlive-brand-pulse">/gi },
  { label: 'canonical link', pattern: /<link\b[^>]*rel=["']canonical["'][^>]*>/gi },
  { label: 'robots meta', pattern: /<meta\b[^>]*name=["']robots["'][^>]*>/gi }
];

function htmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const offenders = [];
let scanned = 0;
for (const file of htmlFiles(dist)) {
  const html = fs.readFileSync(file, 'utf8');
  scanned += 1;
  for (const { label, pattern } of SINGLETONS) {
    const count = (html.match(pattern) || []).length;
    if (count > 1) offenders.push(`${path.relative(dist, file)}: ${count}x ${label}`);
  }
}

// The same defect can also arrive as pure whitespace. Three strip/append pairs
// removed a block but left the newline the append had written, so every page
// gained blank lines on every build: dist/events.html measured 2984 -> 2987 ->
// 2990 lines, and the gap in index.html's <head> had reached 633 lines.
// No marker is duplicated in that case — only the space between them grows.
//
// Baseline after the fix, measured across two full build cycles: the longest run
// anywhere is 3 consecutive newlines (2 blank lines), in about.html. The ceiling
// below leaves one line of headroom, so a pair that drifts apart again trips this
// within a build or two — chronic-intolerant, transient-tolerant.
const MAX_CONSECUTIVE_NEWLINES = 4;
const blankRuns = [];
for (const file of htmlFiles(dist)) {
  const html = fs.readFileSync(file, 'utf8');
  let longest = 0;
  for (const run of html.match(/\n[ \t]*(?:\n[ \t]*)+/g) || []) {
    longest = Math.max(longest, run.split('\n').length - 1);
  }
  if (longest > MAX_CONSECUTIVE_NEWLINES) blankRuns.push(`${path.relative(dist, file)}: run of ${longest} newlines`);
}
assert.deepEqual(
  blankRuns.slice(0, 20),
  [],
  `blank-line runs are accumulating (${blankRuns.length} pages) — a strip no longer matches the whitespace its append writes:\n  ${blankRuns.slice(0, 20).join('\n  ')}`
);

assert.ok(scanned > 1000, `expected the full built site, scanned only ${scanned} pages`);
assert.deepEqual(
  offenders.slice(0, 40),
  [],
  `duplicated single-injection markers (${offenders.length} total) — a strip pattern has drifted from what the append writes:\n  ${offenders.slice(0, 40).join('\n  ')}`
);

console.log(`SINGLETON_INJECTION_OK pages=${scanned} markers=${SINGLETONS.length} max_blank_run=${MAX_CONSECUTIVE_NEWLINES}`);
