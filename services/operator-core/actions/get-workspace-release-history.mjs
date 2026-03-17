import { exists, paths, readJson } from '../../../scripts/program-lifecycle-utils.mjs';
import {
  normalizeWorkspaceId,
  readWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';

function matchesWorkspace(entry, workspace) {
  if (!entry || !workspace) return false;
  if (workspace.current_release_id && entry.release_id === workspace.current_release_id) return true;
  if (Array.isArray(workspace.archived_release_ids) && workspace.archived_release_ids.includes(entry.release_id)) return true;
  return entry.program_title === workspace.program_title && entry.organizer_name === workspace.organizer_name;
}

export function getWorkspaceReleaseHistory(workspaceId) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const latestApproved = exists(paths.latestApprovedReport) ? readJson(paths.latestApprovedReport) : null;
  const currentBundle = exists(paths.currentBundleJson) ? readJson(paths.currentBundleJson) : null;
  const archiveIndex = exists(paths.archiveIndexReport) ? readJson(paths.archiveIndexReport) : { archived_releases: [] };

  const currentRelease = latestApproved && matchesWorkspace(latestApproved, workspace)
    ? {
        ...latestApproved,
        bundle: currentBundle && currentBundle.release_id === latestApproved.release_id ? currentBundle : null
      }
    : null;

  const archivedReleases = (archiveIndex.archived_releases || [])
    .filter((entry) => matchesWorkspace(entry, workspace))
    .sort((a, b) => String(b.archived_at).localeCompare(String(a.archived_at)));

  return {
    workspace,
    history: {
      current_release: currentRelease,
      archived_releases: archivedReleases,
      archive_index_file: exists(paths.archiveIndexReport) ? 'reports/releases/archive-index.json' : null,
      archive_browser_file: exists(paths.distArchiveBrowser) ? 'dist/archive-browser.html' : 'reports/releases/archive-browser.html'
    }
  };
}
