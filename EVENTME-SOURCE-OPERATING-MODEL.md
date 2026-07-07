# EventLive Source Operating Model

> Purpose: make EventLive source acquisition durable, periodic, and safe. This adapts the proven Atlas/cafe harvesting discipline to Saudi event sources without copying channel-specific code.

## Core Rule

Raw collection is not publication.

Every source run has three separate layers:

1. **Raw evidence**: fetched payload, HTML, JSON, snapshot path, probe status, dropped samples.
2. **Candidate queue**: normalized event leads with dates, city, evidence, confidence, duplicate risk, and publication gate.
3. **Public catalog**: only events that pass validation, dedupe, trust, date, and source policy gates.

No source may jump directly from discovery to public catalog.

## Harvest OS Adaptation

EventLive adopts the Harvest OS discipline as an operating gate, not as copied channel code. The useful transfer is the governance pattern:

1. **Probe before extractor**: a source must have probe/yield/browser evidence before engineering a collector.
2. **PROMOTABLE before publishable**: a new source lane must prove discoverability, correct event scope, Saudi relevance, date completeness, and evidence URLs before it can influence the public catalog.
3. **Raw snapshots are durable**: every run preserves raw payloads/snapshots and does not overwrite the evidence trail.
4. **Fail closed**: noisy, duplicate, blocked, protected, source-evidence, and weak-confidence rows stay out of the catalog by default.
5. **No bot-protection bypass**: protected official or marketplace surfaces move to partnership/API/evidence lanes; EventLive does not work around protection.
6. **Queue thinking over one-off scraping**: sources advance through state (`productive`, `zero-yield`, `probe-blocked`, `partnership`, `evidence-monitor`) so the next run knows what to do.
7. **Sample-to-gate loop**: source work is declared stable only after a sample passes collection, normalization, validation, build, source health, and a reportable audit.

For EventLive, the publication version of Harvest OS's PROMOTABLE rule is stricter than discovery: a source can be useful for discovery without being allowed to publish. Automatic public output requires an official/venue source lane plus candidate-level evidence, date, duplicate, and quality gates.

## Source Boundaries

| Boundary | Meaning | Publication rule |
|---|---|---|
| `raw_harvest_to_candidate_queue` | Active collector can produce normalized candidates. | Eligible only if candidate-level guards pass. |
| `discovery_signal_only` | Community/aggregator/marketplace discovery. | Never direct publish. Use for leads and evidence search. |
| `evidence_monitor_only` | Useful source evidence, but insufficient direct extraction. | Wait for official detail evidence. |
| `dedupe_anchor_only` | Venue or directory source useful for reconciliation. | Merge/confirm against organizer or official source. |
| `partnership_or_api_only` | App-only, protected, or strategic API lane. | No scraping workaround. Requires relationship/feed. |
| `probe_before_collector` | Not ready for a collector. | Probe first, then classify. |

## Periodic Run Contract

Every scheduled sync should leave durable state:

- `reports/source-collection-checkpoint.json`: crash-safe checkpoint written after every source, inspired by the HS per-shop checkpoint/pulse pattern.
- `reports/source-yield-report.*`: raw extractor yield and dropped samples.
- `reports/source-collection-report.*`: candidates discovered and written.
- `reports/source-auto-publish-report.*`: candidate-level publication outcome.
- `reports/source-ops-report.*`: operating queue and source health.
- `data/source_run_state.json`: per-source run ledger.
- `reports/source-run-state-report.*`: human-readable closeout for the latest cycle.

The key file is `data/source_run_state.json`. It records each source's ring, status, last snapshot, zero-yield streak, publication boundary, and next action. This is the EventLive equivalent of a resumable harvester ledger: it explains what happened and what the next cycle should do.

## HS-Inspired Source Wave Pattern

The cafe platform work works because it is not a single scrape. HungerStation uses browser-loaded `__NEXT_DATA__`, TryOrder uses tenant/subdomain context and structured API payloads, Jahez probes classify blocked/API/JSON-LD/hydration surfaces, and ToYou/TheChefz are treated as discovery/enrichment lanes depending on fetchability. The shared lesson is: classify the page before writing an extractor.

The source wave is:

`browser probe -> discover -> filter -> extract -> consolidate -> report -> audit -> close`

EventLive should use the same shape for source families:

