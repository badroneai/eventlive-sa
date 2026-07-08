# EventLive Incident Runbook

Use this runbook when EventLive has broken pages, stale data, failed source sync, or unexpected public exposure.

## Severity

| Severity | Example | First Action |
| --- | --- | --- |
| S1 | Home or catalog is unavailable | Stop release, check deploy workflow, restore last passing `dist`. |
| S2 | Wrong live timing or broken event links | Run `npm run build`, `npm run test:public-assets`, and `npm run test:live-runtime-clock`. |
| S3 | Source sync yields fewer events than expected | Run `npm run sources:yield`, inspect dropped rows, and classify source issue. |
| S4 | Owner-only page appears publicly | Run public asset and transparency tests, remove link, rebuild, verify sitemap/manifest. |

## Standard Response

1. Capture the failing URL, command, and timestamp.
2. Run `npm run pipeline`.
3. Read the newest report under `reports/`.
4. Fix the smallest cause that restores the gate.
5. Rebuild and rerun the affected regression test plus `npm run pipeline`.

## Rollback

For GitHub Pages, rollback is operationally a redeploy of the last known passing commit or artifact. Do not declare rollback complete until the public URL and `launch:preflight` evidence are both recorded.
