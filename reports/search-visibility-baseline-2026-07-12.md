# EventLive Google Search Visibility Baseline

Date: 2026-07-12, Asia/Riyadh

## Executive result

Google knows and indexes the EventLive brand, but EventLive has not yet earned visibility for broad Saudi event discovery queries.

- `EventLive فعاليات السعودية`: page 1, organic result 1.
- `eventme.live`: page 1, organic result 1.
- `فعاليات السعودية`: not found through Google page 10; 96 organic results were inspected.
- Eight non-brand national, time, city, calendar, and English queries: no EventLive result through page 3.
- Google Search Console is verified but currently reports that performance data is still being processed.

This is an authority and query-intent gap, not an indexing failure.

## Measurement conditions

| Field | Value |
|---|---|
| Engine | Google Web Search |
| Country | Saudi Arabia (`gl=sa`) |
| Personalization | Disabled (`pws=0`) |
| Observed network location | Dammam, Saudi Arabia |
| Ranking unit | Organic results only |
| Core query limit | 10 result pages |
| Priority query limit | 3 result pages |

Arabic result pages explicitly displayed that results were not personalized. Google ranking remains variable by time, device, location, and result composition, so this sample is a repeatable diagnostic rather than an absolute universal rank.

## Baseline table

| Query | EventLive result | Current leader |
|---|---:|---|
| فعاليات السعودية | Not found through page 10 | ksaevent.com |
| فعاليات اليوم في السعودية | Not found through page 3 | ksaevent.com |
| فعاليات هذا الأسبوع في السعودية | Not found through page 3 | my.gov.sa |
| فعاليات الرياض اليوم | Not found through page 3 | Platinumlist Riyadh |
| فعاليات جدة اليوم | Not found through page 3 | Platinumlist Jeddah |
| فعاليات الخبر اليوم | Not found through page 3 | Platinumlist Khobar |
| جدول فعاليات السعودية | Not found through page 3 | Visit Saudi Calendar |
| Saudi events | Not found through page 3 | Visit Saudi Calendar |
| EventLive فعاليات السعودية | Page 1, result 1 | EventLive |
| eventme.live | Page 1, result 1 | EventLive |

## Competitor pattern

1. `ksaevent.com` owns the broad Arabic discovery intent and the national today query.
2. Official national properties dominate trust-heavy queries: `my.gov.sa`, Visit Saudi, NEC, SCEGA, and GEA.
3. Platinumlist owns city-plus-today intent for Riyadh, Jeddah, and Khobar with exact landing pages matching the query.
4. Local official and social properties still appear prominently, including `riyadh.sa` and city event accounts.

The practical lesson is page-intent precision plus authority. Inventory size alone is not enough. EventLive must earn broad visibility through useful city/date pages, source-backed original data, real usage, and genuine citations.

## Ongoing measurement contract

1. Use Google Search Console as the primary weekly source once processing completes: clicks, impressions, CTR, average position, queries, landing pages, country, and device.
2. Capture the first Search Console reading on 2026-07-13, then every Monday using the same 28-day comparison window.
3. Repeat this manual non-personalized SERP sample monthly, beginning 2026-08-12, with the same queries and page limits.
4. Record both page number and within-page organic position. Do not translate a missing result into an invented numeric rank.
5. Stop manual sampling when Google presents a CAPTCHA. Do not bypass or automate around it.

The machine-readable baseline is stored in `data/search_visibility_baseline.json`.

## Next success thresholds

- First milestone: at least one non-brand query appears within page 3.
- Second milestone: a national or city-today query enters page 1.
- Quality milestone: Search Console shows growing non-brand impressions across multiple landing pages rather than only brand or domain searches.
- Authority milestone: genuine links or citations appear from organizers, official calendars, venues, universities, chambers, or editorial sources.

## Incomplete optional sample

An additional exact-title sample for individual events was attempted after the priority queries. Google then presented a CAPTCHA, so that sample was not measured and is not included in the baseline.
