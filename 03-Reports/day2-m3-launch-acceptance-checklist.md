# EventLive — Pre-Launch Acceptance Checklist (Day 2 / Task 3)

## A) Data Integrity
- [x] Unified schema exists (`data/schema.json`)
- [x] Validator passes on clean sample (`npm run validate`)
- [x] Additional QA coverage executed (`npm run qa:day2`)
- [x] Automated threshold gate enabled (`npm run validate:gate`)

## B) Build & Rendering
- [x] Build command succeeds (`npm run build`)
- [x] Interactive HTML generated (`dist/index.html`)
- [x] Session state labels visible (Now/Next/Ended)
- [x] Pagination baseline added (50 rows/page) for large lists

## C) CI/CD & Deployment
- [x] Pipeline workflow active (`.github/workflows/deploy.yml`)
- [x] Push to `master` triggers deployment
- [x] Final URL reachable (`https://badroneai.github.io/eventlive-sa/`)
- [x] Rollback playbook documented (`03-Reports/rollback-playbook.md`)

## D) Operational Readiness
- [x] Day 1 closure report published
- [x] Day 2 Task 1 & Task 2 reports published
- [x] Lightweight uptime check added (`.github/workflows/uptime.yml` + `npm run uptime:check`)
- [x] Incident template added (`04-Incidents/INCIDENT_TEMPLATE.md`)

## E) Go / No-Go Rule
- **GO** if sections A/B/C mandatory items are all checked.
- **NO-GO** if any of these fail: validator pass, build success, deployment success, URL unreachable.

## Current Recommendation
- **GO** for MVP launch.
