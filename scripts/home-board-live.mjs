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
 * Prev/next arrows + dot indicators. Omitted entirely when there is nothing
 * to navigate between (0 or 1 live card).
 */
export function homeBoardLiveNav(count) {
  if (count <= 1) return '';
  const dots = Array.from({ length: count }, (_, index) => `<button type="button" class="board-live-dot${index === 0 ? ' is-active' : ''}" data-index="${index}" aria-current="${index === 0 ? 'true' : 'false'}" aria-label="عرض الفعالية رقم ${index + 1}"></button>`).join('');
  return `<div class="board-live-nav">
            <div class="board-live-arrows">
              <button type="button" class="board-live-arrow board-live-prev" aria-label="الفعالية السابقة">&rsaquo;</button>
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
  return `<section class="board-live" id="boardLive"${count > 0 ? '' : ' hidden'}>
          <div class="board-label" id="boardLiveBadge"><span class="live-dot"></span>مباشر الآن · ${count} فعاليات</div>
          <div class="board-live-track" id="boardLiveTrack" aria-live="polite" aria-atomic="true">
              ${cardsHtml}
          </div>
          ${homeBoardLiveNav(count)}
          <div class="board-live-footer">
            <a class="plain" href="./today.html">افتح صفحة الآن ←</a>
          </div>
        </section>`;
}
