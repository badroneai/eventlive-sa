// Is this HTML a bot-challenge interstitial, or a real page that merely passed
// through a bot-protection CDN?
//
// The distinction cost us a source. qassim-chamber-events failed 17 consecutive
// syncs; the runner gets HTTP 403 from every HTTP client but Chromium loads the
// page fine and our own extractor finds events in it — so the browser-recovery
// path we already had should have rescued it, and did not. The reason was here:
// the old test was
//
//   /just a moment|cf-browser-verification|cdn-cgi\/challenge|request rejected|access denied/i
//
// and **every** page served through Cloudflare — including a perfectly normal
// 200 — embeds `/cdn-cgi/challenge-platform/scripts/jsd/main.js`, a passive
// detection script. So a fully rendered page with three extractable events was
// discarded as a challenge. The guard, not the site, was blocking us.
//
// Two rules follow, and they generalize past this one source:
//   1. Match the interstitial itself — its title, its form, its explicit refusal
//      copy — never the presence of a vendor asset that also appears on ordinary
//      pages.
//   2. Content beats classification. If the page yielded real extracted items,
//      it demonstrably was not a challenge, whatever the markup contains. Callers
//      pass extractedItems for that reason.

// Deliberately anchored to interstitial-only signals. Kept narrow: each pattern
// below appears on a block page and not on a normal page served by the same CDN.
const CHALLENGE_MARKERS = [
  /<title>[^<]*just a moment/i,
  /<title>[^<]*attention required/i,
  /<title>[^<]*access denied/i,
  /cf-browser-verification/i,
  /id="challenge-form"/i,
  /class="[^"]*cf-error-overview/i,
  /window\._cf_chl_opt/i,
  /request rejected[\s\S]{0,200}support id/i,
  /captcha-bypass|please enable (?:cookies|javascript) to (?:continue|view)/i
];

export function looksLikeBotChallenge(html = '', { extractedItems = 0 } = {}) {
  // Rule 2 first: real content is the strongest possible evidence of not-blocked.
  if (Number(extractedItems) > 0) return false;
  const text = String(html || '');
  if (!text.trim()) return false;
  return CHALLENGE_MARKERS.some((marker) => marker.test(text));
}

// The passive Cloudflare bootstrap, exported so tests can assert explicitly that
// its presence alone never classifies a page as challenged.
export const PASSIVE_CDN_MARKER = '/cdn-cgi/challenge-platform/scripts/jsd/main.js';
