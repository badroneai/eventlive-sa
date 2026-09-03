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

assert.ok(scanned > 1000, `expected the full built site, scanned only ${scanned} pages`);
assert.deepEqual(
  offenders.slice(0, 40),
  [],
  `duplicated single-injection markers (${offenders.length} total) — a strip pattern has drifted from what the append writes:\n  ${offenders.slice(0, 40).join('\n  ')}`
);

console.log(`SINGLETON_INJECTION_OK pages=${scanned} markers=${SINGLETONS.length}`);
