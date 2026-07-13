# P03C Full-Closure Completion Contract

## 1. Purpose

This contract governs closure of the frozen 267-question DataSaudi corpus. It prevents three invalid shortcuts:

1. treating a candidate cube, a source-ready label, or a quota frame as an answer;
2. treating an independently produced knowledge answer as proof of how live INSAIGHTS behaved;
3. treating an empty `candidate_cubes` array as proof that DataSaudi has no relevant data.

The package SHALL maintain two independent ledgers:

- **Knowledge Answer Ledger:** whether each of the 267 questions has a complete, evidence-bound answer, regardless of whether that answer came from INSAIGHTS, a public DataSaudi cube, another official source, or a documented valid negative.
- **Live INSAIGHTS Test Ledger:** whether the official live INSAIGHTS interface was actually asked the frozen prompt and its response was captured and scored.

The target `267/267` applies to the Knowledge Answer Ledger. It does not imply `267/267` live tests. A question may be closed in one ledger and open in the other.

## 2. Frozen denominator and baseline

- Corpus: `research/datasaudi-insaights/04-question-corpus/questions.jsonl`
- Frozen denominator: **267 unique `question_id` values**.
- Current Knowledge Answer baseline:
  - `CLOSED`: 11
  - `PARTIAL`: 38
  - `UNSENT`: 218
- The exact baseline, input hashes, family matrix and priority matrix are in `closure-baseline.json`.

For this contract, `UNSENT` means that no substantive knowledge answer exists in the governed evidence set. It includes a prompt that was attempted but returned only a quota frame. In particular, the `H-19-AR` message-limit response is not an answer.

## 3. Accepted Knowledge Answer closure states

Exactly one of the following terminal states SHALL be assigned to every knowledge answer that is counted as closed:

### `CLOSED_VERIFIED_REPORTED`

The answer reports official observations or metadata exactly as retrieved. Every material claim is bound to reproducible evidence and includes all dimensions required by the prompt.

### `CLOSED_VERIFIED_CALCULATED`

The answer contains a reproducible calculation derived only from verified inputs. The formula, input values, normalization, compatibility checks, rounding rule and output are disclosed.

### `CLOSED_VALID_NEGATIVE`

The requested dataset, field, granularity, private record, future actual, causal proof, or compatible denominator is not available or is invalid as requested. The negative is time-bounded and supported by the appropriate catalog, schema, privacy, definition, unit, temporal or source evidence. No unsupported substitute is offered.

### `CLOSED_DOCUMENTED_NOT_COMPUTABLE`

“Not computable” or “not determinable from the currently accessible evidence” is a valid complete answer when all of the following are present:

1. the requested quantity or decision is stated precisely;
2. every required missing or incompatible input is named;
3. the official sources, catalog routes and queries actually examined are recorded;
4. `not found`, `not available`, `not comparable`, `not current` and `not observable` are not conflated;
5. no proxy is silently substituted for the requested measure;
6. the answer explains what additional evidence would make the result computable;
7. the conclusion is scoped to the frozen retrieval time and sources.

A quota frame alone does not satisfy this state. For a platform-bound question, public evidence may support “not independently determinable”; the corresponding Live INSAIGHTS test remains open.

### `CLOSED_EVIDENCE_BOUND_INFERENCE`

The prompt calls for explanation, comparison, opportunity assessment or a decision-oriented conclusion rather than a purely reported value. Reported facts, calculations and inference are visibly separated. Every input fact is verified, the inference is bounded by the evidence, and no causal conclusion is asserted without an appropriate causal design.

## 4. States that do not count as closed

The following states SHALL remain outside the closed numerator:

- `PARTIAL_CONTRACT_GAP`: one or more requested fields, distinctions or scopes are missing.
- `PARTIAL_EVIDENCE_GAP`: the answer is useful but one or more material claims lack reproducible evidence.
- `PARTIAL_SEMANTIC_OVERREACH`: the core answer may be safe, but an alternative, proxy or interpretation exceeds the evidence.
- `CONTRADICTED`: at least one material claim conflicts with verified evidence.
- `ROUTING_GAP`: no reliable dataset/cube/source route has yet been assigned.
- `UNSENT`: no substantive answer exists.
- `QUOTA_FRAME_ONLY`: the interface returned a quota/capacity frame without an answer.
- `LIVE_TEST_OPEN`: a knowledge answer may exist, but the live platform behavior has not been observed.

Labels such as `source-ready`, `contract-only`, `oracle replayed`, `candidate cube found`, `attempted` or `answered text observed` are process metadata, not closure states.

## 5. Minimum evidence contract

Every closed answer SHALL have a durable answer record containing:

- `question_id`, exact prompt hash, answer text and closure state;
- retrieval/capture time and evidence-snapshot time;
- source publisher, dataset name and stable URL or official endpoint;
- DataSaudi `cube_id` when applicable;
- measure, raw value, unit, period, geography and frequency when a value is reported;
- a clear separation of reported fact, calculation and inference;
- evidence artifact paths and SHA-256 hashes;
- atomic claims and their verification results;
- explicit gaps, assumptions and limitations;
- a contract check showing that every required behavior passed;
- reviewer/adjudication information when a verifier flags a contradiction.

Additional family-specific evidence is mandatory:

