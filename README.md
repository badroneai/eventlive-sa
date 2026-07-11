# EventLive (Live Event Agenda Platform)

EventLive is an Arabic/Saudi live agenda platform for conferences, forums, workshops, and public events.
It turns normalized schedule data into a mobile-friendly discovery homepage with a live alert, now attendance mode, live updates center, venue screen mode, activation queue, public trust center, operational readiness board, source acquisition pipeline, source candidate intake, today priority feed, standalone My Events page, platform live status center, local saved-events register, city/category discovery pages, multi-event catalog index, event detail pages with live attendance timing and event-specific live updates, public discovery metadata, organizer intake path, and visitor reference with live session state, a live attendance command center, live timeline navigation, session-linked live updates, trust/source evidence, directions, arrival notes, QR signage, share/copy/WhatsApp actions, offline-ready PWA support, personal saved events and agenda, platform/event calendar files, validation gates, and a static deployment workflow.

Public product site: `https://eventme.live/`

## Quick start

```bash
npm install
npm run validate
npm run build
npm run sources:sync
npm run sources:ops
npm run seo:indexnow
```

## Lifecycle commands

```bash
npm run normalize
npm run validate
npm run preview
npm run diff
npm run sources:sync
npm run sources:collect
npm run sources:auto-publish
npm run sources:review
npm run sources:promote
npm run sources:ops
npm run publish
npm run archive
```

## Data contract
- Schema: `data/schema.json`
- Demo conference-program input: `data/demo_program.json`
- Optional discovery catalog: `data/events_catalog.json`
- Discovery catalog schema: `data/events-catalog.schema.json`
- Source candidate intake: `data/source_candidates.json`
- Source candidate schema: `data/source-candidates.schema.json`
- Source registry: `data/source_registry.json`
- Source registry schema: `data/source-registry.schema.json`
- Operational intake templates:
  - `data/intake/event-program-template.csv`
  - `data/intake/normalized-program.template.json`
  - `data/intake/baseline-program.example.csv`
  - `data/intake/updated-program.example.csv`
  - `data/intake/current-program.example.json`
  - `data/intake/current-program.updated.example.json`
- Validation report: `reports/validation-report.md`
- Source collection report: `reports/source-collection-report.md`, `reports/source-collection-report.json`
- Source auto-publish report: `reports/source-auto-publish-report.md`, `reports/source-auto-publish-report.json`
- Source review report: `reports/source-review-report.md`, `reports/source-review-report.json`
- Source promotion report: `reports/source-promotion-report.md`, `reports/source-promotion-report.json`
- Source ops report: `reports/source-ops-report.md`, `reports/source-ops-report.json`, `reports/source-ops-report.html`
- Release manifests: `reports/releases/latest-approved.json`, `reports/releases/archive-index.json`, `reports/releases/current-release-bundle.json`
- Diff reports: `reports/diffs/*.md`, `reports/diffs/*.json`
- Share kit: `reports/releases/<release-id>.share-kit.{json,md}` and `reports/releases/<release-id>.qr-placeholder.txt`

## Manual workflow
`intake -> normalize -> validate -> preview -> diff -> approve -> publish -> archive -> handoff`

1. `intake`
   Collect the organizer schedule in any working format and copy the approved template fields into `data/intake/event-program-template.csv`.
2. `normalize`
   Convert the approved intake CSV into `data/intake/current-program.json` with `npm run normalize`.
3. `validate`
   Run `EVENTLIVE_SOURCE_FILE=data/intake/current-program.json npm run validate`.
4. `preview`
   Run `npm run preview` and review `dist/index.html`.
5. `diff`
   Run `npm run diff` to compare the candidate against the latest approved or a chosen baseline.
6. `approve`
   Review the diff report, complete the preview approval checklist, then confirm organizer approval.
7. `publish`
   Run `npm run publish` against the approved normalized file to create the latest approved release package.
8. `archive`
   Archive superseded approved releases with `npm run archive`.
9. `handoff`
   Complete the internal handoff checklist and share the final URL plus evidence bundle.

