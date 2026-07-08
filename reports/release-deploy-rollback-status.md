# EventLive Release, Deploy, Rollback Status

- Generated at: 2026-07-08T01:52:43.897Z
- Status: PASS
- Commit: c2ea60755b49fb88e3e5f1d2811000de11062402
- Branch: main
- Public URL: https://eventme.live/

## Checks

| Check | Status | Evidence |
| --- | --- | --- |
| git_commit | PASS | c2ea60755b49fb88e3e5f1d2811000de11062402 |
| deploy_workflow | PASS | .github/workflows/deploy.yml |
| launch_preflight | PASS | reports/launch-preflight-status.json status=PASS |
| readiness_gate_scope | PASS | reports/delivery-readiness-standard-status.json verdict=NOT_READY |
| workflow_success | PASS | https://github.com/badroneai/eventlive-sa/actions/runs/28911551876 |
| public_verify | PASS | https://eventme.live/ |
| rollback_drill | PASS | ROLLBACK-RUNBOOK.md + GitHub Actions release verification evidence |

## Remaining

- None
