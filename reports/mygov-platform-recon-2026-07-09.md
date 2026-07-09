# GOV.SA Events Platform Recon

Probed at: 2026-07-09

Source under review: `https://my.gov.sa/ar/events`

## Executive Decision

GOV.SA is valuable for EventLive, but not as a direct scraper target.

Best use:

1. Official API / feed partnership lane.
2. NEC National Calendar relationship lane.
3. Wayback-backed parser lab for archived GOV.SA pages.
4. Source-evidence lane for indexed event detail pages.
5. Corroboration and enrichment layer for events already found through NEC, Visit Saudi, ministries, chambers, and ticketing sources.

Do not promote GOV.SA to `auto_publish` until an approved feed/API path exists and a small sample gate passes.

## Access Findings

| Surface | Probe result | Harvest decision |
|---|---|---|
| `https://my.gov.sa/ar/events` | HTTP `403`, `cf-mitigated: challenge` | Do not scrape directly |
| `https://my.gov.sa/ar/events/{id}` | HTTP `403`, Cloudflare managed challenge | Do not scrape directly |
| `https://my.gov.sa/en/events/{id}` | HTTP `403`, Cloudflare managed challenge | Do not scrape directly |
| `https://my.gov.sa/robots.txt` | HTTP `403`, Cloudflare challenge | Cannot rely on unauthenticated robots/sitemap probe |
| `https://my.gov.sa/sitemap.xml` | HTTP `403`, Cloudflare challenge | Cannot rely on unauthenticated sitemap probe |
| Public search indexes | Event details and snippets are indexed | Safe as low-volume evidence discovery, not raw publication |
| Wayback CDX | 12 archived GOV.SA event captures found for 2025-2026 window | Useful parser lab and historical evidence |
| DGA API Inventory | Public DGA page describes official API inventory and direct technical integration governance | Use for partnership/API request path |
| DGA Open Data | DGA says open data should be machine-readable and non-discriminatory when published | Use as request/open-data lane |
| NEC e-services | Search-indexed National Calendar Dashboard and Add Event service point to NEC backend | Highest-value relationship path |

Playwright did not pass the challenge after waiting. The challenge page explicitly says GOV.SA is performing security verification and uses Cloudflare bot protection. Harvest OS rule: do not bypass bot protection.

## Platform Model

Observed route model:

- Listing route: `/ar/events`
- Detail route: `/ar/events/{numeric_id}`
- English detail route likely mirrors: `/en/events/{numeric_id}`
- IDs are numeric and non-sequential in practice.
- Some pages are current/future events, while many are legacy archive records.

The platform appears to be a national government index rather than a single organizer calendar. Its event detail pages aggregate:

- public events,
- government entity events,
- e-participation/public consultation events,
- cultural events,
- economic/business events,
- IT and technology events,
- tourism/entertainment events,
- training/workshop style records.

## Event Detail Fields

Indexed details consistently expose this usable schema:

| Field | Evidence quality | Notes for EventLive |
|---|---|---|
| `title` | Strong | Arabic title is present in index snippets and detail render |
| `category` | Strong | Often one or more Arabic categories |
| `organizer` | Strong | Usually ministry, authority, chamber, company, or program owner |
| `email` | Medium | Present for some official sources, sometimes `لاتوجد بيانات` |
| `phone` | Medium | Present for some records, sometimes `لاتوجد بيانات` |
| `location` | Medium | City, venue, or `لايوجد موقع`; not always normalized |
| `date_range` | Strong when present | Format normally `YYYY-MM-DD - YYYY-MM-DD`; some records say `لاتوجد بيانات` |
| `description` | Strong | Short Arabic body text is indexed |
| `image` | Medium | Present in page render but not always useful as a reusable image source |
| `registration_link` | Unknown | Page has a registration section, but target URL needs approved access |
| `external_event_site` | Medium | Some older pages show `موقع الفعالية` / `المزيد` |
| `share_links` | Low | Useful for UI parity only, not event data |

## Indexed Sample Evidence

