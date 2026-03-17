# Operator Console

Lightweight internal release workspace for EventLive operator workflows.

Current scope:
- Programs Home
- Create workspace
- Open workspace
- Load draft
- Save draft
- Program Workspace with tabbed sections
- Intake / Normalize tab with CSV presets and direct workspace normalization
- Intake review step with missing-column checks, issue summary, and sample row preview
- Smart Intake Assistant with alias detection, quality scoring, suggested fixes, and normalized preview
- Upload CSV intake files directly into the active workspace
- Attach organizer files directly into the active workspace (`CSV/XLSX` auto-convert into intake CSV; `PDF/image` attach for manual review)
- Persist raw intake source and latest intake review evidence inside each workspace
- Re-open stored raw intake, review JSON, and review Markdown artifacts from the workspace
- Release History tab with current vs archived release visibility
- Release Readiness checks and stronger approval / publish / archive gates
- Release Decision Center with current vs candidate comparison and change-impact summary
- Visual review queue for metadata, added, removed, and modified sessions before release decisions
- Delivery Center with current delivery package, release-specific package, and archive access
- Workflow Tracker with current stage, next recommended action, and guided stage rail
- Guided Publish Flow with preflight steps, publish outcome, and direct handoff navigation
- Metadata Editor for program-level fields
- Sessions Editor for working draft sessions
- Normalize intake CSV directly into the active workspace draft
- Normalize reviewed intake rows directly into the active workspace draft
- Validate active draft
- Preview active draft
- Diff active draft against approved or published baseline
- Approve draft snapshots
- Publish approved draft from the console
- Archive the active release from the console
- Open release bundle, delivery manifest, share kit, and handoff notes
- Open current and archived release assets from the History tab
- Use release readiness checks before approval and publish
- Review current-vs-candidate release impact before approval and publish
- Use the publish checklist and confirmation flow before replacing the live release
- Open current and release-specific delivery packages from the Handoff tab
- Use the workflow tracker to move operators through intake, draft, validation, review, release, delivery, and archive
- Move from release decision to live handoff through the guided publish flow in the Release tab
- Open preview artifacts from the console
- Arabic / English interface toggle for all console labels and actions
- Unsaved-change guard when reloading or switching workspaces

Run locally:
- `npm run operator:console`

Open:
- `http://localhost:4173`

Workspace intake storage:
- `workspaces/<workspace-id>/intake/raw-intake.csv`
- `workspaces/<workspace-id>/intake/source.json`
- `workspaces/<workspace-id>/intake/latest-review.json`
- `workspaces/<workspace-id>/intake/latest-review.md`
