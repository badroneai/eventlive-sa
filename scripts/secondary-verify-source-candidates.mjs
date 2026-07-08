import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const candidatesPath = process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE)
  : path.join(root, 'data', 'source_candidates.json');
const opsReportPath = process.env.EVENTLIVE_SOURCE_OPS_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_SOURCE_OPS_REPORT_JSON)
  : path.join(root, 'reports', 'source-ops-report.json');
const reportJsonPath = process.env.EVENTLIVE_SECONDARY_VERIFY_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_SECONDARY_VERIFY_REPORT_JSON)
  : path.join(root, 'reports', 'source-secondary-verification-report.json');
const reportMdPath = process.env.EVENTLIVE_SECONDARY_VERIFY_REPORT_MD
  ? path.join(root, process.env.EVENTLIVE_SECONDARY_VERIFY_REPORT_MD)
  : path.join(root, 'reports', 'source-secondary-verification-report.md');

const generatedAt = new Date().toISOString();
const officialHostPatterns = [
  /\.gov\.sa$/i,
  /(^|\.)moc\.gov\.sa$/i,
  /(^|\.)hub\.misk\.org\.sa$/i,
  /(^|\.)tuwaiq\.edu\.sa$/i,
  /(^|\.)visitsaudi\.com$/i,
  /(^|\.)riyadh\.sa$/i,
  /(^|\.)swa\.gov\.sa$/i,
  /(^|\.)sfda\.gov\.sa$/i
];

function normalize(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ');
}

function hostOf(value = '') {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function durationDays(row = {}) {
  const start = new Date(row.starts_at || row.event_start).getTime();
  const end = new Date(row.ends_at || row.event_end || row.starts_at || row.event_start).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86400000));
}

function isValidPublicDateTime(value = '') {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/.test(String(value || ''))
    && !Number.isNaN(new Date(value).getTime());
}

function hasRequiredFields(candidate = {}) {
  return Boolean(
    candidate.title
    && candidate.city
    && isValidPublicDateTime(candidate.starts_at)
    && isValidPublicDateTime(candidate.ends_at)
    && candidate.source_url
    && candidate.source_label
    && candidate.source_owner
    && (candidate.evidence_url || candidate.raw_snapshot_path)
  );
}

function isPast(candidate = {}) {
  const end = new Date(candidate.ends_at || candidate.starts_at).getTime();
  return !Number.isNaN(end) && end < Date.now();
}

function officialHost(candidate = {}) {
  const host = hostOf(candidate.evidence_url || candidate.source_url);
  return officialHostPatterns.some((pattern) => pattern.test(host));
}

function isLongOfficialProgram(candidate = {}) {
  const text = normalize(`${candidate.title || ''} ${candidate.category || ''} ${candidate.summary || ''}`);
  return durationDays(candidate) >= 120
    && /(initiative|program|hub|accelerator|guidelines|cafe|مبادرة|برنامج|مركز|مسرعة|دليل|أكاديمية)/i.test(text);
}

function readOpsMatches() {
  if (!exists(opsReportPath)) return new Map();
  const ops = readJson(opsReportPath);
  const matches = new Map();
  for (const item of ops.queue?.discovery_focus || []) {
    if (item.id && item.official_match) matches.set(item.id, item.official_match);
  }
  return matches;
}

function shouldPromoteOfficialEvidence(candidate) {
  if (candidate.confidence !== 'official') return '';
  if (candidate.publication_gate !== 'source-evidence') return '';
  if (!hasRequiredFields(candidate)) return '';
  if (isPast(candidate)) return '';
  if (!officialHost(candidate) && !candidate.raw_snapshot_path) return '';
  return isLongOfficialProgram(candidate)
    ? 'official-program-evidence'
    : 'official-source-evidence';
}

function shouldPromoteAggregatorMatch(candidate, officialMatch) {
  if (!officialMatch) return '';
  if (candidate.confidence !== 'public-listing') return '';
  if (candidate.publication_gate !== 'duplicate-review') return '';
  if (!hasRequiredFields(candidate)) return '';
  if (isPast(candidate)) return '';
  if (Number(officialMatch.score || 0) < 105) return '';
  if (officialMatch.evidence_kind !== 'catalog') return '';
  const candidateTitle = normalize(candidate.title);
  const matchTitle = normalize(officialMatch.title);
  if (!candidateTitle || !matchTitle) return '';
  if (!candidateTitle.includes(matchTitle) && !matchTitle.includes(candidateTitle)) return '';
  return 'official-catalog-match';
}

function verificationNote(kind, candidate, officialMatch) {
  if (kind === 'official-catalog-match') {
    return `تحقق ثانوي: مرشح من قائمة عامة طابق سجل كتالوج رسمي (${officialMatch.title} / ${officialMatch.source_label}) بدرجة ${officialMatch.score}.`;
  }
  if (kind === 'official-program-evidence') {
    return 'تحقق ثانوي: مصدر رسمي طويل المدة؛ يرقى كبرنامج ممتد لا كجلسة يومية.';
  }
  return `تحقق ثانوي: مصدر رسمي مباشر مع دليل عام صالح من ${candidate.source_label}.`;
}

