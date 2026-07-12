import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const candidatesPath = process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE)
  : path.join(root, 'data', 'source_candidates.json');
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = path.join(root, 'reports', 'source-promotion-report.json');
const reportMdPath = path.join(root, 'reports', 'source-promotion-report.md');
const promotedAt = new Date().toISOString();
const selectedIds = (process.env.EVENTLIVE_PROMOTE_IDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const promoteAllApproved = ['1', 'true', 'yes'].includes(String(process.env.EVENTLIVE_PROMOTE_ALL || '').toLowerCase());
const dryRun = ['1', 'true', 'yes'].includes(String(process.env.EVENTLIVE_PROMOTE_DRY_RUN || '').toLowerCase());

function toSlug(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function uniqueId(baseId, existingIds) {
  let candidate = baseId;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }
  existingIds.add(candidate);
  return candidate;
}

function candidateMatchKey(row) {
  return [row.title, row.city, String(row.starts_at || row.event_start || '').slice(0, 10)]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');
}

function sourceConfidenceFor(candidate) {
  if (candidate.confidence === 'official') return 'approved-source';
  if (candidate.confidence === 'partner') return 'organizer-confirmed';
  if (candidate.evidence_url || candidate.raw_snapshot_path) return 'pending-review';
  return 'needs-source-evidence';
}

function richFieldsFromCandidate(candidate = {}) {
  const fields = {};
  [
    'image_url',
    'image_alt',
    'image_source_url',
    'registration_url',
    'ticket_url',
    'organizer_url',
    'registration_status',
    'ticket_status',
    'offer_valid_from',
    'attendance_mode',
    'price_label',
    'language',
    'rich_summary',
    'registration_deadline',
    'richness_score'
  ].forEach((key) => {
    if (candidate[key] !== undefined && candidate[key] !== null && candidate[key] !== '') fields[key] = candidate[key];
  });
  if (Array.isArray(candidate.highlights) && candidate.highlights.length) fields.highlights = candidate.highlights.slice(0, 8);
  if (Array.isArray(candidate.performers) && candidate.performers.length) fields.performers = candidate.performers.slice(0, 20);
  return fields;
}

function catalogEventFromCandidate(candidate, existingIds) {
  const slug = toSlug(candidate.title || candidate.id);
  const baseId = `event-${slug || candidate.id.replace(/^candidate-/, '')}`;
  return {
    id: uniqueId(baseId, existingIds),
    slug,
    title: candidate.title,
    organizer: candidate.organizer || candidate.source_owner || candidate.source_label,
    city: candidate.city,
    venue: candidate.venue || candidate.city,
    venue_address: candidate.venue || candidate.city,
    category: candidate.category || 'فعاليات',
    summary: candidate.summary || `فعالية مرشحة من ${candidate.source_label}.`,
    ...richFieldsFromCandidate(candidate),
    ...(candidate.image_url || candidate.image || candidate.original_image_url ? {
      image_url: candidate.image_url || candidate.image || candidate.original_image_url,
      original_image_url: candidate.original_image_url || candidate.image_url || candidate.image,
      image_alt: candidate.image_alt || candidate.title,
      image_source_url: candidate.image_source_url || candidate.source_url || candidate.evidence_url || ''
    } : {}),
    starts_at: candidate.starts_at,
    ends_at: candidate.ends_at,
    updated_at: promotedAt,
    sessions_count: Number(candidate.extracted_sessions_count || 0),
    tracks_count: 0,
    rooms_count: 0,
    live_updates_count: 0,
    approval_status: 'reviewed',
    published_by: 'EventLive Operations',
    source_label: candidate.source_label,
    source_confidence: sourceConfidenceFor(candidate),
    live_schedule_ready: Number(candidate.extracted_sessions_count || 0) > 0,
    url: candidate.source_url || candidate.evidence_url || '',
    source_file: candidate.raw_snapshot_path || '',
    tags: Array.isArray(candidate.tags) ? candidate.tags.slice(0, 10) : []
  };
}

function isEligible(candidate) {
  return candidate.review_status === 'approved-for-catalog'
    && candidate.publication_gate === 'catalog-review';
}

function selectedForPromotion(candidate) {
  if (!isEligible(candidate)) return false;
  if (selectedIds.length) return selectedIds.includes(candidate.id);
  return promoteAllApproved;
}

function writeReport(report) {
  writeJson(reportJsonPath, report);
  const lines = [
    '# EventLive Source Promotion Report',
    '',
    `- promoted_at: ${report.promoted_at}`,
    `- dry_run: ${report.dry_run}`,
    `- promote_all_approved: ${report.promote_all_approved}`,
    `- requested_ids: ${report.requested_ids.length ? report.requested_ids.join(', ') : '-'}`,
    `- candidates_seen: ${report.candidates_seen}`,
    `- eligible_seen: ${report.eligible_seen}`,
    `- promoted: ${report.promoted.length}`,
    `- skipped: ${report.skipped.length}`,
    '',
    '| Candidate | Status | Catalog event | Note |',
    '|---|---|---|---|',
    ...report.promoted.map((item) => `| ${item.candidate_id} | promoted | ${item.event_id} | ${item.title} |`),
    ...report.skipped.map((item) => `| ${item.candidate_id} | skipped | - | ${item.reason} |`)
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  if (!exists(candidatesPath)) {
    throw new Error(`Source candidates file not found: ${rel(candidatesPath)}`);
  }
  if (!exists(catalogPath)) {
    throw new Error(`Events catalog file not found: ${rel(catalogPath)}`);
  }
  if (!selectedIds.length && !promoteAllApproved) {
    throw new Error('No promotion target selected. Set EVENTLIVE_PROMOTE_IDS or EVENTLIVE_PROMOTE_ALL=1.');
  }

  const candidatesEnvelope = readJson(candidatesPath);
  const catalogEnvelope = readJson(catalogPath);
  const candidates = Array.isArray(candidatesEnvelope.candidates) ? candidatesEnvelope.candidates : [];
  const catalogEvents = Array.isArray(catalogEnvelope.events) ? catalogEnvelope.events : [];
  const existingIds = new Set(catalogEvents.map((event) => event.id));
  const catalogByMatch = new Map(catalogEvents.map((event) => [candidateMatchKey(event), event]));
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const promoted = [];
  const skipped = selectedIds
    .filter((id) => !candidateIds.has(id))
    .map((id) => ({
      candidate_id: id,
      reason: 'Requested candidate id was not found.'
    }));

  const updatedCandidates = candidates.map((candidate) => {
    if (!selectedForPromotion(candidate)) {
      if (selectedIds.includes(candidate.id) && !isEligible(candidate)) {
        skipped.push({
          candidate_id: candidate.id,
          reason: 'Candidate must be approved-for-catalog and catalog-review before promotion.'
        });
      }
      return candidate;
    }

    const existingMatch = catalogByMatch.get(candidateMatchKey(candidate));
    if (existingMatch) {
      skipped.push({
        candidate_id: candidate.id,
        reason: `Possible duplicate already exists in catalog: ${existingMatch.id}`
      });
      return {
        ...candidate,
        matched_catalog_event_id: existingMatch.id
      };
    }

    const event = catalogEventFromCandidate(candidate, existingIds);
    catalogEvents.push(event);
    catalogByMatch.set(candidateMatchKey(event), event);
    promoted.push({
      candidate_id: candidate.id,
      event_id: event.id,
      title: event.title
    });
    return {
      ...candidate,
      matched_catalog_event_id: event.id,
      reviewer_notes: `${candidate.reviewer_notes || ''} تمت الترقية إلى كتالوج EventLive في ${promotedAt}.`.trim()
    };
  });

  const report = {
    promoted_at: promotedAt,
    dry_run: dryRun,
    promote_all_approved: promoteAllApproved,
    requested_ids: selectedIds,
    source_candidates: rel(candidatesPath),
    events_catalog: rel(catalogPath),
    candidates_seen: candidates.length,
    eligible_seen: candidates.filter(isEligible).length,
    promoted,
    skipped
  };

  ensureDir(path.dirname(reportJsonPath));
  if (!dryRun) {
    writeJson(catalogPath, {
      ...catalogEnvelope,
      events: catalogEvents.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    });
    writeJson(candidatesPath, {
      ...candidatesEnvelope,
      candidates: updatedCandidates
    });
  }
  writeReport(report);

  console.log('# EventLive Source Promotion');
  console.log(`- Eligible candidates: ${report.eligible_seen}`);
  console.log(`- Promoted: ${promoted.length}`);
  console.log(`- Skipped: ${skipped.length}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main();
