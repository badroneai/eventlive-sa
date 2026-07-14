# DataSaudi / INSAIGHTS surface reconnaissance

## Status

- Capture time: `2026-07-14T22:33:29Z` (`2026-07-15T01:33:29+03:00`, Asia/Riyadh)
- Mode: read-only public-surface reconnaissance
- Live INSAIGHTS questions sent in this reconnaissance: `0`
- Quota bypass attempts: `0`
- Project files read during reconnaissance: prior quota evidence only
- Files written by this work: this governed surface-recon directory only

## Executive finding

The number `267` is not arbitrary. The public Tesseract catalog currently exposes `277` cubes, while the five primary Arabic catalog topics shown by DataSaudi contain exactly `267` cubes:

| Primary topic | Cubes |
| --- | ---: |
| Economic indicators | 124 |
| Social indicators | 114 |
| Internationally reported indicators | 14 |
| Hajj | 10 |
| Umrah | 5 |
| **Total** | **267** |

The remaining ten cubes are auxiliary, hidden, legacy, or classified outside those five primary topics. Therefore, a one-question-per-primary-dataset universe naturally produces 267 questions.

## Official surfaces observed

- Main platform: <https://datasaudi.sa/ar>
- INSAIGHTS: <https://datasaudi.sa/ar/insaights>
- Data Explorer: <https://datasaudi.sa/ar/data-explorer>
- Dataset structure: <https://datasaudi.sa/ar/data-explorer/datasets>
- Economic calendar: <https://datasaudi.sa/ar/economic-calendar>
- Internationally reported indicators: <https://datasaudi.sa/ar/internationally-reported-indicators>
- Tesseract query UI: <https://api.datasaudi.sa/ui/>
- Data Explorer user guide: <https://datasaudi.sa/pdfs/DataSaudi%20-%20Data%20Explorer%20User%20Guide.pdf>

The current public Next.js build observed during capture was `jKr4M70ajVH4Grvx2K7_H`. This is volatile evidence and must not be treated as a permanent identifier.

## Public data APIs used by the browser

### Catalog and schemas

```text
GET https://api.datasaudi.sa/tesseract/cubes?locale=ar
GET https://api.datasaudi.sa/tesseract/cubes?locale=en
```

The response contains cube annotations, source names and links, dimensions, hierarchies, levels, measures, aggregators, and units. The English response was 542,817 bytes with SHA-256 `a0253d3592d2450a4fa7986caa04891ef8bdf24f8bec7ead678e6b5fbcdec286`. The Arabic response was 570,263 bytes with SHA-256 `4e1a0fd734d476b5c65a2ce3f4648cd7db76b3c38d0c3ae1c637a4ea3133960f`.

### Dimension members

```text
GET https://api.datasaudi.sa/tesseract/members?cube={cube}&level={level}&locale={locale}
```

This exposes the allowed member keys and captions for a specific level. It is the reliable surface for confirming actual time coverage and valid dimension members before constructing a data query.

### Data queries

```text
GET https://api.datasaudi.sa/tesseract/data.jsonrecords?cube={cube}&locale={locale}&drilldowns={levels}&measures={measures}&limit={rows},{offset}
```

Observed responses contain `annotations`, `columns`, `data`, and `page`, where `page` exposes `limit`, `offset`, and `total`. The example `gastat_gdp` query returned 780 total rows and time members from `2010-Q1` through `2026-Q1`.

The same query surface accepted all formats documented in the official guide:

| Extension | HTTP | Content type |
| --- | ---: | --- |
| `csv` | 200 | `text/csv` |
| `jsonrecords` | 200 | `application/json` |
| `parquet` | 200 | `application/vnd.apache.parquet` |
| `tsv` | 200 | `text/tab-separated-values` |
| `xlsx` | 200 | Excel Open XML |

