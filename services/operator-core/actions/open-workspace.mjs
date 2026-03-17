import {
  normalizeWorkspaceId,
  readWorkspaceIntakeReview,
  readWorkspaceIntakeSource,
  readWorkspaceDraft,
  readWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';

export function openWorkspace(workspaceId) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);

  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  return {
    workspace: readWorkspaceManifest(safeWorkspaceId),
    draft: readWorkspaceDraft(safeWorkspaceId),
    intake: readWorkspaceIntakeSource(safeWorkspaceId),
    intake_review: readWorkspaceIntakeReview(safeWorkspaceId)
  };
}
