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
import { VALIDATION_STATUS, WORKSPACE_STATUS } from '../types/workspace-types.mjs';

function parseValidationReport(reportText) {
  const lines = String(reportText || '').split('\n');
  const errors = [];
  const warnings = [];
  let section = '';

  for (const line of lines) {
    if (line === '## Errors') {
      section = 'errors';
      continue;
    }
    if (line === '## Warnings') {
      section = 'warnings';
      continue;
    }
    if (line === '## Status') {
      section = 'status';
      continue;
    }
    if (!line.startsWith('- ')) continue;

    const value = line.slice(2).trim();
    if (section === 'errors') errors.push(value);
    if (section === 'warnings') warnings.push(value);
  }

  return { errors, warnings };
}

export function validateDraft(workspaceId) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const sourceFile = rel(getWorkspaceDraftPath(safeWorkspaceId));
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-data.mjs')], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      EVENTLIVE_SOURCE_FILE: sourceFile
    }
  });

  const reportText = result.stdout || result.stderr || '';
  const { errors, warnings } = parseValidationReport(reportText);
  const passed = result.status === 0;
  const now = new Date().toISOString();

  workspace.last_validation_status = passed ? VALIDATION_STATUS.PASSED : VALIDATION_STATUS.FAILED;
  workspace.last_validation_at = now;
  workspace.last_validation_report = rel(paths.validationReport);
  workspace.preview_ready = passed ? workspace.preview_ready : false;
  workspace.status = passed ? WORKSPACE_STATUS.VALIDATED_DRAFT : WORKSPACE_STATUS.WORKING_DRAFT;
  workspace.updated_at = now;

  writeWorkspaceManifest(safeWorkspaceId, workspace);

  return {
    ok: passed,
    workspace,
    validation: {
      source_file: sourceFile,
      report_file: rel(paths.validationReport),
      errors,
      warnings,
      raw_report: reportText.trim()
    }
  };
}