Catalog and data responses exposed `Access-Control-Allow-Origin: *`. No public API rate-limit headers were observed. Data responses additionally exposed `x-tesseract-cache`, `x-tesseract-queryrows`, and `x-tesseract-totalrows`.

### Query UI and officially documented behavior

The API UI at `/ui/` rendered successfully in a real browser. It exposes data language, topic, subtopic, table, source, measures, drilldowns, cuts, debug response, parent-level inclusion, measure sorting, result limit, result offset, and execute controls.

The official 15-page Data Explorer guide states that:

- the explorer provides transparent access to all underlying tables ingested into DataSaudi;
- the database uses a relational OLAP architecture and can aggregate granular records on demand;
- datasets are queryable in Arabic and English independently of the interface language;
- every query has a reusable JSON API URL;
- exports include CSV, JSON Records, Parquet, TSV, and Excel;
- the visualization tab produces compatible visual slices and can export PNG/SVG or share a URL.

## Catalog structure

The 267 primary cubes expose:

- 466 measures;
- 694 dimensions;
- 341 standard dimensions, 262 time dimensions, and 91 geography dimensions;
- 187 cubes with one measure, 43 with two, 18 with three, and 19 with four or more;
- 32 cubes with one dimension, 110 with two, 72 with three, 43 with four, and 10 with five or more.

Common dimensions are Year (170 cubes), administrative region (72), economic sector (55), sex (49), nationality (44), monthly dates (25), and quarterly dates (18). This confirms that the strongest query space is multi-dimensional aggregate analysis, not free-form document retrieval.

## Temporal coverage and freshness

All 262 temporal primary cubes were checked through their finest available public time level. There were no request errors and no empty member lists.

| Finest available frequency | Cubes |
| --- | ---: |
| Annual | 169 |
| Quarterly | 44 |
| Monthly | 49 |
| No time dimension | 5 |

There is no daily, hourly, or real-time cube granularity in the current primary catalog.

| Last available year | Cubes |
| --- | ---: |
| 2026 | 73 |
| 2025 | 43 |
| 2024 | 62 |
| 2023 | 29 |
| 2022 | 45 |
| 2021 | 5 |
| 2018 | 1 |
| 2017 | 4 |

Fifty-five primary datasets end in 2022 or earlier. A complete catalog answer can therefore be semantically valid while still relying on an old final period. Every answer must state the actual last period rather than implying platform-wide freshness.

Freshness differs sharply by family:

- Economic: 120 temporal cubes; 54 end in 2026 and 13 in 2022 or earlier.
- Social: 114 temporal cubes; 19 end in 2026 and 34 in 2022 or earlier.
- International: 13 temporal cubes; none end in 2026 and one ends in 2022 or earlier.
- Hajj: 10 temporal cubes; seven end in 2022 or earlier.
- Umrah: five temporal cubes; four end in 2024 and one in 2023.

## Source coverage

Among the 267 primary cubes, 253 include a direct `source_link` annotation. The dominant named sources are GASTAT (157 cubes) and SAMA (52), followed by the Ministry of Health (10). Fourteen internationally reported-indicator cubes lack a direct source link at cube level; their attribution is handled indirectly through the hidden `dim_international_indicators_sources` lookup cube.

Other metadata gaps observed:

- 48 cubes declare required dimensions that must be present for a valid query.
- Three measures lack a `units_of_measurement` annotation.
- English and Arabic topic labels are not perfectly symmetric for several cubes.
- The Arabic dataset structure page renders an `undefined` subtopic under internationally reported indicators.
- Five primary cubes have no time dimension: the international-source lookup, renewable-energy projects, and three humanitarian-aid cubes.

## Public report universe

The homepage static profile payload contained 220 public profile members:

- 183 bilateral country profiles;
- 21 sector profiles, including Hajj and Umrah;
- 13 administrative regions;
- three competitiveness/country report entries.

Public route families observed in the current build include country/KSA, `region/[slug]`, `sector/[slug]`, `bilateral/[slug]`, internationally reported indicators, Data Explorer, dataset structure, economic calendar, Knowledge Saudi, and sitemap.