## Output zones
- `dist/`
  - Latest visitor-facing delivery package: `index.html`, `today.html`, `today.json`, `updates.html`, `updates.json`, `screen.html`, `activation.html`, `activation.json`, `trust.html`, `trust.json`, `readiness.html`, `readiness.json`, `sources.html`, `sources.json`, `candidates.html`, `candidates.json`, `source-registry.json`, `my-events.html`, `event.html`, `events.html`, `events/*.html`, `events/*.ics`, `cities/*.html`, `categories/*.html`, `events.json`, `live-status.json`, `events.ics`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `sitemap.xml`, `robots.txt`, `print.html`, `share.html`, `signage.html`, `organizers.html`, `qr-event.svg`, `qr-share.svg`, `qr-today.svg`, `current-release-bundle.json`, `current-delivery-manifest.*`, `share-kit.*`, `handoff-notes.md`, `archive-browser.html`
  - `index.html` and `events.html` are the public discovery surfaces; `index.html` also exposes the current urgent live update when one exists.
  - `today.html` is the now attendance mode that prioritizes saved/live/upcoming events for quick action during travel or onsite use.
  - `today.json` is the machine-readable now priority feed for screens, app surfaces, lightweight integrations, and the current live-update alert.
  - `updates.html` and `updates.json` expose verified live changes, arrival notices, room changes, and session-linked alerts as a visitor-first feed.
  - `screen.html` is the venue-ready attendance screen for entrances, registration desks, and hall displays.
  - `activation.html` and `activation.json` list non-ready catalog events, their blockers, priority, and request links for turning them into live schedules.
  - `trust.html` and `trust.json` expose source confidence, approval state, live-schedule readiness, freshness, trust score, and evidence gaps for every catalog event.
  - `readiness.html` and `readiness.json` combine live, trust, and activation signals into the next operational decision for every event.
  - `sources.html` and `sources.json` define the source evidence needed for each event, automation boundary, and approval gate before public live publishing.
  - `candidates.html` and `candidates.json` hold discovered source leads before publication, including evidence state, duplicate risk, review gate, and next action.
  - `source-registry.json` publishes the prioritized source list for collectors, operators, and future automation.
  - `my-events.html` is the standalone local saved-events register for returning to saved events and exporting them as a calendar.
  - `events/*.html` are shareable event detail pages generated for each catalog record; when verified updates exist for the event, they appear directly on the detail page for direct-link visitors.
  - `cities/*.html` and `categories/*.html` are public discovery pages generated from the merged catalog for SEO, sharing, and focused browsing.
  - `events.ics` is the platform-level calendar feed, and `events/*.ics` are one-click calendar files for individual event records.
  - `sitemap.xml` and `robots.txt` expose the public discovery surfaces for crawlers.
  - `event.html` is the live schedule page for the current generated event.
  - `events.json` merges the current live event with optional catalog records from `data/events_catalog.json`.
  - `live-status.json` summarizes the platform's current live/upcoming/activation state for homepage widgets, screens, and future app surfaces.
  - `signage.html` is the venue-ready QR poster/screen page for entrances, registration desks, and hall screens.
  - `organizers.html` is the static organizer intake path for turning an event program into a live EventLive schedule.
  - `dist/delivery-package/` is the current ready-to-hand-off package folder.
- `reports/diffs/`
  - Diff evidence. `latest-diff.*` always points to the newest comparison.
- `reports/releases/`
  - Approved release manifests, release notes, share kits, release-specific HTML snapshots, and archive browser outputs.
  - `reports/releases/packages/<release-id>/` is the immutable release-specific delivery package folder.
- `data/published/`
  - Latest approved publishable program only.
- `data/archive/releases/`
  - Archived approved source documents by release ID.

## CI/CD
- Workflow: `.github/workflows/deploy.yml`
- Trigger: push to `master` or `main`, or manual workflow dispatch
- Deploy target: GitHub Pages
- Public base URL is resolved from `EVENTLIVE_PUBLIC_BASE_URL` during `npm run publish` and deploy verification. Use `https://eventme.live/` for production/public references unless an environment-specific preview URL is intentionally set.
- Current live site metadata is written to `dist/current-live-site.json` and copied into `dist/delivery-package/`.

