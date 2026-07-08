# EventLive Observability & Monitoring Plan

EventLive is currently a static public site plus scheduled/source automation. Monitoring is therefore evidence-driven:

| Layer | Current Signal | Decision |
| --- | --- | --- |
| Public availability | `launch:preflight`, browser matrix, launch sweep | Required before release. |
| Public behavior | analytics status and analytics regression | Public visitor events tracked; owner-only pages excluded. |
| Source health | source state, source ops, source health gate | Required before trusting new harvested data. |
| Release health | GitHub Actions and evidence bundle | CI must upload reports and built `dist`. |
| Alerts | `ops:alerts` and reports/alerts-status | Local/CI alert rules remain the first phase. |
| Error tracking | Sentry/log drain | Deferred until dynamic backend or client runtime errors justify an external service. |

## Escalation

- S1: public home/catalog unavailable.
- S2: live timing, event detail links, sitemap, or source policy broken.
- S3: source yield degradation or missing images.
- S4: cosmetic or content copy issue without broken journeys.

Do not claim production monitoring is complete without a fresh passing pipeline and current owner command center.
