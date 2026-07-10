# EventLive Release, Deploy, Rollback Status

- Generated at: 2026-07-10T06:26:06.139Z
- Status: PARTIAL
- Commit: 0a60cfcdab84cf8ce75cfff6cab1f7f43ac1f55a
- Branch: codex/eventlive-final-launch-radar
- Public URL: https://eventme.live/

## Checks

| Check | Status | Evidence |
| --- | --- | --- |
| git_commit | PASS | 0a60cfcdab84cf8ce75cfff6cab1f7f43ac1f55a |
| deploy_workflow | PASS | .github/workflows/deploy.yml |
| launch_preflight | PASS | reports/launch-preflight-status.json status=PASS |
| readiness_gate_scope | PASS | reports/delivery-readiness-standard-status.json verdict=READY_WITH_RESERVED_ITEMS |
| workflow_success | PARTIAL | pending external GitHub Actions evidence |
| public_verify | PARTIAL | https://eventme.live/ |
| rollback_drill | PARTIAL | ROLLBACK-RUNBOOK.md |

## Remaining

- Deployment workflow succeeded after push
- Public production URL was verified after deploy
- Rollback drill/runbook is documented for this release
