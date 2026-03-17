import {
  normalizeWorkspaceId,
  readWorkspaceManifest,
  writeWorkspaceDraft,
  writeWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';

export function saveDraft(workspaceId, draftDocument) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);

  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  if (!draftDocument || typeof draftDocument !== 'object' || Array.isArray(draftDocument)) {
    throw new Error('Draft document must be an object');
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const now = new Date().toISOString();
  const program = draftDocument.program || {};

  writeWorkspaceDraft(safeWorkspaceId, draftDocument);
  workspace.program_title = program.program_title || workspace.program_title;
  workspace.organizer_name = program.organizer_name || workspace.organizer_name;
  workspace.updated_at = now;
  workspace.preview_ready = false;
  workspace.last_validation_status = 'unknown';
  workspace.last_validation_at = null;
  workspace.last_validation_report = null;
  workspace.last_preview_at = null;
  workspace.last_preview_source = null;
  workspace.last_diff_at = null;
  workspace.last_diff_json = null;
  workspace.last_diff_md = null;
  workspace.last_diff_html = null;
  workspace.status = 'working_draft';

  writeWorkspaceManifest(safeWorkspaceId, workspace);

  return {
    workspace,
    draft: draftDocument
  };
}
