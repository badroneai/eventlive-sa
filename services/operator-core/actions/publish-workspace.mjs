import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { exists, paths, readJson, rel, root } from '../../../scripts/program-lifecycle-utils.mjs';
import {
  getWorkspaceApprovedDraftPath,
  normalizeWorkspaceId,
  readWorkspaceManifest,
  writeWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';
import { WORKSPACE_STATUS } from '../types/workspace-types.mjs';
import { getWorkspaceReleaseReadiness } from './get-workspace-release-readiness.mjs';

export function publishWorkspace(workspaceId, releaseNote = '') {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const readiness = getWorkspaceReleaseReadiness(safeWorkspaceId).readiness;
  if (!readiness.can_publish) {
    throw new Error('Workspace is not ready for publish yet. Approval and readiness checks must pass first.');
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const approvedPath = getWorkspaceApprovedDraftPath(safeWorkspaceId);
  const sourcePath = exists(approvedPath) ? approvedPath : path.join(root, workspace.draft_file);
  const sourceFile = rel(sourcePath);

  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'publish-program.mjs')], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      EVENTLIVE_SOURCE_FILE: sourceFile,
      EVENTLIVE_RELEASE_NOTE: String(releaseNote || '').trim() || 'Approved publishable release created from operator console.'
    }
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Publish failed').trim());
  }

  const manifest = exists(paths.publishedRelease) ? readJson(paths.publishedRelease) : null;
  const bundle = exists(paths.currentBundleJson) ? readJson(paths.currentBundleJson) : null;
  const now = new Date().toISOString();

  workspace.current_release_id = manifest?.release_id || workspace.current_release_id;
  workspace.latest_delivery_manifest = bundle?.delivery_manifest_md_file || rel(paths.distDeliveryManifestMd);
  workspace.latest_handoff_notes = bundle?.handoff_notes_file || rel(paths.distHandoffNotes);
  workspace.latest_release_bundle = rel(paths.currentBundleJson);
  workspace.latest_share_kit = bundle?.share_kit_md_file || rel(paths.distShareKitMd);
  workspace.last_release_note = String(releaseNote || '').trim() || null;
  workspace.status = WORKSPACE_STATUS.APPROVED_CURRENT;
  workspace.updated_at = now;
  writeWorkspaceManifest(safeWorkspaceId, workspace);

  return {
    ok: true,
    workspace,
    release: {
      manifest,
      bundle,
      current_program_page: rel(paths.distIndex),
      current_print_page: rel(paths.distPrint),
      current_share_page: rel(paths.distShare),
      current_delivery_package_dir: rel(paths.distDeliveryPackageDir)
    }
  };
}
