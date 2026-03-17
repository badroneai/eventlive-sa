import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { exists, paths, readJson, root } from '../../../scripts/program-lifecycle-utils.mjs';
import {
  normalizeWorkspaceId,
  readWorkspaceManifest,
  writeWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';
import { WORKSPACE_STATUS } from '../types/workspace-types.mjs';
import { getWorkspaceReleaseReadiness } from './get-workspace-release-readiness.mjs';

export function archiveWorkspace(workspaceId) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const readiness = getWorkspaceReleaseReadiness(safeWorkspaceId).readiness;
  if (!readiness.can_archive) {
    throw new Error('Workspace has no current release to archive.');
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const archivedReleaseId = workspace.current_release_id;
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'archive-program.mjs')], {
    cwd: root,
    encoding: 'utf8',
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Archive failed').trim());
  }

  const archiveIndex = exists(paths.archiveIndexReport) ? readJson(paths.archiveIndexReport) : null;
  const now = new Date().toISOString();
  if (archivedReleaseId && !workspace.archived_release_ids.includes(archivedReleaseId)) {
    workspace.archived_release_ids = [...workspace.archived_release_ids, archivedReleaseId];
  }
  workspace.current_release_id = null;
  workspace.status = WORKSPACE_STATUS.ARCHIVED;
  workspace.updated_at = now;
  writeWorkspaceManifest(safeWorkspaceId, workspace);

  return {
    ok: true,
    workspace,
    archive: {
      archived_release_id: archivedReleaseId,
      archive_index: archiveIndex,
      archive_browser_html: 'reports/releases/archive-browser.html',
      current_archive_browser: 'dist/archive-browser.html'
    }
  };
}
