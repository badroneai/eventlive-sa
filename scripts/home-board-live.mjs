// EventLive — WO-1: pure HTML-templating for the homepage "live now" board
// carousel. This module has no I/O and does not touch the event catalog, so
// it is safe to import directly from a regression test (unlike
// scripts/generate-site.mjs, which runs the full site build as a top-level
// side effect the moment it is imported). That lets the test exercise the
// exact static-injection mechanism patchHomePage() uses — via
// scripts/generate-site.mjs, the only production caller — against synthetic
// fixtures, even on a build where the live catalog itself has fewer than 2
// live moments.
//
// Inputs here are already-formatted display strings (title/meta/url), not
// raw event objects: city-label lookup and date formatting depend on
// generate-site.mjs's own catalog utilities (cityLabelMap, formatDate), so
// callers compute those first and hand this module plain strings to render.

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Arabic count-noun agreement for "فعالية" (event), per standard MSA rules
 * (PM ruling on PR #32 review — `${count} فعاليات` for every count is wrong
 * Arabic grammar, most visibly at 1 and 2):
 *   1        -> singular-with-"واحدة" ("فعالية واحدة")
 *   2        -> dual ("فعاليتان")
 *   3–10     -> plural with digit ("N فعاليات")
 *   0, 11+   -> singular with digit ("N فعالية")
 * Each branch is its own literal/pattern in locales/en-SA-static.json +
 * scripts/generate-localized-site.mjs so the English homepage renders
 * "1 event" / "2 events" / "N events" correctly instead of carrying the
 * Arabic noun through untranslated.
 */
export function liveCountLabel(count = 0) {
  if (count === 1) return 'فعالية واحدة';
  if (count === 2) return 'فعاليتان';
  if (count >= 3 && count <= 10) return `${count} فعاليات`;
  return `${count} فعالية`;
}

/**
 * One static live-board card. `index === 0` renders visible; every other
 * index carries the `hidden` attribute — the runtime carousel script only
 * toggles this attribute, it never builds card markup from scratch.
 */
export function homeBoardLiveCard({ title, meta, url } = {}, index = 0) {
  return `<article class="board-live-card" data-index="${index}"${index === 0 ? '' : ' hidden'}>
              <h2>${escapeHtml(title)}</h2>
              <div class="b-meta">${escapeHtml(meta)}</div>
              <div class="board-actions">
                <a class="primary" href="${escapeHtml(url)}">افتح الجدول الحي</a>
              </div>
            </article>`;
}

/**
 * Prev/next arrows + dot indicators, plus a compact "N/total" counter
 * between the arrows. Omitted entirely when there is nothing to navigate
 * between (0 or 1 live card).
 *
 * The dots row is what made board chrome catalog-state-sensitive: each dot
 * is a real 44x44 touch target, so every extra live event pushed the row to
 * wrap onto another line, growing the board and pushing the first section
 * below the mobile fold (measured: 16 live events -> 3 dot rows -> the
 * "home first-section <=700px @360px" mobile-browsing assertion goes red).
 * The counter's width never changes with live count (it is always "N/M"),
 * so brandCss (scripts/generate-site.mjs) hides .board-live-dots and shows
 * .board-live-count at narrow widths — see the mobile-first-section-budget
 * comment there. The counter is aria-hidden: the dot group still carries
 * the accessible role="group" + per-dot aria-label, this is a visual-only
 * substitute for it, not a second live region.
 */
export function homeBoardLiveNav(count) {
  if (count <= 1) return '';
  const dots = Array.from({ length: count }, (_, index) => `<button type="button" class="board-live-dot${index === 0 ? ' is-active' : ''}" data-index="${index}" aria-current="${index === 0 ? 'true' : 'false'}" aria-label="عرض الفعالية رقم ${index + 1}"></button>`).join('');
  return `<div class="board-live-nav">
            <div class="board-live-arrows">
              <button type="button" class="board-live-arrow board-live-prev" aria-label="الفعالية السابقة">&rsaquo;</button>
              <span class="board-live-count" aria-hidden="true"><b class="board-live-count-current">1</b><span class="board-live-count-sep">/</span><span class="board-live-count-total">${count}</span></span>
              <button type="button" class="board-live-arrow board-live-next" aria-label="الفعالية التالية">&lsaquo;</button>
            </div>
            <div class="board-live-dots" id="boardLiveDots" role="group" aria-label="التنقل بين الفعاليات المباشرة">${dots}</div>
          </div>`;
}

/**
 * The full `<section id="boardLive">` block patchHomePage() splices into
 * the committed dist/index.html shell. `hidden` on the outer section is the
 * single build-time switch between the 0-live fallback board (#boardSingle,
 * untouched by this module) and the carousel.
 */
export function homeBoardLiveSection(cards = []) {
  const count = cards.length;
  const cardsHtml = cards.map((card, index) => homeBoardLiveCard(card, index)).join('\n              ');
  // `data-live-count` is the build's own record of how many live events it
  // decided on. Without it the trust gate had to RE-derive that number from the
  // embedded ticker at test time — a different array (ticker is capped at 120
  // rows) read against a different clock (minutes after the build) — so an event
  // crossing its start or end boundary between build and test turned a correct
  // build red. That race froze deploy.yml from 2026-08-15 to 2026-09-02. The
  // count is emitted here so the gate can assert build-internal agreement
  // instead of guessing (AGENTS.md law 2.5: build output is time-dependent).
  return `<section class="board-live" id="boardLive" data-live-count="${count}"${count > 0 ? '' : ' hidden'}>
          <div class="board-label" id="boardLiveBadge"><span class="live-dot"></span>مباشر الآن · ${liveCountLabel(count)}</div>
          <div class="board-live-track" id="boardLiveTrack" aria-live="polite" aria-atomic="true">
              ${cardsHtml}
          </div>
          ${homeBoardLiveNav(count)}
          <div class="board-live-footer">
            <a class="plain" href="./today.html">افتح صفحة الآن ←</a>
          </div>
        </section>`;
}
