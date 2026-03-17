import fs from 'node:fs';
import path from 'node:path';
import {
  copyFileIfExists,
  ensureDir,
  exists,
  getReleaseArtifactPaths,
  makeReleaseNote,
  paths,
  readJson,
  rel,
  root,
  upsertArchiveIndex,
  writeJson
} from './program-lifecycle-utils.mjs';

if (!exists(paths.publishedCurrent) || !exists(paths.publishedRelease)) {
  throw new Error('Nothing to archive. Publish an approved program first.');
}

const manifest = readJson(paths.publishedRelease);
const document = readJson(paths.publishedCurrent);
const archivedAt = new Date().toISOString();
const archiveDir = path.join(paths.archiveRoot, manifest.release_id);
const releaseArtifacts = getReleaseArtifactPaths(manifest.release_id);
ensureDir(archiveDir);

const programArchivePath = path.join(archiveDir, 'program.json');
const noteArchivePath = path.join(archiveDir, 'release-notes.md');
fs.copyFileSync(paths.publishedCurrent, programArchivePath);

const currentReleaseNotePath = path.join(root, manifest.release_notes_file);
const noteText = exists(currentReleaseNotePath)
  ? fs.readFileSync(currentReleaseNotePath, 'utf8')
  : makeReleaseNote({
      releaseId: manifest.release_id,
      sourceFile: manifest.source_file,
      program: document.program,
      sessions: document.sessions,
      summary: 'Archived approved release snapshot.',
      phase: 'archive',
      generatedAt: archivedAt
    });

fs.writeFileSync(noteArchivePath, noteText.endsWith('\n') ? noteText : `${noteText}\n`, 'utf8');

if (exists(releaseArtifacts.deliveryManifestJson)) {
  const deliveryManifest = readJson(releaseArtifacts.deliveryManifestJson);
  deliveryManifest.archived_indicator = true;
  deliveryManifest.latest_indicator = 'archived_release';
  deliveryManifest.archive_linkage = {
    ...(deliveryManifest.archive_linkage || {}),
    archive_source_dir: rel(archiveDir),
    archived_at: archivedAt,
    archive_status_note: 'This release has been archived and should no longer be treated as the active live delivery package.'
  };
  writeJson(releaseArtifacts.deliveryManifestJson, deliveryManifest);

  const deliveryManifestMd = [
    '# Delivery Manifest',
    `- Release ID: ${deliveryManifest.release_id}`,
    `- Status: ${deliveryManifest.status}`,
    `- Latest indicator: ${deliveryManifest.latest_indicator}`,
    `- Archived indicator: ${deliveryManifest.archived_indicator}`,
    `- Program title: ${deliveryManifest.program_title}`,
    `- Organizer: ${deliveryManifest.organizer_display_name || deliveryManifest.organizer_name}`,
    `- City: ${deliveryManifest.city}`,
    `- Venue: ${deliveryManifest.venue}`,
    `- Event start: ${deliveryManifest.event_start}`,
    `- Event end: ${deliveryManifest.event_end}`,
    `- Updated at: ${deliveryManifest.updated_at}`,
    `- Published at: ${deliveryManifest.published_at}`,
    `- Release note: ${deliveryManifest.release_note}`,
    '',
    '## Canonical Paths',
    ...Object.entries(deliveryManifest.canonical_paths || {}).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Included Delivery Files',
    ...(deliveryManifest.included_delivery_files || []).map((item) => `- ${item.label}: ${item.path} | ${item.category}`),
    '',
    '## Archive Linkage',
    ...Object.entries(deliveryManifest.archive_linkage || {}).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Handoff Notes Reference',
    `- ${deliveryManifest.handoff_notes_reference || 'n/a'}`
  ].join('\n');
  fs.writeFileSync(releaseArtifacts.deliveryManifestMd, `${deliveryManifestMd}\n`, 'utf8');
  copyFileIfExists(releaseArtifacts.deliveryManifestJson, releaseArtifacts.packageDeliveryManifestJson);
  copyFileIfExists(releaseArtifacts.deliveryManifestMd, releaseArtifacts.packageDeliveryManifestMd);
}

