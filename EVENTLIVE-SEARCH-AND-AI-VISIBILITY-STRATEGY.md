# EventLive Search and AI Visibility Strategy

Last reviewed: 2026-07-11
Canonical domain: https://eventme.live/
Canonical brand: EventLive

## Objective

Make EventLive the most useful Saudi event result for intent-led searches such as events today, events in a city, conferences, exhibitions, courses, and live attendance questions. No technical change can guarantee a first-page position; this operating contract maximizes crawl eligibility, factual quality, index freshness, and the user signals that ranking systems can evaluate.

## Current diagnosis

- Search still exposes a previously indexed EventMe product page even though the live site is now EventLive. This is an index refresh and entity-consistency problem, not a keyword-volume problem.
- The live site already has strong foundations: unique event URLs, Arabic and English alternates, canonical links, event pages, image sitemap entries, RSS/JSON/ICS feeds, and source evidence.
- Event `lastmod` previously followed collector timestamps that changed every sync. Search engines could therefore learn to distrust sitemap freshness.
- Every event previously emitted an `Offer`, including ended events and rows that only had a source URL. This was inaccurate structured data.
- Owner-only machine feeds were promoted in AI discovery files. Public discovery now points to public feeds only.
- Google Search Console ownership and indexing evidence remain account-bound. Code can prepare and monitor the site, but the owner account must verify the property and submit the sitemap once.

## Shipped operating model

### Every build

1. Build the public Arabic event pages.
2. Compare each event's visible/searchable fields to its persisted semantic fingerprint.
3. Preserve the prior page modification time when nothing meaningful changed.
4. Update `lastmod` only when title, time, status, place, source, image, access, audience, program, or sessions changed.
5. Generate reciprocal Arabic and English pages and `hreflang` links.
6. Validate Event, Organization, WebSite, breadcrumb, sitemap, robots, public feeds, and AI discovery contracts.

### After deployment

1. Submit only new, changed, or removed event URLs and their affected discovery pages to IndexNow during the six-hour source sync.
2. Submit the full public sitemap after a code release because shared templates and metadata may have changed across the site.
3. Keep Google discovery sitemap-led. Do not use Google's Indexing API for normal event pages; it is not the supported route for this content type.

### Operational evidence

- Every IndexNow attempt writes `reports/indexnow-submission-receipt.json` before returning. The receipt records only the timestamp, mode, outcome, HTTP response code, URL count, and attempt number; it excludes the key, submitted URLs, endpoint, response body, and error text.
- Code-release and source-sync workflows retain that receipt as an artifact after the non-blocking IndexNow step. A failed notification therefore remains observable without blocking an otherwise healthy site release.
- `npm run seo:crawler-evidence` uses `curl` to probe the production home page and one sitemap event page as Bingbot, OAI-SearchBot, and PerplexityBot, evaluates effective robots rules, detects common WAF challenges, and verifies the redacted IndexNow key-file contract. It writes `reports/search-crawler-production-evidence.json` and `.md` and exits non-zero when any evidence gate fails.
- An accepted IndexNow HTTP response proves receipt of the notification, not indexing. Bing Webmaster Tools remains the owner-controlled source for final indexing evidence.

## Structured data policy

- `WebSite` and the canonical `Organization` entity identify EventLive at the home surface.
- Every event leaf page uses `Event` with source-aligned dates, attendance mode, place, organizer, image, and description.
- `Offer` appears only when an active ticket or registration URL exists. Ended events and source-only links never claim inventory.
- `isAccessibleForFree` appears only when free or paid access is explicitly known.
- Structured descriptions prefer official source text that is also visible on the event page.
- High-quality source images remain crawlable through page markup and image sitemap entries.

## AI discovery policy

- Google AI features use normal Search eligibility; no special AI schema or machine file is required.
- `llms.txt` is supplemental guidance, not a ranking mechanism.
- OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, and Claude-User are explicitly allowed to crawl public pages.
- Public AI references should use canonical event pages, `live-status.json`, `feeds/all.json`, `feeds/all.xml`, and `sitemap.xml`.
- Candidates, owner feeds, drafts, discovery-only evidence, and protected-source internals are never promoted as confirmed public events.

## Owner account actions

These are one-time account actions, not recurring manual publishing:

1. Verify the `eventme.live` domain property in Google Search Console.
2. Submit `https://eventme.live/sitemap.xml`.
3. Use URL Inspection to request recrawl for `/`, `/events.html`, and one representative upcoming event page after this release.
4. Add and verify the site in Bing Webmaster Tools, then monitor the IndexNow report.
5. Review Event enhancement, Page indexing, Core Web Vitals, search queries, countries, devices, and pages monthly.

The hidden owner page `/owner-status.html` links directly to Search Console, Bing Webmaster, Rich Results Test, and PageSpeed and reports the current IndexNow queue.

## Measurement

### Weekly

- Indexed public pages versus sitemap URLs.
- Newly discovered and recrawled event pages.
- Event structured-data errors and warnings.
- Search impressions, clicks, CTR, and average position by query group.
- Organic landings on event, city, time-window, category, and guide pages.
- Search-to-event-open, calendar download, directions click, and organizer conversion.

### Monthly

- Branded query consistency: EventLive versus stale EventMe results.
- Non-branded visibility for Saudi, city, today, week, conference, exhibition, course, family, sports, and free-event intent.
- Indexed Arabic/English parity and `hreflang` errors.
- Referral traffic from Google, Bing, ChatGPT, Perplexity, and Claude where referrers are available.
- Pages with impressions but weak CTR, and pages with ranking potential but thin source detail.

## Guardrails

- Do not create mass pages that do not answer a distinct visitor need.
- Do not manufacture reviews, ratings, prices, ticket availability, authorship, or freshness.
- Do not rewrite official source text merely to create keyword variation.
- Do not mark application windows, discounts, opening hours, or generic programs as momentary events when they are not.
- Do not promise first-page ranking; prove progress through Search Console and visitor actions.

## Primary references

- Google Event structured data: https://developers.google.com/search/docs/appearance/structured-data/event
- Google structured data policies: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google AI features and websites: https://developers.google.com/search/docs/appearance/ai-features
- Google site names: https://developers.google.com/search/docs/appearance/site-names
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- IndexNow protocol: https://www.indexnow.org/documentation
- OpenAI web crawler guidance: https://help.openai.com/en/articles/20001243-advertiser-guidance-for-allowing-openai-web-crawlers
- Perplexity crawler guidance: https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- Anthropic crawler guidance: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
