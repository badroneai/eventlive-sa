// Misk programme identity, shared by the enricher and its gate (GATES-GOVERNANCE §3).
//
// 2026-09-19: hub.misk.org.sa serves the SAME og:title ("Discover Your Path Program") on two
// distinct programme pages — /skills/discover-your-path/ and /skills/nahj/. Adopting it blindly
// collapsed the second programme's identity onto the first; two rows then shared a normalized
// title + venue inside the ±3-day window, test:public-dedupe (rightly) blocked the publish, and
// the sync could not ship at all. The specific name is in the page body:
// "Discover Your Path (in collaboration with Nahj Association)".
//
// Rule: recover the qualifier ONLY from the page's own text, only when it extends the meta title,
// and never invent one. A page without a qualifier keeps its meta title unchanged.
export function specificProgramTitle(text = '', metaTitle = '') {
  if (!metaTitle) return '';
  const base = String(metaTitle).replace(/\s+(?:Program|Programme)\s*$/i, '').trim();
  if (base.length < 6) return '';
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const qualified = String(text).match(new RegExp(`${escaped}\\s*\\([^)]{4,80}\\)`, 'i'));
  if (!qualified) return '';
  const candidate = qualified[0].replace(/\s+/g, ' ').trim();
  return candidate.length > String(metaTitle).length ? candidate : '';
}
