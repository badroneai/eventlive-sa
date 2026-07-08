# EventLive Release, Deploy, Rollback Status

- Generated at: 2026-07-08T01:39:49.319Z
- Status: PARTIAL
- Commit: 686d61efb0e19383fa2f9e71f575f2a2e971c5cd
- Branch: main
- Public URL: https://eventme.live/

## Checks

| Check | Status | Evidence |
| --- | --- | --- |
| git_commit | PASS | 686d61efb0e19383fa2f9e71f575f2a2e971c5cd |
| deploy_workflow | PASS | .github/workflows/deploy.yml |
| launch_preflight | PASS | reports/launch-preflight-status.json status=PASS |
| readiness_gate_scope | PASS | reports/delivery-readiness-standard-status.json verdict=NOT_READY |
| workflow_success | PARTIAL | pending external GitHub Actions evidence |
| public_verify | PARTIAL | https://eventme.live/ |
| rollback_drill | PARTIAL | ROLLBACK-RUNBOOK.md |

## Remaining

- Deployment workflow succeeded after push
- Public production URL was verified after deploy
- Rollback drill/runbook is documented for this release