| Cafe platform pattern | EventLive equivalent |
|---|---|
| browser/network probe | `sources:browser-probe` captures rendered DOM, APIs, request bodies, hydration, screenshots, and HTML snapshots |
| discover city/district vendors | discover source/event rows from official calendars |
| filter coffee kitchens | filter future, date-complete, Saudi-relevant event rows |
| extract vendor pages | extract detail pages, sessions, location, ticket/evidence links |
| consolidate into Master | merge into source candidates, then guarded catalog |
| round report | source collection/yield/state reports |
| 10% live audit | sample current official pages before declaring a source family stable |
| close wave | mark source lane stable/productive or reclassify to monitor/partnership |

Do not treat a source extractor as finished after the first successful row. A source family is only stable when it has collection evidence, normalized output, delta behavior, and a repeatable audit.

## Browser Acquisition Layer

`npm run sources:browser-probe` is now a first-class acquisition capability. It exists because many Saudi event sources do not expose the real event payload in first-pass HTML. The browser layer records:

- rendered text and event-like links,
- `__NEXT_DATA__`, Nuxt, JSON-LD, and large inline payload signals,
- XHR/fetch/API/GraphQL/internal JSON endpoints,
- POST bodies needed to replay official APIs,
- HTML snapshots and screenshots,
- a classification: `browser-network-api`, `browser-hydration-payload`, `browser-structured-html`, `rendered-html-candidates`, `blocked-or-protected`, or `policy-skipped-partnership`.

Rules:

1. Do not write a new extractor for a source that has not passed either `sources:probe`, `sources:yield`, or `sources:browser-probe`.
2. If browser probe finds a stable public API endpoint, prefer a direct JSON collector over brittle DOM scraping.
3. If browser probe finds hydration payloads, extract from those payloads before falling back to card text.
4. If browser probe classifies a source as blocked/protected, do not bypass protection; move it to partnership/API or evidence-only.
5. If browser probe finds only rendered text and links, write a conservative DOM extractor and keep it behind candidate gates.

## Pulse And Delta Rule

HS menu pulse re-reads the same vendor pages using the exact baseline shape so changes are apples-to-apples. EventLive applies the same idea through the collection report:

- baseline key: `source_url + title + start_date`;
- `new_candidates`: rows not seen before from that source;
- `refreshed_candidates`: rows seen before and still present;
- `missing_from_latest_run`: previously active source rows absent from the latest run;
- `approved_linked_preserved`: already-published candidates preserved even if no longer in the listing.

This matters because a source can add new events later. The periodic collector should show whether the new cycle actually found new supply, simply refreshed existing rows, or lost rows because a season ended or the source changed its structure.

## Detail Extraction Rule

Prefer the official detail page or embedded structured payload over listing-card text, especially when listing dates disagree with detail-page dates. This mirrors HS: the listing discovers a vendor, but the vendor detail page is the production payload.

For EventLive this means:

- listing pages are discovery;
- detail pages are evidence;
- session/program extraction belongs to detail pages whenever available;
- bad card dates must be corrected from official detail text, then documented in dropped samples or source notes.

## Repeated Zero-Yield Rule

Zero future rows is not automatically failure.

It can mean:

- the source is seasonal,
- the event window is currently empty,
- the page is archive-only,
- the parser is missing a delayed payload,
- dates exist but are not complete enough to publish.

After three consecutive zero-yield runs, the source must be inspected through dropped samples and either fixed, marked seasonal, moved to evidence-monitor, or left as a partnership/API lane. Do not keep blindly adding extractor code for a source that is structurally empty.

## Auto-Publish Boundary

Auto-publish is source-eligible only for official or venue-official active collectors. Even then, the candidate must still pass:

- required public fields,
- source identity,
- evidence/snapshot,
- not ended,
- not blocked,
- not `source-evidence` or `extraction`,
- duplicate checks,
- official confidence.

Discovery-only, aggregator, community, venue-dedupe, and partnership lanes are never direct auto-publish lanes.

## Operational Cadence

Use `npm run sources:sync` for the full periodic loop. It now includes `sources:state` so the cycle updates the source-run ledger before and after build.

Use `npm run sources:state` alone after any source investigation when you need a fresh ledger without running network collectors again.

## Decision Pattern

When adding a new source:

1. Probe first.
2. Classify the source boundary.
3. Discover listing rows only far enough to find detail URLs.
4. If public and allowed, write a conservative collector.
5. Preserve raw listing/detail snapshots.
6. Normalize only future, date-complete rows into the baseline candidate shape.
7. Route into candidates.
8. Let auto-publish decide; do not bypass it.
9. Check delta counts and source-run state.
10. Audit a sample before calling the source stable.

This is how EventLive becomes automatic without becoming careless.
