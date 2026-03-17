import { rel } from '../../../scripts/program-lifecycle-utils.mjs';
import {
  getWorkspaceApprovedDraftPath,
  normalizeWorkspaceId,
  readWorkspaceDraft,
  readWorkspaceManifest,
  writeWorkspaceApprovedDraft,
  writeWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';
import { WORKSPACE_STATUS } from '../types/workspace-types.mjs';
import { getWorkspaceReleaseReadiness } from './get-workspace-release-readiness.mjs';

export function approveDraft(workspaceId, approvalNote = '') {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const readiness = getWorkspaceReleaseReadiness(safeWorkspaceId).readiness;
  if (!readiness.can_approve) {
    throw new Error('Workspace is not ready for approval yet. Complete readiness checks first.');
  }

  const draft = readWorkspaceDraft(safeWorkspaceId);
  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const now = new Date().toISOString();

  writeWorkspaceApprovedDraft(safeWorkspaceId, draft);
  workspace.approved_draft_file = rel(getWorkspaceApprovedDraftPath(safeWorkspaceId));
  workspace.approved_at = now;
  workspace.approval_note = String(approvalNote || '').trim() || null;
  workspace.status = WORKSPACE_STATUS.VALIDATED_DRAFT;
  workspace.updated_at = now;
  writeWorkspaceManifest(safeWorkspaceId, workspace);

  return {
    ok: true,
    workspace,
    approved: {
      approved_at: now,
      approval_note: workspace.approval_note,
      approved_draft_file: workspace.approved_draft_file
    }
  };
}
