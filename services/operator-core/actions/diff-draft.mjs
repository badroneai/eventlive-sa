import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { exists, paths, readJson, rel, root } from '../../../scripts/program-lifecycle-utils.mjs';
import {
  getWorkspaceApprovedDraftPath,
  getWorkspaceDraftPath,
  normalizeWorkspaceId,
  readWorkspaceManifest,
  writeWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';

export function diffDraft(workspaceId) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const candidateFile = rel(getWorkspaceDraftPath(safeWorkspaceId));
  const preferredBasePath = workspace.approved_draft_file && exists(path.join(root, workspace.approved_draft_file))
    ? path.join(root, workspace.approved_draft_file)
    : exists(getWorkspaceApprovedDraftPath(safeWorkspaceId))
      ? getWorkspaceApprovedDraftPath(safeWorkspaceId)
      : exists(paths.publishedCurrent)
        ? paths.publishedCurrent
        : paths.intakeExample;
  const baseFile = rel(preferredBasePath);

  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'diff-programs.mjs')], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      EVENTLIVE_BASE_FILE: baseFile,
      EVENTLIVE_SOURCE_FILE: candidateFile
    }
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Diff failed').trim());
  }

  const diffReport = exists(paths.latestDiffJson) ? readJson(paths.latestDiffJson) : null;
  const now = new Date().toISOString();
  workspace.last_diff_at = now;
  workspace.last_diff_json = exists(paths.latestDiffJson) ? rel(paths.latestDiffJson) : null;
  workspace.last_diff_md = exists(paths.latestDiffMd) ? rel(paths.latestDiffMd) : null;
  workspace.last_diff_html = exists(paths.latestDiffHtml) ? rel(paths.latestDiffHtml) : null;
  workspace.updated_at = now;
  writeWorkspaceManifest(safeWorkspaceId, workspace);

  return {
    ok: true,
    workspace,
    diff: {
      base_file: baseFile,
      candidate_file: candidateFile,
      report: diffReport,
      json_file: workspace.last_diff_json,
      md_file: workspace.last_diff_md,
      html_file: workspace.last_diff_html
    }
  };
}