## INSAIGHTS transport and response model

The public client currently uses:

```text
POST https://datasaudi.sa/api/auth/token
WSS  wss://datasaudi.sa/api/ws/chat
POST https://datasaudi.sa/api/chat-management/sessions
POST https://datasaudi.sa/api/chat-management/history
POST https://datasaudi.sa/api/chat-management/name
DELETE https://datasaudi.sa/api/chat-management/delete
POST https://datasaudi.sa/api/generate-pdf
```

The browser creates a local user UUID, posts it to `/api/auth/token`, and caches the returned bearer token client-side for 840 seconds. On WebSocket open it sends an authentication frame, then sends a question frame containing `query`, `session_id`, and `user_id`.

Observed client-handled response types are:

```text
auth_success
proxy_connected
language
phase
answer_start
content
link
generating_chart
interactive_visualization
answer_end
error
```

This supports streamed text, source links, progress phases, and interactive visualizations. The UI also supports session history, rename/delete, and PDF generation.

The disclaimer describes INSAIGHTS as an experimental agentic AI tool and warns that generated content can be inaccurate and is not an official ministry or DataSaudi statement.

## Prompt families explicitly demonstrated by the client

Seven bilingual suggested prompts are embedded in the current client. They demonstrate:

1. current Saudi economic overview;
2. five-year mining-versus-manufacturing comparison using real GDP, growth, and a chart;
3. Saudi-China bilateral overview;
4. six-month CPI/WPI trends and a descriptive relationship assessment;
5. six-month PMI trend and non-oil-sector implications;
6. 12-quarter oil/non-oil revenue, current/capital expenditure, and fiscal-balance comparison;
7. five-year current-account trend and component-driver explanation.

The defensible supported question classes are direct retrieval, time-series description, dimension comparison, ranking, deterministic arithmetic, descriptive association, bilingual summaries, source links, and charts. These examples do not prove support for causal claims, forecasts, confidential-document analysis, future actual values, or real-time monitoring.

## Daily message quota

No live question was sent during this reconnaissance. The prior governed capture at `research/datasaudi-package-03c-full-closure/01-live-window/quota-recheck.json` records the exact server frame:

```text
Daily message limit of 30 messages exceeded.
```

The current client exposes no visible remaining-message counter, reset time, reset timezone, or documented rule identifying whether the quota binds to user ID, token, account, IP, or a combination. Those details remain unknown. No identity rotation, session rotation, alternate account, or other bypass was attempted or should be inferred from the client implementation.

## Economic calendar

The browser uses a separate public calendar API:

```text
GET  https://apipulse.mep.gov.sa/ds/calendar/v1/summary/count
GET  https://apipulse.mep.gov.sa/ds/calendar/v1/categories
POST https://apipulse.mep.gov.sa/ds/calendar/v1/search
```

At capture time the summary covered 26 months from November 2024 through December 2026 and contained 408 events. July 2026 contained 12 scheduled publications. The two active categories were Local Publications and Global Publications. This surface can answer when a release is scheduled; it cannot provide the future value that will be published.

## Operational conclusion

The scalable exploration path is the public catalog and Tesseract APIs, not repeated chatbot prompting. INSAIGHTS is valuable as a secondary natural-language interpretation surface, but its 30-message daily limit, experimental status, and non-official-answer disclaimer make it unsuitable as the sole extraction channel.

Any future universe campaign should route each question through this order:

1. validate the cube, measure, units, dimensions, and required dimensions from `/cubes`;
2. validate real members and the final available period from `/members`;
3. run the smallest deterministic `/data.{format}` query;
4. calculate only transparent derivatives from returned values;
5. use INSAIGHTS selectively for interpretation or visualization when quota is available;
6. label unsupported forecasts, causality, missing periods, and stale final periods explicitly.
