# Scripts Layout

- `program-lifecycle-utils.mjs`
  - Shared path helpers, release artifact naming, and lifecycle utilities.
- `validate-data.mjs`
  - Validate a program document.
- `generate-site.mjs`
  - Build the client-facing static page.
- `normalize-program.mjs`
  - Convert intake CSV into `data/intake/current-program.json`.
- `preview-program.mjs`
  - Validate + build the current intake candidate.
- `diff-programs.mjs`
  - Compare candidate vs baseline/latest approved and generate diff reports.
- `publish-program.mjs`
  - Mark a validated candidate as the current approved publishable release.
- `archive-program.mjs`
  - Snapshot the current approved release into the archive.

## Lifecycle order
`normalize -> validate -> preview -> diff -> publish -> archive`

## Event kinds (moment vs program)
- `event-kind-utils.mjs`
  - Shared classifier: windows longer than 14 days are `program` (برنامج ممتد), otherwise `moment` (فعالية لحظية). Explicit `event_kind` on a catalog event overrides the duration rule.
  - In-window programs get status `ongoing` (برنامج جارٍ) — never `live` (مباشرة الآن). Keeps the live surfaces (index, today, screen) honest for attendees.
- `event-kind-regression-test.mjs` (`npm run test:event-kind`)
  - Gate protecting the rule above; run it after touching status logic in `generate-site.mjs`.
- `audience-utils.mjs`
  - Shared audience taxonomy and rules-based classifier for catalog events and source candidates.
- `audience-regression-test.mjs` (`npm run test:audience`)
  - Gate protecting the audience layer: Arabic/English/mixed classification, explicit women-only signals, default `general`, and false-positive protection.
- `source-extractor-regression-test.mjs` (`npm run test:source-extractors`)
  - Gate protecting the first official-source extractor contracts: Visit Saudi JSON, Monsha'at event cards, SDAIA date-complete programs, and Saudi Pro League fixture JSON with Saudi timezone conversion.
- `source-plan-regression-test.mjs` (`npm run test:source-plan`)
  - Gate protecting the source health model so collector-backed B-1 sources stay in the active collector ring instead of drifting back into extractor backlog reports.
- `source-yield-report.mjs` (`npm run sources:yield`)
  - Diagnostic gate for B1.2: runs the active collectors with the real extractors and reports payload signals, raw extracted rows, future-complete rows, capped written rows, and zero-yield reasons before extractor fixes.
- `source-browser-probe.mjs` (`npm run sources:browser-probe`)
  - Browser acquisition layer inspired by the cafe platform work across HungerStation, TryOrder, Jahez, ToYou, and TheChefz. It opens source pages with Playwright, captures rendered DOM, hydration payload signals, JSON-LD, network API endpoints, request bodies, screenshots, and HTML snapshots before extractor work. Use `EVENTLIVE_BROWSER_SOURCE_IDS=source-a,source-b` for targeted probes.
- `collect-source-candidates.mjs` (`npm run sources:collect`)
  - Periodic collector. It now follows the HS pulse lesson: after each source it writes `reports/source-collection-checkpoint.json`, and the final report includes per-source delta counts (`new_candidates`, `refreshed_candidates`, `missing_from_latest_run`) using the stable baseline key `source_url + title + start_date`.
- `source-run-state.mjs` (`npm run sources:state`)
  - Durable source-run ledger inspired by the Atlas/cafe harvesting model: raw collection is not publication, discovery-only stays discovery-only, active collectors keep last attempt/snapshot/status, and repeated zero-yield becomes an operational signal instead of disappearing between reports.
- `date-parse-utils.mjs` / `city-utils.mjs` / `arabic-normalize.mjs`
  - Shared B1.2 utilities for flexible Saudi-time date parsing, city truth normalization, and Arabic search normalization.
- `date-parse-regression-test.mjs`, `city-regression-test.mjs`, `live-ready-regression-test.mjs`, `search-regression-test.mjs`, `dedupe-regression-test.mjs`, `source-collection-delta-regression-test.mjs`, `source-browser-probe-regression-test.mjs`, `source-run-state-regression-test.mjs`
  - B1.2 gates for the new extraction/date/city/live/search/dedupe contracts.