| GOV.SA URL | Event | Category / organizer signal | Date signal |
|---|---|---|---|
| `/ar/events/1820847` | مهرجان الكتاب والقراء 2026 | Cultural, Ministry of Culture | `2026-01-09 - 2026-01-15` |
| `/ar/events/2024260` | معرض الدفاع العالمي 2026 | General/strategic event | `2026-02-08 - 2026-02-12` |
| `/ar/events/1926197` | منتدى مستقبل العقار 2026 | Real estate / forum | `2026-01-26 - 2026-01-28` |
| `/ar/events/1820885` | مؤتمر التعدين الدولي | Ministry of Industry and Mineral Resources | `2026-01-13 - 2026-01-15` |
| `/ar/events/2776914` | أسبوع المياه السعودي 2026 | General / Saudi Water Week | `2026-06-28 - 2026-07-02` |
| `/ar/events/2047491` | بينالي الدرعية للفن المعاصر 2026 | Tourism/entertainment, Visit Saudi | `2026-01-30 - 2026-05-02` |
| `/ar/events/2321178` | منتدى العمرة والزيارة 2026 | Umrah/visit sector | `2026-03-30 - 2026-04-01` |
| `/ar/events/1491169` | بلاك هات | Cybersecurity conference | `2025-12-02 - 2025-12-04` |
| `/ar/events/2708079` | أسبوع ريادة الأعمال الاجتماعية | Economic / Monsha'at style signal | `2026-06-14 - 2026-06-18` |
| `/ar/events/2577171` | معرض رقميات التقني - النسخة الثانية | IT event | `2026-05-12 - 2026-05-13` |

This is enough to confirm that GOV.SA has future, date-complete records worth using as evidence. It is not enough to publish automatically because direct official page verification is blocked from this environment.

## New Finding: Wayback Parser Lab

The Wayback Machine CDX endpoint returned archived GOV.SA event pages for both Arabic and English routes.

Implemented local radar:

- Script: `scripts/mygov-wayback-radar.mjs`
- Command: `npm run sources:mygov:wayback`
- JSON report: `reports/mygov-wayback-radar.json`
- Markdown report: `reports/mygov-wayback-radar.md`
- Raw snapshots: `data/raw/mygov-wayback-radar/`

Latest sample run:

- CDX rows: 12
- Captures attempted: 8
- Events extracted: 8
- Date-complete: 8
- Failures: 0

Useful extracted examples:

| Event ID | Title | Date | Organizer |
|---|---|---|---|
| `11747` | Digital Entrepreneurship Policy Project | `2021-05-27 - 2021-06-10` | Ministry of Communications and Information Technology - Transport and Communication Sector |
| `1821754` | Participation in disclosing opinions on Localization Policy for MRO&O of Military Equipment | `2025-12-23 - 2026-01-23` | General Authority for Military Industries |
| `267222` | Participation in disclosing opinions on Updated Regulatory Framework for SPACs | `2025-04-08 - 2025-05-08` | Capital Market Authority |
| `36036` | Participation in disclosing opinions on Requirements for sales centers and outlets for deregistered vehicles | `2025-02-19 - 2025-03-06` | Ministry of Municipalities & Housing |

Decision: this is a real capability, but it is an archive/evidence capability. It can teach the parser and recover historical evidence. It must not publish current public catalog rows without a live official confirmation source.

## New Finding: NEC National Calendar Backend Lane

Search-indexed GOV.SA service pages reveal two stronger official paths:

- `National Calendar Dashboard` / `لوحة بيانات التقويم الوطني`
- `Add Event to the National Calendar`

The indexed service description says the dashboard enables government entities to view national-calendar event data through an interactive dashboard with events on a map for all Saudi regions and charts. The add-event service points users to the National Events Center e-services portal, then to `National Calendar > Events Data`.

NEC public portal paths found:

- `https://login.nec.gov.sa/`
- `https://login.nec.gov.sa/app/agreements`

Direct terminal access to the NEC login portal returned a request-rejected page in this environment, so it should be treated like a relationship/authenticated-services lane, not a scraping target.

Implication: if EventLive wants the maximum-quality official dataset, the request should target NEC National Calendar data, not the public GOV.SA event pages.

## Official API / Partnership Path

DGA's API Inventory page states that the service enables government entities to inventory and register API endpoints for direct technical integration with their systems, accessible to the private sector and public developers. It also defines APIs as procedures that allow access to data and functions of a system for external applications and automatic data sharing.

Operational implications for EventLive:

- The proper long-term path is an approved API/feed request, likely through GOV.SA, DGA, NEC, or the relevant government service channel.
- The expected process is not anonymous scraping: DGA references `Raqmi`, single sign-on, agency registration, and service submission/update workflow.
- If EventLive seeks formal access, the ask should be narrow: public event index feed with event ID, title, category, organizer, start/end date, location, official detail URL, registration URL, image URL, and last-updated timestamp.

## Harvest Strategy

### Ring A: Partnership Feed

Status: target path.

Required feed fields:

- `govsa_event_id`
- `locale`
- `title`
- `categories`
- `organizer_name`
- `organizer_entity_id` when available
- `starts_at`
- `ends_at`
- `city`
- `venue`
- `location_label`
- `description`
- `registration_url`
- `official_detail_url`
- `image_url`
- `last_updated_at`

