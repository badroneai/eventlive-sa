Workspace storage for the internal operator console.

Convention:
- `workspaces/<workspace-id>/workspace.json`
- `workspaces/<workspace-id>/draft/current-program.json`
- `workspaces/<workspace-id>/intake/raw-intake.csv`
- `workspaces/<workspace-id>/intake/source.json`
- `workspaces/<workspace-id>/intake/latest-review.json`
- `workspaces/<workspace-id>/intake/latest-review.md`

Rules:
- one active working draft per workspace
- one persisted raw intake source per workspace
- intake review evidence is stored with the workspace, not only in UI state
- workspaces are operator-facing draft storage only
- published and archived release data remain in `data/` and `reports/`