## Product Scope
- Target use case: become the trusted live reference for event schedules in Arabic/Saudi contexts.
- Discovery value: users can enter EventLive first, search/filter events, and open the nearest live schedule.
- Homepage live-alert value: users landing on EventLive first see the most important current change before browsing the catalog.
- SEO discovery value: users can land directly on city and category pages such as Riyadh events or entrepreneurship events.
- Platform status value: users and future surfaces can see the live, next, and needs-activation state without parsing the full catalog.
- Catalog value: discovery can list multiple Saudi events while clearly marking which ones have live schedules ready.
- Detail value: every catalog event can have a standalone page for sharing, source trust, readiness, live timing, event-specific live updates, calendar save, and the next action.
- Discovery metadata value: public pages include canonical links, Open Graph/Twitter cards, sitemap, and robots output.
- Visitor value: current/next sessions, rooms, tracks, speakers, saved agenda, event calendar files, and share/print/calendar handoff.
- Now value: `today.html` gives the visitor a fast live-action surface for the closest saved or platform-priority event, with countdown, live link, calendar, and directions.
- Now feed value: `today.json` exposes the same public priority logic and the current live-update alert for future app surfaces, venue screens, and automation without parsing HTML.
- Live updates value: `updates.html`, `updates.json`, and linked event detail pages give visitors trusted urgent event-day changes, linked sessions, arrival guidance, and verified source details.
- Venue screen value: `screen.html` turns the now priority feed and urgent live-update alert into a large-format display with QR handoff for visitors.
- Activation value: `activation.html` and `activation.json` turn non-ready catalog records into an operational queue for organizer outreach and schedule activation.
- Trust center value: `trust.html` and `trust.json` make the public catalog auditable by showing source confidence, approval status, update freshness, readiness, and evidence gaps.
- Readiness value: `readiness.html` and `readiness.json` turn trust and activation data into an executive operating board for what is visitor-ready, activation-ready, or blocked.
- Source acquisition value: `sources.html` and `sources.json` turn missing evidence into a controlled intake pipeline for semi-automated discovery, extraction, validation, and approval.
- Source candidate value: `candidates.html` and `candidates.json` keep newly discovered events out of the public catalog until evidence, duplicate review, extraction, validation, and human approval are complete.
- Source registry value: `data/source_registry.json` defines where EventLive should search first and the intake policy for each source before creating candidates.
- Personal record value: users can save whole events locally, revisit them from the homepage or `my-events.html`, and export their saved-event register as a calendar.
- Live event value: countdown to start, event progress, live timeline, auto day focus, current/next jump, directions, gate/check-in/parking notes, and operational updates during the event window.
- Reliability value: PWA manifest, service-worker cache, offline reload for core pages, and fast sharing via copy/native share/WhatsApp.
- Venue activation value: generated QR codes and a print/display-ready signage page that opens the live schedule from `eventme.live`.
- Trust value: source label, approval status, publisher, verified live updates, and session-linked update badges in the timeline and cards.
- Organizer value: intake, validation, preview, diff, approval, publishing, archive, and delivery package evidence.
- Supply value: catalog records that are not live-ready can route organizers to the intake path instead of dead-ending.
- Current model: static visitor MVP plus internal operator workflow; marketplace discovery and automated acquisition are future expansion lanes.
- Internal ops pages remain separate from the visitor-facing program page.

## Data separation
- `data/demo_program.json` is for local demo and smoke verification only.
- `data/intake/` holds intake templates and working normalized files.
- `data/published/` holds the latest approved publishable program.
- `data/archive/releases/` holds archived approved versions by release ID.
- Operational runs should use `data/intake/current-program.json` or set `EVENTLIVE_SOURCE_FILE` explicitly instead of relying on demo data.

## Lifecycle references
- Data lifecycle: `DATA-LIFECYCLE.md`
- Concierge operations: `CONCIERGE-WORKFLOW.md`
- Event-day update policy: `EVENT-DAY-UPDATE-POLICY.md`
- Approval guidance: `APPROVAL-DECISION-GUIDE.md`
- Script map: `scripts/README.md`
- Report map: `reports/README.md`
- Search and AI visibility: `EVENTLIVE-SEARCH-AND-AI-VISIBILITY-STRATEGY.md`

