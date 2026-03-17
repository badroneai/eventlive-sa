import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const root = process.cwd();

export const paths = {
  demoProgram: path.join(root, 'data', 'demo_program.json'),
  intakeCurrent: path.join(root, 'data', 'intake', 'current-program.json'),
  intakeExample: path.join(root, 'data', 'intake', 'current-program.example.json'),
  intakeUpdatedExample: path.join(root, 'data', 'intake', 'current-program.updated.example.json'),
  intakeTemplate: path.join(root, 'data', 'intake', 'event-program-template.csv'),
  publishedCurrent: path.join(root, 'data', 'published', 'current-program.json'),
  publishedRelease: path.join(root, 'data', 'published', 'current-release.json'),
  archiveRoot: path.join(root, 'data', 'archive', 'releases'),
  releaseReportsDir: path.join(root, 'reports', 'releases'),
  releasePackagesDir: path.join(root, 'reports', 'releases', 'packages'),
  diffReportsDir: path.join(root, 'reports', 'diffs'),
  distDir: path.join(root, 'dist'),
  distDeliveryPackageDir: path.join(root, 'dist', 'delivery-package'),
  distIndex: path.join(root, 'dist', 'index.html'),
  distPrint: path.join(root, 'dist', 'print.html'),
  distShare: path.join(root, 'dist', 'share.html'),
  distBundle: path.join(root, 'dist', 'current-release-bundle.json'),
  distDeliveryManifestJson: path.join(root, 'dist', 'current-delivery-manifest.json'),
  distDeliveryManifestMd: path.join(root, 'dist', 'current-delivery-manifest.md'),
  distHandoffNotes: path.join(root, 'dist', 'handoff-notes.md'),
  distShareKitJson: path.join(root, 'dist', 'share-kit.json'),
  distShareKitMd: path.join(root, 'dist', 'share-kit.md'),
  distQrPlaceholder: path.join(root, 'dist', 'qr-placeholder.txt'),
  distArchiveBrowser: path.join(root, 'dist', 'archive-browser.html'),
  distLiveSiteJson: path.join(root, 'dist', 'current-live-site.json'),
  buildReport: path.join(root, 'reports', 'build-report.md'),
  validationReport: path.join(root, 'reports', 'validation-report.md'),
  latestDiffJson: path.join(root, 'reports', 'diffs', 'latest-diff.json'),
  latestDiffMd: path.join(root, 'reports', 'diffs', 'latest-diff.md'),
  latestDiffHtml: path.join(root, 'reports', 'diffs', 'latest-diff.html'),
  latestApprovedReport: path.join(root, 'reports', 'releases', 'latest-approved.json'),
  archiveIndexReport: path.join(root, 'reports', 'releases', 'archive-index.json'),
  currentBundleJson: path.join(root, 'reports', 'releases', 'current-release-bundle.json'),
  currentBundleMd: path.join(root, 'reports', 'releases', 'current-release-bundle.md')
};

export function resolveSourceFile(defaultPath) {
  const configured = process.env.EVENTLIVE_SOURCE_FILE;
  return configured ? path.join(root, configured) : defaultPath;
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

export function resolvePublicBaseUrl() {
  const configured = process.env.EVENTLIVE_PUBLIC_BASE_URL
    || process.env.EVENTLIVE_DEPLOY_URL
    || process.env.EVENTLIVE_URL
    || 'https://badroneai.github.io/eventlive-sa/';

  if (!configured) return '';
  return configured.endsWith('/') ? configured : `${configured}/`;
}

export function joinPublicUrl(relativePath = '') {
  const baseUrl = resolvePublicBaseUrl();
  if (!baseUrl) return '';
  const safePath = String(relativePath || '').replace(/^\/+/, '');
  return new URL(safePath, baseUrl).toString();
}

export function buildLiveSiteMap(releaseId = '') {
  return {
    release_id: releaseId || null,
    public_base_url: resolvePublicBaseUrl(),
    program_url: joinPublicUrl(''),
    print_url: joinPublicUrl('print.html'),
    share_url: joinPublicUrl('share.html'),
    archive_browser_url: joinPublicUrl('archive-browser.html'),
    delivery_manifest_url: joinPublicUrl('current-delivery-manifest.md'),
    release_bundle_url: joinPublicUrl('current-release-bundle.json'),
    share_kit_url: joinPublicUrl('share-kit.md'),
    qr_target_url: joinPublicUrl('share.html')
  };
}

export function parseCsv(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((field) => field !== '')) rows.push(currentRow);
      currentRow = [];
      continue;
    }

    currentField += ch;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field !== '')) rows.push(currentRow);
  }

  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((cols) => {
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] ?? '';
    });
    return row;
  });
}

export function normalizeIntakeRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('No intake rows to normalize');
  }

  const first = rows[0];
  return {
    program: {
      program_title: first.program_title || '',
      organizer_name: first.organizer_name || '',
      logo_text: first.logo_text || '',
      organizer_display_name: first.organizer_display_name || '',
      primary_label: first.primary_label || '',
      support_contact: first.support_contact || '',
      footer_note: first.footer_note || '',
      venue: first.venue || '',
      city: first.city || '',
      event_start: first.event_start || '',
      event_end: first.event_end || '',
      updated_at: first.program_updated_at || ''
    },
    sessions: rows.map((row) => ({
      id: row.id || '',
      source: row.source || '',
      day_label: row.day_label || '',
      session_title: row.session_title || '',
      session_type: row.session_type || '',
      track: row.track || '',
      speaker: row.speaker || '',
      moderator: row.moderator || '',
      start_at: row.start_at || '',
      end_at: row.end_at || '',
      room: row.room || '',
      status: row.status || '',
      language: row.language || '',
      audience: row.audience || '',
      tags: row.tags ? row.tags.split('|').map((item) => item.trim()).filter(Boolean) : [],
      updated_at: row.session_updated_at || ''
    }))
  };
}

