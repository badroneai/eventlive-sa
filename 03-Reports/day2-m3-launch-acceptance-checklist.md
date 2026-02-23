# EventLive — Pre-Launch Acceptance Checklist (Day 2 / Task 3)

## A) Data Integrity
- [x] Unified schema exists (`data/schema.json`)
- [x] Validator passes on clean sample (`npm run validate`)
- [x] Additional QA coverage executed (`npm run qa:day2`)
- [ ] Add automated threshold gate (fail deploy if critical errors > 0 in production batch)

## B) Build & Rendering
- [x] Build command succeeds (`npm run build`)
- [x] Interactive HTML generated (`dist/index.html`)
- [x] Session state labels visible (Now/Next/Ended)
- [ ] Add pagination/virtualization for >500 rows

## C) CI/CD & Deployment
- [x] Pipeline workflow active (`.github/workflows/deploy.yml`)
- [x] Push to `master` triggers deployment
- [x] Final URL reachable (`https://badroneai.github.io/eventlive-sa/`)
- [ ] Add rollback playbook (previous known-good artifact)

## D) Operational Readiness
- [x] Day 1 closure report published
- [x] Day 2 Task 1 & Task 2 reports published
- [ ] Add lightweight uptime check (HTTP 200 + content marker)
- [ ] Add incident template for rapid escalation in `04-Incidents`

## E) Go / No-Go Rule
- **GO** if sections A/B/C mandatory items are all checked.
- **NO-GO** if any of these fail: validator pass, build success, deployment success, URL unreachable.

## Current Recommendation
- **Conditional GO (MVP)** for controlled release.
- Before wide launch: complete 4 pending hardening items (threshold gate, pagination strategy, rollback playbook, uptime check).
