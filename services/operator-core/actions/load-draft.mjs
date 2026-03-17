import {
  normalizeWorkspaceId,
  readWorkspaceDraft,
  workspaceExists
} from '../storage/workspace-storage.mjs';

export function loadDraft(workspaceId) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);

  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  return {
    draft: readWorkspaceDraft(safeWorkspaceId)
  };
}
