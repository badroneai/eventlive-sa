import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { paths, rel, root } from '../../../scripts/program-lifecycle-utils.mjs';
import {
  getWorkspaceDraftPath,
  normalizeWorkspaceId,
  readWorkspaceManifest,
  writeWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';
import { WORKSPACE_STATUS } from '../types/workspace-types.mjs';

export function buildPreview(workspaceId) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const sourceFile = rel(getWorkspaceDraftPath(safeWorkspaceId));
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'preview-program.mjs')], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      EVENTLIVE_SOURCE_FILE: sourceFile
    }
  });

  if (result.status !== 0) {
    const failedAt = new Date().toISOString();
    workspace.preview_ready = false;
    workspace.last_preview_at = null;
    workspace.last_preview_source = null;
    workspace.last_validation_status = 'failed';
    workspace.last_validation_at = failedAt;
    workspace.last_validation_report = rel(paths.validationReport);
    workspace.updated_at = failedAt;
    workspace.status = WORKSPACE_STATUS.WORKING_DRAFT;
    writeWorkspaceManifest(safeWorkspaceId, workspace);
    throw new Error((result.stderr || result.stdout || 'Preview failed').trim());
  }

  const now = new Date().toISOString();
  workspace.preview_ready = true;
  workspace.last_preview_at = now;
  workspace.last_preview_source = sourceFile;
  workspace.updated_at = now;
  if (workspace.last_validation_status === 'passed') {
    workspace.status = WORKSPACE_STATUS.VALIDATED_DRAFT;
  }

  writeWorkspaceManifest(safeWorkspaceId, workspace);

  return {
    ok: true,
    workspace,
    preview: {
      source_file: sourceFile,
      program_page: rel(paths.distIndex),
      print_page: rel(paths.distPrint),
      share_page: rel(paths.distShare),
      build_report: rel(paths.buildReport),
      generated_at: now,
      log: (result.stdout || '').trim()
    }
  };
}
