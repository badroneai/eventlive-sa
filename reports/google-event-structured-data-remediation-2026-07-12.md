# Google Event structured data remediation

- Date: 2026-07-12
- Site: https://eventme.live/
- Trigger: Search Console warning `WNC-10030322`
- Status: implemented and regression-tested locally; deployment and Google recrawl are still required

## What the Search Console message means

The message reports five non-critical recommendation types, not five broken event pages. Google can still read and index the current `Event` entities. The requested fields improve eligibility and interpretation, but they must not be invented when the source does not provide them.

The reported recommendations were:

1. `organizer.url`
2. `performer`
3. `offers`
4. `offers.availability`
5. `offers.validFrom`

## Evidence policy

- `organizer.url`: emit an explicit organizer URL, or the canonical domain of a trusted registry source that represents that organizer.
- `performer`: emit only explicit performers or named agenda speakers. Do not use the organizer, venue, or category as a performer.
- `offers`: emit only when an active event has a real registration, ticket, or action URL.
- `offers.price`: emit `0` only for an event explicitly marked free; otherwise retain a verified numeric price or omit it.
- `offers.availability`: emit only an explicit supported state such as `InStock`, `SoldOut`, or `PreOrder`.
- `offers.validFrom`: emit only the verified date on which ticket sales or registration become available.
- Completed events do not receive a new offer merely to satisfy a recommendation.

## Coverage before and after

The baseline was a live production sample of 24 event pages inspected on 2026-07-12. The post-remediation figures are from all 1,173 locally generated Arabic event detail pages.

| Property | Live sample before | Local build after | Decision |
|---|---:|---:|---|
| `organizer.url` | 0 / 24 | 1,161 / 1,173 (99.0%) | Broadly repaired from trusted source ownership |
| `performer` | 0 / 24 | 3 / 1,173 event entities | Evidence-only; many events genuinely have no performer data |
| `offers` | 0 / 24 | 181 / 1,173 | Added only where a real action URL exists |
| `offers.availability` | 0 / 24 | 0 / 181 offers | Deliberately omitted until a source supplies a sale state |
| `offers.validFrom` | 0 / 24 | 0 / 181 offers | Deliberately omitted until a source supplies an on-sale date |
| free offer price | 0 / 24 | 115 / 181 offers | Explicit free events only |

Twelve pages retain an organizer without a URL because their organizer identity cannot yet be mapped safely. Most are aggregator or incomplete organizer labels. This is preferable to linking them to an unrelated official domain.

## Implementation

- Centralized Event structured-data construction in `scripts/event-structured-data-utils.mjs`.
- Reused one organizer resolver for event pages, session entities, and public event JSON.
- Preserved source-registry priority when aliases collide, preventing lower-priority evidence sources from replacing the canonical organizer domain.
- Added evidence extraction from source `Event` JSON-LD for organizer URL, performer, offer URL, availability, sale date, and price.
- Carried the new fields through candidate collection, promotion, automatic publishing, and schema validation.
- Added the structured-data helper to the smart-build template fingerprint.
- Added a one-time SEO refresh when public templates change, so sitemap `lastmod` and the search notification queue reflect a markup-only release.

## Build and discovery result

The first build after the template change produced:

- 1,173 event pages regenerated.
- 1,173 SEO page states marked changed.
- 2,486 Arabic and English URLs queued for search-engine notification.
- 1,280 Arabic routes and 1,280 English routes generated.
- Output contract: PASS.

Normal six-hour syncs remain incremental after this one-time refresh. New source detail pages can now populate the evidence-backed fields automatically when their JSON-LD exposes them.

A second unchanged build verified that behavior:

- Requested and completed mode: incremental.
- Duration: 54.2 seconds, compared with 183.6 seconds for the one-time full refresh.
- Event details rendered: 0.
- Event details reused: 1,173.
- Localized routes reused: 1,173.
- SEO pages changed: 0.
- IndexNow URLs queued: 0.
- Output contract: PASS.

## Validation

- `test:seo-structured-data`: PASS
- `test:incremental-build`: PASS
- Visit Saudi organizer-domain collision regression: PASS
- Unknown offer availability is never invented: PASS
- Ended events do not receive artificial offers: PASS
- Source Event JSON-LD evidence extraction: PASS

## Search Console follow-up

After deployment, allow Google to recrawl the updated pages, then use **Validate fix** in Search Console. Validation may take days or weeks. Some recommendation counts can remain for event types that truthfully have no performer, ticket offer, availability state, or sale-start date; eliminating those warnings with fabricated values would make the markup less trustworthy.
