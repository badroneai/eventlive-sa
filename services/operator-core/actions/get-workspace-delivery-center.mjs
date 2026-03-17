import { exists, paths, readJson } from '../../../scripts/program-lifecycle-utils.mjs';
import { getWorkspaceReleaseHistory } from './get-workspace-release-history.mjs';
import {
  normalizeWorkspaceId,
  readWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';

function matchesWorkspace(entry, workspace) {
  if (!entry || !workspace) return false;
  if (workspace.current_release_id && entry.release_id === workspace.current_release_id) return true;
  return entry.program_title === workspace.program_title && entry.organizer_name === workspace.organizer_name;
}

function buildCurrentDelivery(deliveryManifest, currentBundle, workspace, history) {
  if (!deliveryManifest && !currentBundle && !workspace.latest_delivery_manifest) {
    return null;
  }

  return {
    release_id: deliveryManifest?.release_id || currentBundle?.release_id || workspace.current_release_id || null,
    program_title: deliveryManifest?.program_title || workspace.program_title || null,
    organizer_name: deliveryManifest?.organizer_name || workspace.organizer_name || null,
    latest_indicator: deliveryManifest?.latest_indicator || 'current_latest_approved',
    published_at: deliveryManifest?.published_at || history?.current_release?.published_at || null,
    canonical_paths: deliveryManifest?.canonical_paths || {},
    included_delivery_files: deliveryManifest?.included_delivery_files || [],
    share_assets: deliveryManifest?.share_assets || {},
    print_assets: deliveryManifest?.print_assets || {},
    handoff_notes_reference: deliveryManifest?.handoff_notes_reference || workspace.latest_handoff_notes || null,
    delivery_manifest_json: exists(paths.distDeliveryManifestJson) ? 'dist/current-delivery-manifest.json' : null,
    delivery_manifest_md: exists(paths.distDeliveryManifestMd) ? 'dist/current-delivery-manifest.md' : null,
    release_bundle_json: exists(paths.distCurrentBundleJson) ? 'dist/current-release-bundle.json' : null,
    share_kit_json: exists(paths.distShareKitJson) ? 'dist/share-kit.json' : null,
    share_kit_md: exists(paths.distShareKitMd) ? 'dist/share-kit.md' : null,
    handoff_notes_md: exists(paths.distHandoffNotes) ? 'dist/handoff-notes.md' : null,
    archive_browser_html: exists(paths.distArchiveBrowser) ? 'dist/archive-browser.html' : 'reports/releases/archive-browser.html'
  };
}

function buildReleaseSpecificPackage(history) {
  const currentRelease = history?.current_release;
  if (!currentRelease) return null;

  return {
    release_id: currentRelease.release_id || null,
    release_package_dir: currentRelease.release_package_dir || null,
    release_program_page: currentRelease.bundle?.release_program_html_file || null,
    release_print_view: currentRelease.bundle?.release_print_html_file || null,
    release_share_landing: currentRelease.bundle?.release_share_html_file || null,
    release_bundle_json: currentRelease.bundle?.bundle_file || null,
    release_bundle_share_kit: currentRelease.bundle?.share_kit_md_file || null,
    release_manifest_md: currentRelease.delivery_manifest_md_file || null,
    release_handoff_notes: currentRelease.handoff_notes_file || null
  };
}

export function getWorkspaceDeliveryCenter(workspaceId) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const history = getWorkspaceReleaseHistory(safeWorkspaceId).history;
  const deliveryManifest = exists(paths.distDeliveryManifestJson) ? readJson(paths.distDeliveryManifestJson) : null;
  const currentBundle = exists(paths.currentBundleJson) ? readJson(paths.currentBundleJson) : null;
  const currentDelivery = matchesWorkspace(deliveryManifest, workspace) || matchesWorkspace(history.current_release, workspace)
    ? buildCurrentDelivery(deliveryManifest, currentBundle, workspace, history)
    : null;

  return {
    workspace,
    delivery: {
      current: currentDelivery,
      release_specific: buildReleaseSpecificPackage(history),
      archive: {
        archive_browser: history.archive_browser_file,
        archive_index: history.archive_index_file,
        archived_releases: history.archived_releases || []
      }
    }
  };
}