| Answer family | Additional minimum evidence |
|---|---|
| availability / limit | Complete catalog or schema route, publisher, measures, dimensions, temporal range, frequency and explicit meaning of any absence claim. |
| direct | Exact observation row or official response, not merely cube metadata. |
| series | Series denominator, start/end periods, frequency, missing periods, revisions/vintage and any seasonal/base-year treatment. |
| rank | Complete compared population, pagination proof, sort measure, period, geography, ties and missing-value policy. |
| derive | Verified inputs, formula, unit conversion, denominator, compatibility proof, rounding and recomputed output. |
| cross | Evidence for every dataset plus a compatibility matrix for definition, unit, period, frequency, geography and vintage. |
| explain | Observed facts separated from hypotheses; unsupported causality is prohibited. |
| opportunity | Named buyer, decision, cited datasets, data gap, update cadence and a dataset-level rights/publication gate. |
| valid negative | Time-bounded proof appropriate to the claim; absence of a route is not absence of data. |
| live system behavior | Exact frozen prompt, exact response, URL, UTC time, session/window context and capture artifact. |

## 6. Catalog and routing rule

The frozen complete catalog snapshot contains **277 cubes**:

`research/datasaudi-insaights/03-raw-evidence-snapshots/snapshots/run-20260713T004840Z/cubes-show-all-true.json`

Its SHA-256 is:

`d1994c69479b757ea0d15af19c472e4336ec873474cb5f6ff311ff37675d27f4`

An empty `candidate_cubes` array SHALL be classified as `ROUTING_GAP`, never as proof of catalog absence. Before a negative availability claim can close, the pipeline SHALL search the complete catalog, resolve aliases and publisher terminology, inspect relevant metadata/schema, and preserve the search evidence.

The current routing expansion proves this distinction for four corpus domains:

- fiscal: `mof_government_revenues_expenditures`, `mof_government_revenues_expenditures_quarter`;
- external/investment: `gastat_fdi_inflow`, `gastat_fdi_stock`, `sama_fdi`;
- capital markets: `tadawul_indicators`, `tadawul_indicators_quarterly`, `tadawul_indicators_yearly`;
- research and development: `research_development_by_sector`, `rd_expenditure_by_activity`, `rd_expenditure_by_size`, `pct_dist_researchers`.

The authoritative discovery artifact is:

`research/datasaudi-package-03c-full-closure/02-catalog-discovery/domain-cube-expansion.json`

Catalog-based negative answers SHALL be worded as true for the frozen 277-cube snapshot, not as permanent universal nonexistence.

## 7. Atomic verification and adjudication gate

Before an answer enters the closed numerator:

1. every material reported, numeric, temporal, availability and derived claim SHALL be atomized;
2. every material atomic claim SHALL be resolved against cited evidence;
3. central unresolved claims SHALL be zero;
4. confirmed incorrect claims SHALL be zero;
5. all mandatory prompt-contract fields SHALL pass;
6. known semantic traps—stock/flow, MW/MWh, trip/person, percentage-point/percent, nominal/real, period/geography mismatch—SHALL pass explicit checks;
7. a machine contradiction flag SHALL remain non-terminal until a separate adjudication decision is recorded;
8. an answer with an unsafe unsupported alternative SHALL remain partial even if its opening sentence is correct.

Previously confirmed errors SHALL not be copied forward: regional unemployment reaches `2023-Q3`, not `2018-Q1`; building permits reach `2026-04`, not `2026-03`, under the frozen verified evidence.

## 8. Live INSAIGHTS test contract

The Live INSAIGHTS Test Ledger is an observation of the official interface, not a prerequisite for most knowledge answers.

- Only an exact substantive response counts as a live answer.
- Quota, capacity, retry-later and technical frames do not count as answers.
- No identity rotation, session multiplication, access-control bypass or quota evasion is permitted.
- A direct DataSaudi cube answer or official-source answer may close the Knowledge Answer Ledger while the live test remains `LIVE_TEST_OPEN`.
- Questions about the platform’s own retrieval boundary, self-audit or retraction behavior require live evidence to close the live ledger.
- Context-dependent prompts SHALL preserve the exact antecedent conversation; they may not be scored as meaningful standalone probes.

The latest lawful recheck of `H-19-AR` returned `Daily message limit of 30 messages exceeded.` and stopped further live sends. Evidence:

`research/datasaudi-package-03c-full-closure/01-live-window/quota-recheck.json`

## 9. Full-package completion gate

P03C may claim **Knowledge Answer 267/267 complete** only when:

1. exactly 267 unique corpus questions have one terminal accepted Knowledge Answer state;
2. no question is duplicated, omitted, partial, contradicted, routing-gap, quota-only or unsent;
3. every accepted answer satisfies its evidence and atomic-claim contract;
4. all answer artifacts and evidence references exist and match their hashes;
5. family, priority, route and closure-state totals reconcile independently to 267;
6. live-test coverage is reported separately and is never implied by knowledge completion;
7. the package validation suite passes from a clean, reproducible input lock.

The final report SHALL state both denominators prominently, for example:

> Knowledge answers: 267/267 closed. Live INSAIGHTS tests: X/267 substantively observed; Y open or quota-blocked.

No weaker wording may imply that a live question was asked when it was answered independently.