## Product-facing output
- The generated page uses lightweight program branding from the normalized document.
- Share-ready release artifacts are generated during `npm run publish`.
- `npm run build` generates visitor QR assets and `dist/signage.html` for event-floor activation.
- `npm run build` generates `dist/organizers.html` with a structured mailto request for organizer onboarding.
- `npm run build` reads `data/events_catalog.json` when present; use `EVENTLIVE_EVENTS_CATALOG_FILE=path/to/catalog.json` to point at another catalog source.
- `npm run build` generates one detail page under `dist/events/` for each event record in the merged catalog, including event-specific live-update blocks when verified updates exist.
- `npm run build` generates `dist/live-status.json` and a homepage status center for live/next/activation priorities.
- `npm run build` surfaces the current urgent live-update alert on `dist/index.html` and highlights event cards with live updates.
- `npm run build` generates public city and category discovery pages under `dist/cities/` and `dist/categories/`.
- `npm run build` generates `dist/today.html` as a now attendance mode using saved events first and platform priorities as fallback.
- `npm run build` generates `dist/today.json` as a compact now priority feed with focus, queue, signals, action links, and the current live-update alert.
- `npm run build` generates `dist/updates.html` and `dist/updates.json` as a live updates center for visitor-facing changes, arrival notices, and session-linked alerts.
- `npm run build` generates `dist/screen.html` and `dist/qr-today.svg` for venue display screens, urgent live-update visibility, and QR handoff to the now page.
- `npm run build` generates `dist/activation.html` and `dist/activation.json` for live-schedule activation candidates, blockers, and request links.
- `npm run build` generates `dist/trust.html` and `dist/trust.json` as the public trust center and machine-readable source evidence feed.
- `npm run build` generates `dist/readiness.html` and `dist/readiness.json` as the operational readiness board for live, trust, activation, and blocker decisions.
- `npm run build` generates `dist/sources.html` and `dist/sources.json` as the source acquisition pipeline and automation-boundary feed.
- `npm run build` generates `dist/candidates.html` and `dist/candidates.json` as the pre-publication source candidate intake queue.
- `npm run build` copies the prioritized source registry to `dist/source-registry.json` for future collectors and review tools.
- `npm run sources:collect` reads `data/source_registry.json`, fetches supported public sources, stores raw snapshots under `data/raw/source-snapshots/`, writes candidates to `data/source_candidates.json`, and records `reports/source-collection-report.*`.
- `npm run sources:auto-publish` promotes trusted official/partner candidates into `data/events_catalog.json` without manual approval, while blocking weak or duplicate candidates.
- `npm run sources:sync` runs the periodic acquisition path: collect, auto-publish, validate, build, and source ops reporting.
- `npm run sources:review` updates one candidate's review gate by `EVENTLIVE_REVIEW_ID` and `EVENTLIVE_REVIEW_ACTION`, records reviewer metadata, and writes `reports/source-review-report.*`.
- `npm run sources:promote` copies only approved candidates into `data/events_catalog.json`; set `EVENTLIVE_PROMOTE_IDS=candidate-id` for a controlled promotion or `EVENTLIVE_PROMOTE_ALL=1` for all approved candidates.
- `npm run sources:ops` writes a unified source operations report with collection coverage, source health, candidate funnel, focus queue, and the next executive action.
- `npm run build` includes a local saved-events register in discovery, event detail pages, and `dist/my-events.html` using browser storage.
- `npm run build` generates `dist/events.ics` for the merged catalog and one `dist/events/*.ics` calendar file per event.
- `npm run build` generates SEO/social metadata, `dist/sitemap.xml`, and `dist/robots.txt`.
- `npm run validate` also validates the optional catalog against `data/events-catalog.schema.json`, including duplicate IDs, invalid dates, readiness/url consistency, and missing configured catalog files.
- `npm run validate` validates `data/source_candidates.json` against `data/source-candidates.schema.json`, including duplicate IDs, invalid dates, candidate readiness gates, and possible catalog duplicates.
- `npm run validate` validates `data/source_registry.json` against `data/source-registry.schema.json`, including duplicate IDs, source priorities, trust level, fetch method, intake policy, and evidence requirements.
- `npm run publish` also generates the final delivery manifest, handoff notes, and delivery package folders.
- `npm run publish` resolves live `program / print / share` URLs when `EVENTLIVE_PUBLIC_BASE_URL` is set.
- Archived approved versions can be browsed through `reports/releases/archive-browser.html`.
