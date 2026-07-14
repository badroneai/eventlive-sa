# Manual and refusal adjudication

This shard closes the accounting gap around the first three governed prompts without pretending that an unsent prompt was observed.

- `P04-001` and `P04-002` were sent and received the same generic refusal. Both are `FAIL` because the answer supplied no retrieval attempt, reason, denominator, schema evidence, or replay URL.
- `P04-MANUAL-UI-001` is a real live observation made before the corpus was frozen. It is a partial substitute for two of the five `P04-003` targets only. It is scored independently and fails the retrieval contract even though its refusal was reasonably calibrated and did not invent values.
- The exact `P04-003` prompt was not sent. It is recorded as `BLOCKED_PLATFORM`, with three targets still unobserved live. The independent API dossier covers their public API state, but that backfill is not represented as an INSAIGHTS answer.

This preserves three distinct facts: what INSAIGHTS was asked, what it answered, and what the public API independently proves.
