# Operator Core

This layer provides the first internal operator-facing service actions on top of the existing EventLive core.

Current scope:
- workspace storage
- create workspace
- list workspaces
- open workspace
- load draft
- save draft

Storage convention:
- `workspaces/<workspace-id>/workspace.json`
- `workspaces/<workspace-id>/draft/current-program.json`

This layer does not publish, archive, diff, or render any UI yet.
