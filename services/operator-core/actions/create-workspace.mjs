import { exists, readJson } from '../../../scripts/program-lifecycle-utils.mjs';
import {
  buildWorkspaceId,
  initializeWorkspaceStorage,
  normalizeWorkspaceId,
  readWorkspaceDraft,
  readWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';

export function createWorkspace({
  workspaceId,
  programTitle = '',
  organizerName = '',
  sourceDraftPath = null
} = {}) {
  let draftDocument = null;

  if (sourceDraftPath) {
    if (!exists(sourceDraftPath)) {
      throw new Error(`Missing source draft file: ${sourceDraftPath}`);
    }
    draftDocument = readJson(sourceDraftPath);
    programTitle = programTitle || draftDocument.program?.program_title || '';
    organizerName = organizerName || draftDocument.program?.organizer_name || '';
  }

  const finalWorkspaceId = normalizeWorkspaceId(workspaceId || buildWorkspaceId(programTitle, organizerName));
  if (workspaceExists(finalWorkspaceId)) {
    throw new Error(`Workspace already exists: ${finalWorkspaceId}`);
  }

  initializeWorkspaceStorage({
    workspaceId: finalWorkspaceId,
    programTitle,
    organizerName,
    draftDocument
  });

  return {
    workspace: readWorkspaceManifest(finalWorkspaceId),
    draft: readWorkspaceDraft(finalWorkspaceId)
  };
}
