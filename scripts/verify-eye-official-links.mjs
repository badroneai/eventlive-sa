import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalOfficialUrl,
  extractEyeOfficialWebsite,
  extractEyeOrganizer,
  selectOfficialEventImage,
  verifyOfficialEventPage
} from './eye-official-link-utils.mjs';

const root = process.cwd();
const candidatesPath = path.join(root, process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE || 'data/source_candidates.json');
const reportPath = path.join(root, process.env.EVENTLIVE_EYE_OFFICIAL_LINK_REPORT || 'reports/eye-official-link-verification-report.json');
const reportMdPath = reportPath.replace(/\.json$/i, '.md');
const dryRun = process.env.EVENTLIVE_EYE_OFFICIAL_LINK_DRY_RUN === '1';
const generatedAt = new Date().toISOString();

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EventLiveSourceVerifier/1.0; +https://eventme.live/)',
      'Accept-Language': 'en,ar;q=0.9'
    },
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { html: await response.text(), finalUrl: response.url };
}

async function verifyCandidate(candidate) {
  try {
    const directoryUrl = candidate.discovery_source_url || candidate.source_url;
    const directory = await fetchHtml(directoryUrl);
    const extractedUrl = extractEyeOfficialWebsite(directory.html);
    if (!extractedUrl) return { candidate_id: candidate.id, title: candidate.title, status: 'skipped', reason: 'official-link-not-found' };
    const independentUrl = canonicalOfficialUrl(extractedUrl);
    const official = await fetchHtml(independentUrl);
    const finalUrl = canonicalOfficialUrl(official.finalUrl);
    const verification = verifyOfficialEventPage({ ...candidate, source_url: directoryUrl, evidence_url: directoryUrl }, finalUrl, official.html);
    if (!verification.confirmed) {
      return { candidate_id: candidate.id, title: candidate.title, status: 'skipped', official_url: finalUrl, ...verification };
    }
    return {
      candidate_id: candidate.id,
      title: candidate.title,
      status: 'confirmed',
      official_url: finalUrl,
      official_image_url: selectOfficialEventImage(official.html, finalUrl),
      organizer: extractEyeOrganizer(directory.html),
      ...verification
    };
  } catch (error) {
    return { candidate_id: candidate.id, title: candidate.title, status: 'failed', reason: error.message };
  }
}

const envelope = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
const candidates = Array.isArray(envelope.candidates) ? envelope.candidates : [];
const targets = candidates.filter((candidate) =>
  (/eye of riyadh/i.test(candidate.source_label || '') || /eyeofriyadh\.com/i.test(candidate.discovery_source_url || ''))
  && (candidate.publication_gate === 'source-evidence' || candidate.confidence === 'verified-secondary')
  && candidate.status !== 'ended'
);
const rows = [];
for (let index = 0; index < targets.length; index += 3) {
  rows.push(...await Promise.all(targets.slice(index, index + 3).map(verifyCandidate)));
}
const byId = new Map(rows.map((row) => [row.candidate_id, row]));
const updatedCandidates = candidates.map((candidate) => {
  const {
    secondary_evidence_url: legacyDiscoveryUrl,
    secondary_verification_status: legacyVerificationStatus,
    official_link_verified_at: legacyVerifiedAt,
    verified_at: legacyCandidateVerifiedAt,
    original_image_url: legacyOriginalImageUrl,
    image_discovered_at: legacyImageDiscoveredAt,
    ...candidateBase
  } = candidate;
  const normalizedCandidate = candidate.confidence === 'verified-secondary'
    ? {
      ...candidateBase,
      source_type: 'official-site',
      discovery_source_url: candidate.discovery_source_url || legacyDiscoveryUrl || '',
      secondary_verified_at: candidate.secondary_verified_at || legacyVerifiedAt || legacyCandidateVerifiedAt || generatedAt,
      secondary_verification_kind: candidate.secondary_verification_kind || 'official-source-evidence'
    }
    : candidate;
  const result = byId.get(candidate.id);
  if (!result || result.status !== 'confirmed') return normalizedCandidate;
  const discoverySourceUrl = candidate.discovery_source_url || candidate.source_url;
  const organizer = result.organizer || candidate.organizer || new URL(result.official_url).hostname;
  const badAction = /eyeofriyadh\.com\/ebooks\/profile/i.test(candidate.registration_url || candidate.ticket_url || '');
  return {
    ...normalizedCandidate,
    organizer,
    source_type: 'official-site',
    source_url: result.official_url,
    evidence_url: result.official_url,
    source_label: `${organizer} Official`,
    source_owner: organizer,
    discovery_source_url: discoverySourceUrl,
    verification_method: 'directory-official-link-page-confirmation',
    secondary_verified_at: generatedAt,
    secondary_verification_kind: 'official-source-evidence',
    confidence: 'verified-secondary',
    review_status: candidate.review_status === 'approved-for-catalog' ? candidate.review_status : 'ready-for-review',
    publication_gate: candidate.publication_gate === 'catalog-review' ? candidate.publication_gate : 'secondary-verified',
    image_url: result.official_image_url || candidate.image_url,
    image_source_url: result.official_image_url ? result.official_url : candidate.image_source_url,
    registration_url: badAction ? '' : candidate.registration_url,
    ticket_url: badAction ? '' : candidate.ticket_url,
    reviewer_notes: `${candidate.reviewer_notes || ''} تم تأكيد الاسم والشهر والسنة عبر موقع الفعالية الرسمي المستقل في ${generatedAt}.`.trim()
  };
});

const report = {
  schema: 'eventlive.eye-official-link-verification.v1',
  generated_at: generatedAt,
  dry_run: dryRun,
  totals: {
    targets: targets.length,
    confirmed: rows.filter((row) => row.status === 'confirmed').length,
    skipped: rows.filter((row) => row.status === 'skipped').length,
    failed: rows.filter((row) => row.status === 'failed').length
  },
  rows
};

if (!dryRun) fs.writeFileSync(candidatesPath, `${JSON.stringify({ ...envelope, candidates: updatedCandidates }, null, 2)}\n`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(reportMdPath, [
  '# EventLive Eye of Riyadh Official Link Verification',
  '',
  `- Generated at: ${generatedAt}`,
  `- Targets: ${report.totals.targets}`,
  `- Confirmed: ${report.totals.confirmed}`,
  `- Skipped: ${report.totals.skipped}`,
  `- Failed: ${report.totals.failed}`,
  '',
  '| Candidate | Status | Official URL | Reason |',
  '|---|---|---|---|',
  ...rows.map((row) => `| ${row.title} | ${row.status} | ${row.official_url || '-'} | ${row.reason || '-'} |`),
  ''
].join('\n'));

console.log(`# EventLive Official Link Verification\n- Targets: ${report.totals.targets}\n- Confirmed: ${report.totals.confirmed}\n- Skipped: ${report.totals.skipped}\n- Failed: ${report.totals.failed}\n- Report: ${path.relative(root, reportPath)}`);
