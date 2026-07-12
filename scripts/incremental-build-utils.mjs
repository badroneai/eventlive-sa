import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function sha256(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function fileFingerprint(root, files = []) {
  const rows = [];
  for (const relativePath of [...new Set(files)].sort()) {
    const fullPath = path.join(root, relativePath);
    rows.push([
      relativePath,
      fs.existsSync(fullPath) ? sha256(fs.readFileSync(fullPath)) : 'missing'
    ]);
  }
  return sha256(JSON.stringify(rows));
}

function fileHash(filePath) {
  return fs.existsSync(filePath) ? sha256(fs.readFileSync(filePath)) : 'missing';
}

function riyadhDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(value);
}

function fullBuildAgeHours(state = {}, now = new Date()) {
  const timestamp = new Date(state.last_full_build_at || 0).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return Infinity;
  return Math.max(0, (now.getTime() - timestamp) / 3_600_000);
}

function incrementalBuildDecision({
  forceFull = false,
  state = null,
  templateFingerprint = '',
  seoStateHash = '',
  requiredOutputsPresent = false,
  eventArtifactCount = 0,
  englishEventArtifactCount = 0,
  changedPathsSinceState = [],
  now = new Date(),
  fullIntervalHours = 24
} = {}) {
  const reasons = [];
  if (forceFull) reasons.push('forced-full-build');
  if (!state || state.schema !== 'eventlive.incremental-build-state.v1') reasons.push('missing-or-invalid-build-state');
  if (state && state.template_fingerprint !== templateFingerprint) reasons.push('build-template-changed');
  if (state && state.seo_state_hash !== seoStateHash) reasons.push('cached-output-does-not-match-seo-state');
  if (!requiredOutputsPresent) reasons.push('required-output-contract-missing');
  if (state && eventArtifactCount < Number(state.event_count || 0)) reasons.push('arabic-event-cache-incomplete');
  if (state && englishEventArtifactCount < Number(state.event_count || 0)) reasons.push('english-event-cache-incomplete');
  if (state && fullBuildAgeHours(state, now) >= fullIntervalHours) reasons.push('scheduled-full-safety-build');
  if (changedPathsSinceState.some((value) => value === '__history_unavailable__' || /^(?:dist\/.*\.html|locales\/|package(?:-lock)?\.json$)/.test(value))) {
    reasons.push('public-template-history-changed');
  }
  return {
    mode: reasons.length ? 'full' : 'incremental',
    reasons: reasons.length ? [...new Set(reasons)] : ['validated-incremental-baseline'],
    full_build_age_hours: Number.isFinite(fullBuildAgeHours(state || {}, now))
      ? Math.round(fullBuildAgeHours(state || {}, now) * 100) / 100
      : null
  };
}

export {
  fileFingerprint,
  fileHash,
  fullBuildAgeHours,
  incrementalBuildDecision,
  riyadhDate,
  sha256
};
