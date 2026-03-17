import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { rel, root } from '../../../scripts/program-lifecycle-utils.mjs';
import {
  getWorkspaceAttachmentsDir,
  normalizeWorkspaceId,
  readWorkspaceManifest,
  workspaceExists,
  writeWorkspaceManifest
} from '../storage/workspace-storage.mjs';

function sanitizeFilename(name) {
  return String(name || 'attachment')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'attachment';
}

function detectImportMode(filename, mimeType) {
  const lower = String(filename || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();

  if (lower.endsWith('.csv') || mime.includes('text/csv')) return 'csv';
  if (lower.endsWith('.xlsx') || mime.includes('spreadsheetml')) return 'xlsx';
  if (lower.endsWith('.xls')) return 'xls_unsupported';
  if (lower.endsWith('.pdf') || mime.includes('pdf')) return 'pdf_unsupported';
  if (/\.(png|jpg|jpeg|webp|heic)$/i.test(lower) || mime.startsWith('image/')) return 'image_unsupported';
  return 'unsupported';
}

function writeAttachment(workspaceId, filename, fileBuffer) {
  const dir = getWorkspaceAttachmentsDir(workspaceId);
  fs.mkdirSync(dir, { recursive: true });
  const stamped = `${new Date().toISOString().replace(/[:.]/g, '-')}-${sanitizeFilename(filename)}`;
  const targetPath = path.join(dir, stamped);
  fs.writeFileSync(targetPath, fileBuffer);
  return targetPath;
}

function extractCsvFromXlsx(filePath) {
  const scriptPath = path.join(root, 'scripts', 'xlsx-to-csv.py');
  const result = spawnSync('python3', [scriptPath, filePath], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'Failed to convert XLSX to CSV');
  }

  return result.stdout;
}

export function importWorkspaceIntakeFile(workspaceId, {
  filename,
  mimeType,
  contentBase64
} = {}) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  if (!filename || !contentBase64) {
    throw new Error('filename and contentBase64 are required');
  }

  const fileBuffer = Buffer.from(contentBase64, 'base64');
  const attachmentPath = writeAttachment(safeWorkspaceId, filename, fileBuffer);
  const mode = detectImportMode(filename, mimeType);
  const sourceLabel = path.basename(filename, path.extname(filename));
  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const now = new Date().toISOString();

  workspace.intake_attachment_file = rel(attachmentPath);
  workspace.intake_attachment_filename = filename;
  workspace.intake_attachment_mime_type = mimeType || null;
  workspace.intake_source_kind = 'uploaded_file';
  workspace.intake_original_filename = filename;
  workspace.last_intake_source = sourceLabel;
  workspace.updated_at = now;
  writeWorkspaceManifest(safeWorkspaceId, workspace);

  let csvText = '';
  let conversionStatus = 'stored_only';
  let message = 'Attachment stored. Manual intake review is still required.';

  if (mode === 'csv') {
    csvText = fileBuffer.toString('utf8');
    conversionStatus = 'converted_to_csv';
    message = 'CSV attachment imported into intake review.';
  } else if (mode === 'xlsx') {
    csvText = extractCsvFromXlsx(attachmentPath);
    conversionStatus = 'converted_to_csv';
    message = 'Excel attachment converted into intake CSV.';
  } else if (mode === 'xls_unsupported') {
    message = 'Legacy .xls files were attached, but automatic conversion is not available in this environment.';
  } else if (mode === 'pdf_unsupported') {
    message = 'PDF was attached, but automatic PDF-to-fields extraction is not available in this environment yet.';
  } else if (mode === 'image_unsupported') {
    message = 'Image was attached, but OCR-to-fields extraction is not available in this environment yet.';
  } else {
    message = 'Attachment stored, but this file type is not supported for automatic field conversion.';
  }

  return {
    workspace,
    intake_import: {
      filename,
      mime_type: mimeType || null,
      attachment_file: rel(attachmentPath),
      source_label: sourceLabel,
      source_kind: 'uploaded_file',
      conversion_status: conversionStatus,
      message,
      csv_text: csvText
    }
  };
}