Sample gate:

- At least 10 future records.
- At least 80% with valid date range.
- At least 70% with city or useful location label.
- 100% with detail URL.
- Dedupe against NEC, Visit Saudi, Ministry of Culture, Monsha'at, webook, Hala Yalla, and chambers.

### Ring B: Indexed Detail Radar

Status: manual-review/evidence only.

Use low-volume search discovery, not automated publication:

- Query for `site:my.gov.sa/ar/events/ "2026" "تاريخ الفعالية"`.
- Query by sector: `"فعاليات تقنية المعلومات"`, `"فعاليات اقتصادية"`, `"ترفيه - سياحة"`, `"ثقافية"`, `"فعاليات المشاركة الإلكترونية"`.
- Extract only URL, title, date snippet, category snippet, and organizer snippet.
- Treat records as `candidate_only` until confirmed by another official page or a future GOV.SA feed.

Promotion rule:

- GOV.SA indexed record + independent official organizer source = promotable candidate.
- GOV.SA indexed record alone = evidence candidate, not public catalog row.

### Ring C: Corroboration Layer

Status: immediately useful.

When an event appears in another official source, use GOV.SA detail pages as secondary evidence for:

- government-sector category,
- public-sector organizer name,
- public consultation/e-participation classification,
- official contact fields,
- registration/service link presence.

### Ring D: Wayback Archive Radar

Status: implemented.

Use:

- Parser lab for GOV.SA event detail shape.
- Historical evidence for source resolution.
- Discovery of old event IDs and route behavior.

Do not use:

- Current public catalog publication.
- Ticketing/register links without live verification.
- Replacement for official feed access.

### Ring E: NEC National Calendar Lane

Status: best strategic target.

Action:

- Treat GOV.SA public pages as a mirror/index.
- Ask for the National Calendar event-data feed or dashboard export through NEC/DGA.
- Required export shape should include event ID, organizer, region/city, venue, dates, category, official URL, ticket/register URL, and last update.

## Parser Shape If An Approved HTML/API Path Exists

The detail-page parser should map Arabic labels:

- `المنظم` -> `organizer_name`
- `البريد الإلكتروني` -> `organizer_email`
- `الهاتف` -> `organizer_phone`
- `الموقع` -> `location_label`
- `تاريخ الفعالية` -> `starts_at`, `ends_at`
- `تفاصيل الفعالية` / body after date -> `description`
- `التسجيل في الفعالية` -> `registration_url`
- `موقع الفعالية` -> `external_event_url`

Date parser:

- Accept `YYYY-MM-DD - YYYY-MM-DD`.
- Reject `لاتوجد بيانات` for auto-publish.
- Preserve same-day events as identical start/end dates.
- If time range is present, preserve as local Saudi time and do not infer timezone silently.

Deduping:

- Primary key: `govsa_event_id`.
- Candidate match: normalized title + start date + organizer + city/venue.
- If source is only indexed snippet, require another official evidence URL before public promotion.

## Risk Register

| Risk | Impact | Control |
|---|---|---|
| Cloudflare challenge blocks direct collection | No reliable scraper | Partnership/API only |
| Indexed snippets can be stale | Wrong dates or ended events | Manual review and secondary official source required |
| Many legacy records have `لاتوجد بيانات` | Bad catalog quality | Date-complete gate |
| Event IDs are not sequential enough for blind crawling | Wasteful/noisy discovery | Search/index-based radar or official feed |
| Content mixes public events and consultations | Wrong audience/category | Preserve GOV.SA category and normalize later |
| Registration URL hidden behind page access | Weak conversion data | Prefer API/detail feed or external official organizer page |
| Wayback evidence is historical | Stale records | Archive-only gate and secondary verification |
| NEC portal requires auth/relationship | No anonymous collector | Partnership/API path |

## Final Recommendation

Keep `my-gov-sa-events` in the partnership lane.

The highest-value execution slice is not to build a browser scraper. It is:

1. Prepare an official feed request specification using the fields above.
2. Use `npm run sources:mygov:wayback` as the parser/evidence lab.
3. Add a conservative indexed-radar report that finds leads but never publishes them alone.
4. Use GOV.SA as secondary evidence in the source resolver for events already collected from official organizers.
5. Prioritize NEC National Calendar access over public-page scraping.

This gives EventLive maximum benefit from GOV.SA while staying inside Harvest OS rules: no bot bypass, raw collection is not publication, and a new source enters production only after a promotable sample gate.
