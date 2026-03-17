import fs from 'node:fs';
import path from 'node:path';
import {
  buildLiveSiteMap,
  buildReleaseId,
  copyFileIfExists,
  ensureDir,
  exists,
  getReleaseArtifactPaths,
  makeReleaseNote,
  paths,
  readJson,
  rel,
  resolveSourceFile,
  root,
  runNodeScript,
  writeJson
} from './program-lifecycle-utils.mjs';

function writeMarkdown(filePath, lines) {
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function copyArtifacts(pairs) {
  for (const [fromPath, toPath] of pairs) {
    copyFileIfExists(fromPath, toPath);
  }
}

const sourcePath = resolveSourceFile(paths.intakeCurrent);
if (!exists(sourcePath)) {
  throw new Error(`Missing publish source: ${path.relative(root, sourcePath)}`);
}

const sourceFile = path.relative(root, sourcePath).replace(/\\/g, '/');
runNodeScript('scripts/validate-data.mjs', { EVENTLIVE_SOURCE_FILE: sourceFile });
runNodeScript('scripts/generate-site.mjs', { EVENTLIVE_SOURCE_FILE: sourceFile });

const document = readJson(sourcePath);
const releaseId = process.env.EVENTLIVE_RELEASE_ID || buildReleaseId(document.program);
const publishedAt = new Date().toISOString();
const summary = process.env.EVENTLIVE_RELEASE_NOTE || 'Approved publishable release created from concierge workflow.';
const organizerDisplayName = document.program.organizer_display_name || document.program.organizer_name;
const liveSite = {
  ...buildLiveSiteMap(releaseId),
  generated_at: publishedAt
};

ensureDir(path.dirname(paths.publishedCurrent));
ensureDir(paths.releaseReportsDir);
ensureDir(paths.releasePackagesDir);
ensureDir(paths.distDeliveryPackageDir);

fs.copyFileSync(sourcePath, paths.publishedCurrent);
const releaseArtifacts = getReleaseArtifactPaths(releaseId);
ensureDir(releaseArtifacts.packageDir);
copyFileIfExists(paths.distIndex, releaseArtifacts.releaseProgramHtml);
copyFileIfExists(paths.distPrint, releaseArtifacts.releasePrintHtml);
copyFileIfExists(paths.distShare, releaseArtifacts.releaseShareHtml);

const manifest = {
  release_id: releaseId,
  status: 'approved_current',
  source_file: sourceFile,
  published_program_file: rel(paths.publishedCurrent),
  release_notes_file: rel(releaseArtifacts.releaseNote),
  program_title: document.program.program_title,
  organizer_name: document.program.organizer_name,
  organizer_display_name: organizerDisplayName,
  logo_text: document.program.logo_text || null,
  primary_label: document.program.primary_label || null,
  support_contact: document.program.support_contact || null,
  footer_note: document.program.footer_note || null,
  venue: document.program.venue,
  city: document.program.city,
  event_start: document.program.event_start,
  event_end: document.program.event_end,
  updated_at: document.program.updated_at,
  sessions_count: document.sessions.length,
  published_at: publishedAt
};

writeJson(paths.publishedRelease, manifest);
writeJson(paths.latestApprovedReport, manifest);

const releaseNote = makeReleaseNote({
  releaseId,
  sourceFile,
  program: document.program,
  sessions: document.sessions,
  summary,
  phase: 'publish',
  generatedAt: publishedAt
});
fs.writeFileSync(releaseArtifacts.releaseNote, `${releaseNote}\n`, 'utf8');

const bundle = {
  release_id: releaseId,
  status: manifest.status,
  generated_at: publishedAt,
  program_title: manifest.program_title,
  organizer_name: manifest.organizer_name,
  source_file: manifest.source_file,
  published_program_file: manifest.published_program_file,
  output_site_file: 'dist/index.html',
  validation_report_file: rel(paths.validationReport),
  build_report_file: rel(paths.buildReport),
  release_notes_file: manifest.release_notes_file,
  latest_approved_manifest_file: rel(paths.latestApprovedReport),
  archive_index_file: rel(paths.archiveIndexReport),
  latest_diff_json_file: exists(paths.latestDiffJson) ? rel(paths.latestDiffJson) : null,
  latest_diff_md_file: exists(paths.latestDiffMd) ? rel(paths.latestDiffMd) : null,
  latest_diff_html_file: exists(paths.latestDiffHtml) ? rel(paths.latestDiffHtml) : null,
  latest_program_html_file: rel(paths.distIndex),
  latest_print_html_file: rel(paths.distPrint),
  latest_share_html_file: rel(paths.distShare),
  release_program_html_file: rel(releaseArtifacts.releaseProgramHtml),
  release_print_html_file: rel(releaseArtifacts.releasePrintHtml),
  release_share_html_file: rel(releaseArtifacts.releaseShareHtml),
  live_site_file: rel(paths.distLiveSiteJson),
  public_base_url: liveSite.public_base_url,
  live_program_url: liveSite.program_url,
  live_print_url: liveSite.print_url,
  live_share_url: liveSite.share_url
};

writeJson(paths.currentBundleJson, bundle);
writeMarkdown(paths.currentBundleMd, [
  '# Current Release Bundle',
  `- Release ID: ${bundle.release_id}`,
  `- Generated at: ${bundle.generated_at}`,
  `- Program title: ${bundle.program_title}`,
  `- Organizer: ${bundle.organizer_name}`,
  `- Source file: ${bundle.source_file}`,
  `- Published program: ${bundle.published_program_file}`,
  `- Output site: ${bundle.output_site_file}`,
  `- Validation report: ${bundle.validation_report_file}`,
  `- Build report: ${bundle.build_report_file}`,
  `- Release notes: ${bundle.release_notes_file}`,
  `- Latest approved manifest: ${bundle.latest_approved_manifest_file}`,
  `- Archive index: ${bundle.archive_index_file}`,
  `- Latest diff JSON: ${bundle.latest_diff_json_file || 'n/a'}`,
  `- Latest diff Markdown: ${bundle.latest_diff_md_file || 'n/a'}`,
  `- Latest diff HTML: ${bundle.latest_diff_html_file || 'n/a'}`,
  `- Latest program HTML: ${bundle.latest_program_html_file}`,
  `- Latest print HTML: ${bundle.latest_print_html_file}`,
  `- Latest share HTML: ${bundle.latest_share_html_file}`,
  `- Release program HTML: ${bundle.release_program_html_file}`,
  `- Release print HTML: ${bundle.release_print_html_file}`,
  `- Release share HTML: ${bundle.release_share_html_file}`
]);
copyFileIfExists(paths.currentBundleJson, paths.distBundle);

const shareKit = {
  release_id: releaseId,
  generated_at: publishedAt,
  program_title: document.program.program_title,
  organizer_display_name: organizerDisplayName,
  primary_label: document.program.primary_label || 'البرنامج الرسمي',
  support_contact: document.program.support_contact || null,
  footer_note: document.program.footer_note || null,
  share_title: `${document.program.program_title} | ${document.program.organizer_display_name || document.program.organizer_name}`,
  share_description: `برنامج جلسات تفاعلي مخصص للزوار. الموقع: ${document.program.venue} - ${document.program.city}.`,
  share_url: liveSite.share_url,
  qr_handoff_placeholder: `QR placeholder for ${releaseId}: generate a QR that points to ${liveSite.qr_target_url}.`,
  public_base_url: liveSite.public_base_url,
  latest_program_html_file: bundle.latest_program_html_file,
  latest_print_html_file: bundle.latest_print_html_file,
  latest_share_html_file: bundle.latest_share_html_file,
  release_program_html_file: bundle.release_program_html_file,
  release_print_html_file: bundle.release_print_html_file,
  release_share_html_file: bundle.release_share_html_file,
  print_share_notes: [
    'شارك الرابط النهائي أو رمز QR بعد اعتماد النشر فقط.',
    'استخدم هذه النسخة في الطباعة السريعة أو لوحات الاستقبال بعد التأكد من latest approved release.',
    'عند أي تحديث يوم الحدث، أعد توليد الـ share kit من الإصدار الجديد فقط.'
  ],
  release_summary: summary
};

writeJson(releaseArtifacts.shareKitJson, shareKit);
writeMarkdown(releaseArtifacts.shareKitMd, [
  '# Share Kit',
  `- Release ID: ${shareKit.release_id}`,
  `- Program title: ${shareKit.program_title}`,
  `- Organizer display name: ${shareKit.organizer_display_name}`,
  `- Primary label: ${shareKit.primary_label}`,
  `- Support contact: ${shareKit.support_contact || 'n/a'}`,
  `- Share title: ${shareKit.share_title}`,
  `- Share description: ${shareKit.share_description}`,
  `- Public base URL: ${shareKit.public_base_url}`,
  `- Share URL: ${shareKit.share_url}`,
  `- Latest program HTML: ${shareKit.latest_program_html_file}`,
  `- Latest print HTML: ${shareKit.latest_print_html_file}`,
  `- Latest share HTML: ${shareKit.latest_share_html_file}`,
  `- Release program HTML: ${shareKit.release_program_html_file}`,
  `- Release print HTML: ${shareKit.release_print_html_file}`,
  `- Release share HTML: ${shareKit.release_share_html_file}`,
  '',
  '## Release Summary',
  `- ${shareKit.release_summary}`,
  '',
  '## Print / Share Notes',
  ...shareKit.print_share_notes.map((note) => `- ${note}`)
]);
fs.writeFileSync(releaseArtifacts.qrPlaceholder, `${shareKit.qr_handoff_placeholder}\n`, 'utf8');
bundle.share_kit_json_file = rel(releaseArtifacts.shareKitJson);
bundle.share_kit_md_file = rel(releaseArtifacts.shareKitMd);
bundle.qr_handoff_placeholder_file = rel(releaseArtifacts.qrPlaceholder);
const handoffNotes = [
  '# Handoff Notes',
  `- Release ID: ${releaseId}`,
  `- Program title: ${manifest.program_title}`,
  `- Organizer: ${organizerDisplayName}`,
  `- Status: latest approved release`,
  `- Latest release meaning: this is the only release that should be shared as the current official visitor-facing version.`,
  `- Live site base URL: ${liveSite.public_base_url}`,
  '',
  '## What the organizer receives',
  `- Program page: ${liveSite.program_url}`,
  `- Print view: ${liveSite.print_url}`,
  `- Share landing: ${liveSite.share_url}`,
  `- Delivery manifest: ${rel(paths.distDeliveryManifestMd)}`,
  `- Share kit: ${rel(paths.distShareKitMd)}`,
  `- Release bundle: ${rel(paths.distBundle)}`,
  `- Live site metadata: ${rel(paths.distLiveSiteJson)}`,
  '',
  '## When to use each file',
  '- Use the program page as the main live visitor-facing program.',
  '- Use the print view for reception desks, signage support, and quick printable review.',
  '- Use the share landing for short-link or QR based distribution.',
  '- Use the delivery manifest and release bundle for operational review and audit.',
  '',
  '## Event-day updates',
  '- Any same-day change requires a new approved publish cycle with updated `program.updated_at`.',
  '- The latest approved release always replaces the previous official live version.',
  '- Superseded approved releases should be archived and must not remain the active shared version.',
  '',
  '## Organizer action required for a new release',
  '- Confirm the updated sessions, rooms, speakers, and timing changes.',
  '- Approve the preview or diff before the new release is shared publicly.',
  '- Stop sharing any previous QR or short-link if it points to a superseded release.',
  '',
  '## Operational notes',
  '- This package is static-first and contains no backend workflow.',
  '- Current live URLs are resolved from EVENTLIVE_PUBLIC_BASE_URL during publish/deploy.',
  '- QR output remains a placeholder note until an image asset is generated.'
].join('\n');
fs.writeFileSync(releaseArtifacts.handoffNotes, `${handoffNotes}\n`, 'utf8');
writeJson(paths.distLiveSiteJson, liveSite);

const currentDeliveryManifest = {
  release_id: releaseId,
  status: manifest.status,
  latest_indicator: 'current_latest_approved',
  archived_indicator: false,
  program_title: manifest.program_title,
  organizer_name: manifest.organizer_name,
  organizer_display_name: organizerDisplayName,
  city: manifest.city,
  venue: manifest.venue,
  event_start: manifest.event_start,
  event_end: manifest.event_end,
  updated_at: manifest.updated_at,
  published_at: manifest.published_at,
  release_note: summary,
  canonical_paths: {
    latest_program_page: rel(paths.distIndex),
    latest_print_view: rel(paths.distPrint),
    latest_share_landing: rel(paths.distShare),
    latest_release_bundle: rel(paths.distBundle),
    latest_delivery_manifest_json: rel(paths.distDeliveryManifestJson),
    latest_delivery_manifest_md: rel(paths.distDeliveryManifestMd),
    latest_share_kit_json: rel(paths.distShareKitJson),
    latest_share_kit_md: rel(paths.distShareKitMd),
    latest_handoff_notes: rel(paths.distHandoffNotes),
    latest_archive_browser: rel(paths.distArchiveBrowser),
    latest_live_site_json: rel(paths.distLiveSiteJson),
    release_package_dir: rel(releaseArtifacts.packageDir),
    release_program_page: rel(releaseArtifacts.releaseProgramHtml),
    release_print_view: rel(releaseArtifacts.releasePrintHtml),
    release_share_landing: rel(releaseArtifacts.releaseShareHtml),
    release_manifest_json: rel(releaseArtifacts.deliveryManifestJson),
    release_manifest_md: rel(releaseArtifacts.deliveryManifestMd),
    release_handoff_notes: rel(releaseArtifacts.handoffNotes),
    archive_index: rel(paths.archiveIndexReport)
  },
  share_assets: {
    share_landing: rel(paths.distShare),
    live_share_url: liveSite.share_url,
    share_kit_json: rel(releaseArtifacts.shareKitJson),
    share_kit_md: rel(releaseArtifacts.shareKitMd),
    qr_placeholder: rel(releaseArtifacts.qrPlaceholder)
  },
  print_assets: {
    latest_print_view: rel(paths.distPrint),
    live_print_url: liveSite.print_url,
    release_print_view: rel(releaseArtifacts.releasePrintHtml)
  },
  public_urls: {
    base_url: liveSite.public_base_url,
    program_url: liveSite.program_url,
    print_url: liveSite.print_url,
    share_url: liveSite.share_url,
    archive_browser_url: liveSite.archive_browser_url
  },
  archive_linkage: {
    latest_approved_manifest: rel(paths.latestApprovedReport),
    archive_index: rel(paths.archiveIndexReport),
    archive_browser: rel(paths.distArchiveBrowser),
    archive_source_dir: `data/archive/releases/${releaseId}`,
    archive_status_note: 'This release is current now and will appear in archive after archive step runs.'
  },
  handoff_notes_reference: rel(releaseArtifacts.handoffNotes),
  included_delivery_files: [
    { label: 'program_page', path: rel(paths.distIndex), category: 'current_live' },
    { label: 'print_view', path: rel(paths.distPrint), category: 'current_live' },
    { label: 'share_landing', path: rel(paths.distShare), category: 'current_live' },
    { label: 'release_bundle', path: rel(paths.distBundle), category: 'current_live' },
    { label: 'share_kit_json', path: rel(paths.distShareKitJson), category: 'current_live' },
    { label: 'share_kit_md', path: rel(paths.distShareKitMd), category: 'current_live' },
    { label: 'qr_placeholder', path: rel(paths.distQrPlaceholder), category: 'current_live' },
    { label: 'delivery_manifest_json', path: rel(paths.distDeliveryManifestJson), category: 'current_live' },
    { label: 'delivery_manifest_md', path: rel(paths.distDeliveryManifestMd), category: 'current_live' },
    { label: 'handoff_notes', path: rel(paths.distHandoffNotes), category: 'current_live' },
    { label: 'live_site_json', path: rel(paths.distLiveSiteJson), category: 'current_live' },
    { label: 'archive_browser', path: rel(paths.distArchiveBrowser), category: 'current_live' },
    { label: 'release_package_dir', path: rel(releaseArtifacts.packageDir), category: 'release_specific' }
  ]
};
writeJson(releaseArtifacts.deliveryManifestJson, currentDeliveryManifest);
writeMarkdown(releaseArtifacts.deliveryManifestMd, [
  '# Delivery Manifest',
  `- Release ID: ${currentDeliveryManifest.release_id}`,
  `- Status: ${currentDeliveryManifest.status}`,
  `- Latest indicator: ${currentDeliveryManifest.latest_indicator}`,
  `- Archived indicator: ${currentDeliveryManifest.archived_indicator}`,
  `- Program title: ${currentDeliveryManifest.program_title}`,
  `- Organizer: ${currentDeliveryManifest.organizer_display_name}`,
  `- City: ${currentDeliveryManifest.city}`,
  `- Venue: ${currentDeliveryManifest.venue}`,
  `- Event start: ${currentDeliveryManifest.event_start}`,
  `- Event end: ${currentDeliveryManifest.event_end}`,
  `- Updated at: ${currentDeliveryManifest.updated_at}`,
  `- Published at: ${currentDeliveryManifest.published_at}`,
  `- Release note: ${currentDeliveryManifest.release_note}`,
  '',
  '## Canonical Paths',
  ...Object.entries(currentDeliveryManifest.canonical_paths).map(([key, value]) => `- ${key}: ${value}`),
  '',
  '## Included Delivery Files',
  ...currentDeliveryManifest.included_delivery_files.map((item) => `- ${item.label}: ${item.path} | ${item.category}`),
  '',
  '## Archive Linkage',
  ...Object.entries(currentDeliveryManifest.archive_linkage).map(([key, value]) => `- ${key}: ${value}`),
  '',
  '## Handoff Notes Reference',
  `- ${currentDeliveryManifest.handoff_notes_reference}`
]);

manifest.delivery_manifest_json_file = rel(releaseArtifacts.deliveryManifestJson);
manifest.delivery_manifest_md_file = rel(releaseArtifacts.deliveryManifestMd);
manifest.handoff_notes_file = rel(releaseArtifacts.handoffNotes);
manifest.release_package_dir = rel(releaseArtifacts.packageDir);
writeJson(paths.publishedRelease, manifest);
writeJson(paths.latestApprovedReport, manifest);

bundle.delivery_manifest_json_file = rel(releaseArtifacts.deliveryManifestJson);
bundle.delivery_manifest_md_file = rel(releaseArtifacts.deliveryManifestMd);
bundle.handoff_notes_file = rel(releaseArtifacts.handoffNotes);
bundle.release_package_dir = rel(releaseArtifacts.packageDir);
writeJson(paths.currentBundleJson, bundle);
writeMarkdown(paths.currentBundleMd, [
  '# Current Release Bundle',
  `- Release ID: ${bundle.release_id}`,
  `- Generated at: ${bundle.generated_at}`,
  `- Program title: ${bundle.program_title}`,
  `- Organizer: ${bundle.organizer_name}`,
  `- Source file: ${bundle.source_file}`,
  `- Published program: ${bundle.published_program_file}`,
  `- Output site: ${bundle.output_site_file}`,
  `- Validation report: ${bundle.validation_report_file}`,
  `- Build report: ${bundle.build_report_file}`,
  `- Release notes: ${bundle.release_notes_file}`,
  `- Latest approved manifest: ${bundle.latest_approved_manifest_file}`,
  `- Archive index: ${bundle.archive_index_file}`,
  `- Latest diff JSON: ${bundle.latest_diff_json_file || 'n/a'}`,
  `- Latest diff Markdown: ${bundle.latest_diff_md_file || 'n/a'}`,
  `- Latest diff HTML: ${bundle.latest_diff_html_file || 'n/a'}`,
  `- Latest program HTML: ${bundle.latest_program_html_file}`,
  `- Latest print HTML: ${bundle.latest_print_html_file}`,
  `- Latest share HTML: ${bundle.latest_share_html_file}`,
  `- Release program HTML: ${bundle.release_program_html_file}`,
  `- Release print HTML: ${bundle.release_print_html_file}`,
  `- Release share HTML: ${bundle.release_share_html_file}`,
  `- Share kit JSON: ${bundle.share_kit_json_file}`,
  `- Share kit Markdown: ${bundle.share_kit_md_file}`,
  `- QR placeholder: ${bundle.qr_handoff_placeholder_file}`,
  `- Delivery manifest JSON: ${bundle.delivery_manifest_json_file}`,
  `- Delivery manifest Markdown: ${bundle.delivery_manifest_md_file}`,
  `- Handoff notes: ${bundle.handoff_notes_file}`,
  `- Release package dir: ${bundle.release_package_dir}`
]);
copyArtifacts([
  [releaseArtifacts.shareKitJson, paths.distShareKitJson],
  [releaseArtifacts.shareKitMd, paths.distShareKitMd],
  [releaseArtifacts.qrPlaceholder, paths.distQrPlaceholder],
  [releaseArtifacts.deliveryManifestJson, paths.distDeliveryManifestJson],
  [releaseArtifacts.deliveryManifestMd, paths.distDeliveryManifestMd],
  [releaseArtifacts.handoffNotes, paths.distHandoffNotes]
]);
copyFileIfExists(paths.currentBundleJson, paths.distBundle);

fs.rmSync(paths.distDeliveryPackageDir, { recursive: true, force: true });
ensureDir(paths.distDeliveryPackageDir);
copyArtifacts([
  [paths.distIndex, releaseArtifacts.packageProgramHtml],
  [paths.distPrint, releaseArtifacts.packagePrintHtml],
  [paths.distShare, releaseArtifacts.packageShareHtml],
  [paths.currentBundleJson, releaseArtifacts.packageBundleJson],
  [releaseArtifacts.shareKitJson, releaseArtifacts.packageShareKitJson],
  [releaseArtifacts.shareKitMd, releaseArtifacts.packageShareKitMd],
  [releaseArtifacts.qrPlaceholder, releaseArtifacts.packageQrPlaceholder],
  [releaseArtifacts.releaseNote, releaseArtifacts.packageReleaseNotes],
  [releaseArtifacts.deliveryManifestJson, releaseArtifacts.packageDeliveryManifestJson],
  [releaseArtifacts.deliveryManifestMd, releaseArtifacts.packageDeliveryManifestMd],
  [releaseArtifacts.handoffNotes, releaseArtifacts.packageHandoffNotes],
  [paths.distLiveSiteJson, path.join(releaseArtifacts.packageDir, 'current-live-site.json')],
  [paths.distArchiveBrowser, releaseArtifacts.packageArchiveBrowser]
]);

const packageReadme = [
  '# Release Package',
  `- Release ID: ${releaseId}`,
  `- Program title: ${manifest.program_title}`,
  `- Organizer: ${organizerDisplayName}`,
  `- Status: latest approved delivery package`,
  '',
  '## Package Contents',
  '- `program.html`',
  '- `print.html`',
  '- `share.html`',
  '- `current-release-bundle.json`',
  '- `share-kit.json`',
  '- `share-kit.md`',
  '- `qr-placeholder.txt`',
  '- `release-notes.md`',
  '- `delivery-manifest.json`',
  '- `delivery-manifest.md`',
  '- `handoff-notes.md`',
  '- `current-live-site.json`',
  '- `archive-browser.html`',
  '',
  'This folder is the release-specific delivery package that can be copied, reviewed, or handed off as one unit.'
].join('\n');
fs.writeFileSync(releaseArtifacts.packageReadme, `${packageReadme}\n`, 'utf8');

copyArtifacts([
  [paths.distIndex, path.join(paths.distDeliveryPackageDir, 'program.html')],
  [paths.distPrint, path.join(paths.distDeliveryPackageDir, 'print.html')],
  [paths.distShare, path.join(paths.distDeliveryPackageDir, 'share.html')],
  [paths.currentBundleJson, path.join(paths.distDeliveryPackageDir, 'current-release-bundle.json')],
  [releaseArtifacts.shareKitJson, path.join(paths.distDeliveryPackageDir, 'share-kit.json')],
  [releaseArtifacts.shareKitMd, path.join(paths.distDeliveryPackageDir, 'share-kit.md')],
  [releaseArtifacts.qrPlaceholder, path.join(paths.distDeliveryPackageDir, 'qr-placeholder.txt')],
  [releaseArtifacts.releaseNote, path.join(paths.distDeliveryPackageDir, 'release-notes.md')],
  [releaseArtifacts.deliveryManifestJson, path.join(paths.distDeliveryPackageDir, 'delivery-manifest.json')],
  [releaseArtifacts.deliveryManifestMd, path.join(paths.distDeliveryPackageDir, 'delivery-manifest.md')],
  [releaseArtifacts.handoffNotes, path.join(paths.distDeliveryPackageDir, 'handoff-notes.md')],
  [paths.distLiveSiteJson, path.join(paths.distDeliveryPackageDir, 'current-live-site.json')],
  [paths.distArchiveBrowser, path.join(paths.distDeliveryPackageDir, 'archive-browser.html')]
]);
fs.writeFileSync(path.join(paths.distDeliveryPackageDir, 'README.md'), `${packageReadme.replace('release-specific', 'current live')}\n`, 'utf8');

console.log(`PUBLISH_OK release_id=${releaseId} source=${sourceFile}`);
