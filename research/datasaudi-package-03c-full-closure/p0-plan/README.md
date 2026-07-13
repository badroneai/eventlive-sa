# P0 Independent Source-First Closure

## Outcome

This package closes the **answer-content layer** for the 87 open P0 records that preceded Package 03C:

- 38 previously partial records now have replacement source-first reference answers.
- 49 records without a substantive live answer now have independent reference answers.
- 87/87 records retain their preregistered `must` / `must_not` assertion contract.
- 0 INSAIGHTS answers are invented. `H-19-AR` remains recorded as a quota frame, and the other post-breaker questions remain recorded as not sent.

`reference-answers.jsonl` therefore means **independent answer closure**, not a claim that the INSAIGHTS assistant itself answered or passed the questions.

## What changed the old contract-only assessment

The full 277-cube catalog taxonomy contains direct domain matches that the original candidate lists omitted:

| Domain | Full-catalog match | Cubes replayed |
|---|---|---:|
| Fiscal | `Fiscal Indicators` | 2 |
| External sector | `External Sector & International Trade` | 29 |
| Financial markets | `Financial Markets` | 3 |
| R&D | `Research and Development` | 4 |

Representative exact cubes include:

- Fiscal: `mof_government_revenues_expenditures`, `mof_government_revenues_expenditures_quarter`.
- Markets: `tadawul_indicators`, `tadawul_indicators_quarterly`, `tadawul_indicators_yearly`.
- R&D: `research_development_by_sector`, `rd_expenditure_by_activity`, `rd_expenditure_by_size`, `pct_dist_researchers`.
- External sector: 29 catalog-matched cubes including `gastat_fdi_inflow`, `gastat_fdi_stock`, `sama_fdi`, current/capital/financial-account cubes, trade cubes, reserves and remittances.

All 38 taxonomy-fallback cubes were replayed against the public official DataSaudi API. Every response returned HTTP 200, was complete at the selected safe aggregation, was saved locally, and has a reproducible SHA-256 hash.

## Red-team repairs

Twenty-one red-team records have deterministic, evidence-bounded answers. Examples:

- `H-03-AR`: a complete 13-region 2022 replay proves Riyadh has 8,591,748 residents and is the highest, while Al-Baha has 339,174 and is the lowest.
- `H-19-AR` / `H-20-AR`: future observations are rejected as not actual data.
- `H-21-AR`: latest GDP uses observation period `2025-Q4`, not the retrieval date.
- `H-22-AR`: 1.3 trillion is reproducibly converted to 1,300 billion.
- `H-23-AR`: percentage points are separated from relative percentage growth.
- `H-24-AR`: monthly credit stocks are not summed into a yearly flow.
- `H-25-AR`: an unweighted regional-rate average is not represented as a national rate.
- `H-27-AR`: the public 277-cube catalog used by this pipeline is distinguished from the unobservable internal retrieval boundary of INSAIGHTS.

Catalog non-existence statements are bounded to literal searches over the frozen public schema. They are never generalized to all Saudi administrative systems.

## Artifacts

- `reference-answers.jsonl`: 87 complete answer records, cube contracts, evidence references, hashes, and live/independent status separation.
- `question-source-contract-map.jsonl`: compact `question_id -> source/query/answer contract` routing map.
- `live-replay-manifest.jsonl`: 38 taxonomy fallback replays plus the H-03 full-region replay.
- `catalog-boundary-audit.json`: literal absence-search method and results.
- `summary.json`: machine-readable denominator and closure statement.
- `verification.json`: executable acceptance results.

## Rebuild and verify

```bash
node scripts/datasaudi-package-03c-p0/build-p0-source-first.mjs --fetch
node scripts/datasaudi-package-03c-p0/verify-p0-source-first.mjs
```

The verifier checks denominators, unique IDs, answer hashes, separation from INSAIGHTS observation, replay completeness, on-disk response hashes, catalog boundaries, and targeted red-team invariants.
