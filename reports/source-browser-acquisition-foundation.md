# EventLive Browser Acquisition Foundation

Generated: 2026-07-05

## Executive Decision

Browser-level acquisition is now a core EventLive capability. It is not a replacement for official APIs or source policy. It is the diagnostic layer that reveals how a public page obtains its event data before we write a durable collector.

## Cafe Platform Lessons Imported

| Platform experiment | Lesson | EventLive rule |
|---|---|---|
| HungerStation | Open page with a browser, wait for hydration, then read `__NEXT_DATA__` instead of fragile visible text. | Capture hydration payloads and treat them as better evidence than listing-card text. |
| TryOrder | Discover tenant/subdomain context first, then use the structured API behind the tenant. | Detect hidden tenant/API context from links, scripts, and network before writing extractors. |
| Jahez | Classify fetchability first: API JSON, JSON-LD, hydration, sparse shell, protected, or blocked. | Browser probe produces a source classification before extractor work. |
| ToYou | Useful as discovery/locality evidence, but presence is not always extraction quality. | Separate discovery value from publishable event evidence. |
| TheChefz | Concrete detail pages can be structured enrichment even when broad city pages fail. | Prefer detail-page or endpoint evidence over broad landing pages. |

## New Project Capability

Command:

```bash
npm run sources:browser-probe
```

Target specific sources:

```bash
EVENTLIVE_BROWSER_SOURCE_IDS=monshaat-events,moc-cultural-calendar npm run sources:browser-probe
```

Outputs:

- `reports/source-browser-probe-report.json`
- `reports/source-browser-probe-report.md`
- `data/raw/browser-probes/*.html`
- `data/raw/browser-probes/*.png`

The report captures:

- rendered DOM text,
- event-like links,
- date snippets,
- `__NEXT_DATA__` / Nuxt / JSON-LD signals,
- XHR/fetch/API/GraphQL/internal endpoints,
- request POST bodies,
- response shape previews,
- screenshots and HTML snapshots,
- next action per source.

## Current Classifications

The browser layer uses these classifications:

- `browser-network-api`: stable endpoint candidate found; write a JSON collector.
- `browser-hydration-payload`: extract from Next/Nuxt/app state.
- `browser-structured-html`: use JSON-LD or structured scripts.
- `rendered-html-candidates`: DOM extractor can work, but keep it conservative.
- `rendered-text-review`: source needs human inspection before extractor work.
- `empty-or-shell`: find API/alternate path before collector work.
- `blocked-or-protected`: do not bypass; move to partnership/API or evidence-only.
- `policy-skipped-partnership`: source is intentionally outside public browser acquisition.

## Why This Changes The Source Strategy

Before this foundation, a zero-yield source could mean either:

- no events,
- weak extractor,
- hidden API,
- delayed client payload,
- source structure changed,
- or policy-protected lane.

Now `sources:browser-probe` can distinguish those cases. This makes future source onboarding faster and safer because the extractor is written after the page tells us where its real payload lives.