upsertArchiveIndex({
  release_id: manifest.release_id,
  archived_at: archivedAt,
  program_title: manifest.program_title,
  organizer_name: manifest.organizer_name,
  organizer_display_name: manifest.organizer_display_name || manifest.organizer_name,
  primary_label: manifest.primary_label || null,
  published_program_file: manifest.published_program_file,
  archive_program_file: rel(programArchivePath),
  archive_release_notes_file: rel(noteArchivePath),
  release_program_html_file: rel(releaseArtifacts.releaseProgramHtml),
  release_print_html_file: rel(releaseArtifacts.releasePrintHtml),
  release_share_html_file: rel(releaseArtifacts.releaseShareHtml),
  release_delivery_manifest_json_file: rel(releaseArtifacts.deliveryManifestJson),
  release_delivery_manifest_md_file: rel(releaseArtifacts.deliveryManifestMd),
  release_handoff_notes_file: rel(releaseArtifacts.handoffNotes),
  release_package_dir: rel(releaseArtifacts.packageDir),
  program_updated_at: manifest.updated_at,
  sessions_count: manifest.sessions_count
});

const archiveIndex = readJson(paths.archiveIndexReport);
const releaseLinks = (item) => [
  item.archive_program_file ? `<a href="../../${item.archive_program_file}">program.json</a>` : null,
  item.archive_release_notes_file ? `<a href="../../${item.archive_release_notes_file}">release-notes.md</a>` : null,
  item.release_program_html_file ? `<a href="../../${item.release_program_html_file}">program view</a>` : null,
  item.release_print_html_file ? `<a href="../../${item.release_print_html_file}">print view</a>` : null,
  item.release_share_html_file ? `<a href="../../${item.release_share_html_file}">share landing</a>` : null,
  item.release_delivery_manifest_md_file ? `<a href="../../${item.release_delivery_manifest_md_file}">delivery manifest</a>` : null,
  item.release_handoff_notes_file ? `<a href="../../${item.release_handoff_notes_file}">handoff notes</a>` : null
].filter(Boolean).join(' | ');
const archiveHtml = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EventLive | Archive Browser</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; margin: 24px; background:#0b1020; color:#e9eefc; }
    .wrap { max-width: 1100px; margin: 0 auto; }
    .hero, .card { background:#101a36; border:1px solid #24335d; border-radius:16px; }
    .hero { padding:18px; margin-bottom:18px; }
    .card { padding:16px; margin-bottom:12px; }
    .meta { color:#9fb2db; }
    a { color:#7dd3fc; }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Archive Browser</h1>
      <div class="meta">عدد النسخ المؤرشفة: ${archiveIndex.archived_releases.length}</div>
    </section>
    ${archiveIndex.archived_releases.map((item) => `
      <section class="card">
        <div><strong>${item.program_title}</strong> | ${item.release_id}</div>
        <div class="meta">الجهة: ${item.organizer_display_name || item.organizer_name} | ${item.archived_at}</div>
        <div class="meta">التصنيف: ${item.primary_label || 'n/a'} | عدد الجلسات: ${item.sessions_count}</div>
        <div>${releaseLinks(item)}</div>
      </section>
    `).join('')}
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(paths.releaseReportsDir, 'archive-browser.html'), `${archiveHtml}\n`, 'utf8');
copyFileIfExists(path.join(paths.releaseReportsDir, 'archive-browser.html'), paths.distArchiveBrowser);
fs.writeFileSync(path.join(paths.releaseReportsDir, 'archive-browser.md'), [
  '# Archive Browser',
  `- Archived releases: ${archiveIndex.archived_releases.length}`,
  ...archiveIndex.archived_releases.map((item) => `- ${item.release_id} | ${item.program_title} | ${item.archive_program_file || 'n/a'} | ${item.release_print_html_file || 'n/a'} | ${item.release_share_html_file || 'n/a'} | ${item.release_delivery_manifest_md_file || 'n/a'} | ${item.release_package_dir || 'n/a'}`)
].join('\n') + '\n', 'utf8');

console.log(`ARCHIVE_OK release_id=${manifest.release_id} archive_dir=${path.relative(root, archiveDir).replace(/\\/g, '/')}`);