export function normalizeCsvText(content) {
  const rows = parseCsv(content);
  if (!rows.length) {
    throw new Error('No intake rows found in CSV input');
  }
  return normalizeIntakeRows(rows);
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function copyFileIfExists(sourcePath, targetPath) {
  if (!exists(sourcePath)) return false;
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

export function runNodeScript(scriptRelPath, envOverrides = {}) {
  const result = spawnSync(process.execPath, [path.join(root, scriptRelPath)], {
    encoding: 'utf8',
    stdio: 'inherit',
    env: { ...process.env, ...envOverrides }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function toReleaseTimestamp(isoValue) {
  const parsed = new Date(isoValue || Date.now());
  return parsed.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildReleaseId(program) {
  return `release-${toReleaseTimestamp(program.updated_at)}`;
}

export function getReleaseArtifactPaths(releaseId) {
  const packageDir = path.join(paths.releasePackagesDir, releaseId);
  return {
    packageDir,
    releaseNote: path.join(paths.releaseReportsDir, `${releaseId}.md`),
    releaseProgramHtml: path.join(paths.releaseReportsDir, `${releaseId}.program.html`),
    releasePrintHtml: path.join(paths.releaseReportsDir, `${releaseId}.print.html`),
    releaseShareHtml: path.join(paths.releaseReportsDir, `${releaseId}.share.html`),
    shareKitJson: path.join(paths.releaseReportsDir, `${releaseId}.share-kit.json`),
    shareKitMd: path.join(paths.releaseReportsDir, `${releaseId}.share-kit.md`),
    qrPlaceholder: path.join(paths.releaseReportsDir, `${releaseId}.qr-placeholder.txt`),
    deliveryManifestJson: path.join(paths.releaseReportsDir, `${releaseId}.delivery-manifest.json`),
    deliveryManifestMd: path.join(paths.releaseReportsDir, `${releaseId}.delivery-manifest.md`),
    handoffNotes: path.join(paths.releaseReportsDir, `${releaseId}.handoff-notes.md`),
    packageReadme: path.join(packageDir, 'README.md'),
    packageProgramHtml: path.join(packageDir, 'program.html'),
    packagePrintHtml: path.join(packageDir, 'print.html'),
    packageShareHtml: path.join(packageDir, 'share.html'),
    packageBundleJson: path.join(packageDir, 'current-release-bundle.json'),
    packageShareKitJson: path.join(packageDir, 'share-kit.json'),
    packageShareKitMd: path.join(packageDir, 'share-kit.md'),
    packageQrPlaceholder: path.join(packageDir, 'qr-placeholder.txt'),
    packageReleaseNotes: path.join(packageDir, 'release-notes.md'),
    packageDeliveryManifestJson: path.join(packageDir, 'delivery-manifest.json'),
    packageDeliveryManifestMd: path.join(packageDir, 'delivery-manifest.md'),
    packageHandoffNotes: path.join(packageDir, 'handoff-notes.md'),
    packageArchiveBrowser: path.join(packageDir, 'archive-browser.html')
  };
}

export function makeReleaseNote({
  releaseId,
  sourceFile,
  program,
  sessions,
  summary,
  phase,
  generatedAt
}) {
  return [
    `# Release Notes: ${releaseId}`,
    `- Phase: ${phase}`,
    `- Program title: ${program.program_title}`,
    `- Organizer: ${program.organizer_name}`,
    `- Venue: ${program.venue}`,
    `- City: ${program.city}`,
    `- Event window: ${program.event_start} -> ${program.event_end}`,
    `- Program updated_at: ${program.updated_at}`,
    `- Sessions: ${sessions.length}`,
    `- Source file: ${sourceFile}`,
    `- Generated at: ${generatedAt}`,
    '',
    '## Summary',
    `- ${summary || 'Approved program release.'}`,
    '',
    '## Event-Day Update Policy',
    '- Any same-day schedule change must update `program.updated_at` and affected session `updated_at` values.',
    '- Re-run validation and preview before publishing the update.',
    '- Archive the superseded approved release before or immediately after publishing the new approved release.',
    '- Keep `reports/releases/latest-approved.json` pointing only to the currently approved release.'
  ].join('\n');
}

export function upsertArchiveIndex(entry) {
  const current = exists(paths.archiveIndexReport)
    ? readJson(paths.archiveIndexReport)
    : { generated_at: null, archived_releases: [] };

  const archived = current.archived_releases.filter((item) => item.release_id !== entry.release_id);
  archived.push(entry);
  archived.sort((a, b) => String(b.archived_at).localeCompare(String(a.archived_at)));

  writeJson(paths.archiveIndexReport, {
    generated_at: new Date().toISOString(),
    archived_releases: archived
  });
}
