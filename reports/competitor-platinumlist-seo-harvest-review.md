# EventLive Competitor Review: Platinumlist Riyadh

Generated: 2026-07-08

## Executive Decision

Platinumlist Riyadh is a high-value benchmark for EventLive, especially for search intent pages such as:

- `فعاليات الرياض اليوم`
- `فعاليات الرياض الويكند`
- `فعاليات الرياض هذا الشهر`
- ticketed entertainment, comedy, concerts, shows, sports, and experiences

It should not be treated as an auto-publish source. The current public request to `https://riyadh.platinumlist.net/ar/calendar/today` redirects through Queue-it / Cloudflare protection. EventLive must not bypass this protection. The source belongs in the discovery / partnership lane.

## Why It Ranks

Observed public SERP and page signals:

- It owns direct search-intent landing pages: today, weekend, month, all events.
- It uses a city-specific host: `riyadh.platinumlist.net`, which reinforces Riyadh relevance.
- The page title directly matches user intent: "الفعاليات اليوم في الرياض".
- It exposes many visible event cards with dates, prices, images, and category links.
- It has deep internal category navigation: comedy, concerts, sports, theatre, business, gaming, exhibitions.
- It has commercial freshness signals: "new", "selling fast", "best prices", prices, and ticket availability.
- It keeps a broad inventory because it is a ticketing marketplace, not only an editorial calendar.

## Harvest Assessment

| Item | Finding | EventLive action |
|---|---|---|
| Direct fetch | Redirects to Queue-it / Cloudflare protection | Do not bypass. Mark as protected discovery / partnership. |
| Page value | High SERP and UX value | Use as benchmark for our landing pages. |
| Data rights | Ticketing marketplace content | Do not auto-publish from it without official event confirmation. |
| Best use | Discovery, dedupe, ticket-link evidence, partnership radar | Add to registry as candidate-only. |
| Alternative route | Official organizer, venue, season, or Visit Saudi source | Promote only when official evidence exists. |

## What We Should Copy As Product Pattern

We should apply the pattern, not the content:

1. Time-intent pages:
   - `saudi-events-today.html`
   - `riyadh-events-today.html`
   - `weekend.html`
   - `this-month.html`

2. City-intent pages:
   - Riyadh, Jeddah, Dhahran, AlUla, and every active Saudi city page must have useful event lists, not empty SEO shells.

3. Category-intent pages:
   - Comedy / entertainment / sports / concerts / exhibitions / business / technology training should map into EventLive taxonomy.

4. Rich cards:
   - Date, city, venue, image, source, price/free signal when available, calendar link, directions link, and live countdown.

5. Freshness:
   - Every generated landing page should show `lastmod` in sitemap and visible "last updated" text in the page.

6. Internal linking:
   - Pages must connect: today -> city -> category -> event detail -> source methodology.

## Current EventLive Gap

EventLive now has the right foundation, but needs a stronger second layer:

- More pages targeting Arabic commercial/event queries by city and time.
- Better price/ticket signal normalization when source data contains it.
- More high-resolution event images.
- Stronger "near me / today / weekend / this month" visitor paths.
- More official confirmation for marketplace-discovered events.

## Implementation Completed In This Pass

- Added `platinumlist-riyadh` to `data/source_registry.json`.
- Classified it as `candidate-only`.
- Recorded Queue-it / Cloudflare as a protected collection boundary.
- Improved probe classification so Queue-it pages are treated as `blocked-or-protected`.
- Added a regression test protecting Queue-it classification.

## Operating Rule

Platinumlist is a benchmark and discovery source, not a direct auto-publish feed.

The correct workflow is:

`discover from marketplace signal -> dedupe -> find official organizer/venue/season evidence -> promote candidate only when evidence is complete -> publish EventLive page with source links`

## Sources Reviewed

- `https://riyadh.platinumlist.net/ar/calendar/today`
- `https://riyadh.platinumlist.net/`
- `https://webook.com/en/page/events-happening-today`
- `https://www.eventbrite.com/d/saudi-arabia/events/`
- Google Search results for `فعاليات الرياض اليوم`, `فعاليات السعودية اليوم`, and `Saudi events today`