function writeReport(report) {
  ensureDir(path.dirname(reportJsonPath));
  writeJson(reportJsonPath, report);
  const lines = [
    '# EventLive Source Secondary Verification Report',
    '',
    `- generated_at: ${report.generated_at}`,
    `- candidates_seen: ${report.totals.candidates_seen}`,
    `- candidates_considered: ${report.totals.candidates_considered}`,
    `- promoted: ${report.totals.promoted}`,
    `- official_evidence_promoted: ${report.totals.official_evidence_promoted}`,
    `- official_programs_promoted: ${report.totals.official_programs_promoted}`,
    `- official_catalog_matches_promoted: ${report.totals.official_catalog_matches_promoted}`,
    `- still_blocked: ${report.totals.still_blocked}`,
    '',
    '## Promoted',
    '',
    '| Candidate | Kind | Title | Evidence |',
    '|---|---|---|---|',
    ...report.promoted.map((item) => `| ${item.candidate_id} | ${item.kind} | ${item.title} | ${item.evidence} |`),
    '',
    '## Still Blocked Summary',
    '',
    ...Object.entries(report.still_blocked_by_reason).map(([reason, count]) => `- ${reason}: ${count}`),
    ''
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  if (!exists(candidatesPath)) throw new Error(`Source candidates file not found: ${rel(candidatesPath)}`);
  const envelope = readJson(candidatesPath);
  const candidates = Array.isArray(envelope.candidates) ? envelope.candidates : [];
  const officialMatches = readOpsMatches();
  const promoted = [];
  const blockedReasons = {};
  let considered = 0;

  const updated = candidates.map((candidate) => {
    const baseCandidate = Array.isArray(candidate.tags) && candidate.tags.length > 10
      ? { ...candidate, tags: candidate.tags.slice(0, 10) }
      : candidate;
    if (candidate.publication_gate === 'catalog-review' || candidate.review_status === 'approved-for-catalog') {
      return baseCandidate;
    }
    considered += 1;
    const officialMatch = officialMatches.get(baseCandidate.id);
    const kind = shouldPromoteOfficialEvidence(baseCandidate) || shouldPromoteAggregatorMatch(baseCandidate, officialMatch);
    if (!kind) {
      const reason = baseCandidate.publication_gate === 'source-evidence'
        ? 'needs-secondary-official-proof'
        : baseCandidate.confidence === 'public-listing'
          ? 'public-listing-needs-official-match'
          : 'not-secondary-verifiable';
      blockedReasons[reason] = (blockedReasons[reason] || 0) + 1;
      return baseCandidate;
    }

    const note = verificationNote(kind, baseCandidate, officialMatch);
    promoted.push({
      candidate_id: baseCandidate.id,
      title: baseCandidate.title,
      kind,
      evidence: kind === 'official-catalog-match'
        ? `${officialMatch.id} (${officialMatch.source_label})`
        : (baseCandidate.evidence_url || baseCandidate.source_url),
      matched_catalog_event_id: officialMatch?.id || ''
    });
    return {
      ...baseCandidate,
      publication_gate: 'secondary-verified',
      review_status: 'ready-for-review',
      confidence: baseCandidate.confidence === 'public-listing' ? 'partner' : baseCandidate.confidence,
      secondary_verified_at: generatedAt,
      secondary_verification_kind: kind,
      matched_catalog_event_id: officialMatch?.id || baseCandidate.matched_catalog_event_id || '',
      reviewer_notes: `${baseCandidate.reviewer_notes || ''} ${note}`.trim(),
      tags: Array.from(new Set([...(Array.isArray(baseCandidate.tags) ? baseCandidate.tags : []), kind === 'official-program-evidence' ? 'برنامج ممتد' : 'تحقق ثانوي'])).slice(0, 10)
    };
  });

  const report = {
    schema: 'eventlive.source-secondary-verification.v1',
    generated_at: generatedAt,
    source_candidates: rel(candidatesPath),
    source_ops_report: exists(opsReportPath) ? rel(opsReportPath) : '',
    totals: {
      candidates_seen: candidates.length,
      candidates_considered: considered,
      promoted: promoted.length,
      official_evidence_promoted: promoted.filter((item) => item.kind === 'official-source-evidence').length,
      official_programs_promoted: promoted.filter((item) => item.kind === 'official-program-evidence').length,
      official_catalog_matches_promoted: promoted.filter((item) => item.kind === 'official-catalog-match').length,
      still_blocked: considered - promoted.length
    },
    promoted,
    still_blocked_by_reason: blockedReasons
  };

  writeJson(candidatesPath, { ...envelope, candidates: updated });
  writeReport(report);

  console.log('# EventLive Source Secondary Verification');
  console.log(`- Candidates seen: ${report.totals.candidates_seen}`);
  console.log(`- Promoted: ${report.totals.promoted}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main();
