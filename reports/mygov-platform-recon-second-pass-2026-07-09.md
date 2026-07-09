# GOV.SA / NEC Platform Recon - Second Pass

Explored at: 2026-07-09

Role lens: clean integration architect, archive-forensics analyst, and government data product strategist.

## Decision Update

GOV.SA should still not be scraped directly. The stronger finding is that GOV.SA event pages are a public mirror over a richer government event data model.

The best EventLive path is now sharper:

1. Request NEC National Calendar access, specifically the view/export capability behind `View National Calendar Events`.
2. Use GOV.SA indexed/archived detail pages as evidence and parser training.
3. Use `istitlaa.ncc.gov.sa` as a secondary official confirmation lane for public-consultation events.
4. Keep DGA API Inventory as the formal route for technical integration language.

## What Changed In This Pass

The first pass proved the public page is protected. This pass looked for platform mechanics.

Findings:

- Live Playwright access to GOV.SA service pages still reaches Cloudflare `Just a moment...`.
- Wayback archived GOV.SA event HTML includes a Next.js/React Flight payload, not just rendered text.
- The embedded event payload carries Drupal-style node fields such as `nid`, `uuid`, `feeds_item`, `field_ne_event_date`, `field_ne_event_website`, `field_ne_event_type`, `field_ne_organizer_name`, `field_ne_cover_photo`, and `field_feeds_id`.
- Older payload data shows `feeds_item` labels like `Events` and `Events EN`, plus a `field_feeds_id` example like `CONT-events-2406202119`.
- Several archived events include official consultation links on `istitlaa.ncc.gov.sa`.
- The NEC e-services Angular app at `https://login.nec.gov.sa/app/agreements` exposes a static service catalog for National Calendar workflows and points to `https://eservices-service.nec.gov.sa/` as the backend API base.

## GOV.SA Event Data Model

The archived event pages expose a model that looks like this:

| Field | Meaning for EventLive |
|---|---|
| `nid` | GOV.SA / Drupal node ID, same numeric event ID used in `/events/{id}` |
| `uuid` | Stable content UUID |
| `feeds_item` | Import/feed provenance such as `Events` and `Events EN` |
| `field_feeds_id` | External/import feed identifier when present |
| `field_ne_event_date` | Structured start/end date |
| `field_ne_event_type` | Category/taxonomy term |
| `field_ne_organizer_name` | Structured organizer label |
| `field_ne_event_website` | External registration/event URL |
| `field_ne_cover_photo` | Image asset path |
| `field_ne_event_city` / `region` / `site` | Location candidates |
| `field_ne_phone` / email fields | Contact candidates |

This is materially better than snippet parsing. It means our archive radar can train the parser against the true source schema while we wait for an approved live feed.

## Implemented Capability

Updated `scripts/mygov-wayback-radar.mjs` to extract structured fields from the embedded Next/Drupal payload.

Latest run:

- CDX rows: 12
- Captures attempted: 10
- Events extracted: 10
- Date-complete: 10
- Structured payloads: 10
- Failures: 0

New JSON fields include:

- `platform_model`
- `drupal_nid`
- `drupal_uuid`
- `feeds_id`
- `feeds_item_ids`
- `feeds_item_labels`
- `event_website_url`
- `event_website_title`
- `cover_image_url`
- `google_maps`

Policy remains unchanged: archive output is evidence and parser training, not auto-publish material.

## NEC E-Services Discovery

`https://login.nec.gov.sa/app/agreements` returned a static Angular app.

Observed configuration:

- `serverUrl`: `https://login.nec.gov.sa`
- `WebApiUrl`: `https://eservices-service.nec.gov.sa/`
- `IdentityIssuer`: `https://login.nec.gov.sa`
- OAuth/OpenID-style scope text includes `openid profile email roles skoruba_identity_admin_api`
- Session status endpoint string: `api/Session?sessionId=`
- User entity claims reference `JeddahCalendar` and `EventsCommitee`

Observed e-services routes:

- `/e-services/list`
- `/e-services/details/`
- `/agreements/accessibility`
- `/agreements/security`
- `/agreements/service-level`
- `/agreements/privacy`

The backend root and `/swagger` returned `404`, so no anonymous API documentation was exposed. Treat the backend as authenticated and relationship-gated.

## NEC National Calendar Service Catalog

The Angular bundle includes three National Calendar services:

| ID | Service | Value for EventLive |
|---|---|---|
| 1 | Add Event to the National Calendar | Confirms the official event intake workflow and approval process |
| 2 | View National Calendar Events | Highest-value data access lane because it includes filtering and export |
| 3 | National Calendar Dashboard | Confirms map/charts/dashboard view across Saudi regions |

Important service-language evidence:

- Add Event says entities add and review events so they are reflected on the National Calendar.
- View National Calendar Events says authorized users can view event data for all Saudi regions or scoped regions/entities, with filtering and export.
- National Calendar Dashboard says it displays events on a map for all Saudi regions with charts to support decision-making.

This makes `View National Calendar Events` the precise strategic ask, not generic GOV.SA scraping.

## Istitlaa / Public Consultation Lane

Many archived GOV.SA e-participation records link to `https://istitlaa.ncc.gov.sa/...`.

Observed access:

- `istitlaa.ncc.gov.sa` redirects to `/ar/Pages/default.aspx`.
- It returns SharePoint-style HTML and public search routes such as `/ar/search/Pages/projects.aspx`.
- Status filters are visible in public links: `Coming`, `Finished`, `NearFinished`, and `Valid`.

Use this lane for:

- confirming consultation-style events,
- resolving official registration/project URLs,
- categorizing GOV.SA records as public consultation / e-participation,
- not as a replacement for the NEC National Calendar feed.

## Practical Harvest Strategy

### Ring 1: NEC Authorized Export

Ask for access to `View National Calendar Events`, or an API/export equivalent, with:

- event ID,
- title Arabic/English,
- organizer/entity,
- category/classification,
- calendar year,
- region/city/venue/site,
- start/end date,
- approval/status,
- official URL,
- registration/event website URL,
- cover image URL,
- last updated timestamp.

### Ring 2: GOV.SA Structured Archive Radar

Use `npm run sources:mygov:wayback` to:

- validate parser mappings,
- recover historical source evidence,
- discover official external links,
- understand feed provenance.

### Ring 3: Istitlaa Confirmation

Use public consultation links from GOV.SA payloads to corroborate events that are really consultation/project windows, not public attendance events.

### Ring 4: Search-Indexed GOV.SA Detail Radar

Keep search-indexed current pages as candidate/evidence leads only.

## Source Rights Decision

Do not:

- bypass Cloudflare,
- call authenticated NEC backend endpoints without credentials,
- infer live current events from archived pages,
- publish from GOV.SA alone.

Do:

- request NEC export/API access,
- use DGA API Inventory language for the integration request,
- use archived payloads to harden parser field mappings,
- use Istitlaa as an official secondary proof lane.

