import assert from 'node:assert/strict';
import { looksLikeBotChallenge, PASSIVE_CDN_MARKER } from './bot-challenge-detection.mjs';

// The trap this gate exists for, stated as a test: a normal page served through
// Cloudflare carries the passive challenge-platform script. Classifying that as
// a block page cost qassim-chamber-events 17 consecutive syncs — the browser
// recovery fetched the real page with three extractable events, and the guard
// threw it away.

const realPageBehindCloudflare = `<!doctype html><html><head><title>الدورات التدريبية</title>
<script>window.__cf={r:'a264efc03cb68e3d'};var a=document.createElement('script');
a.src='${PASSIVE_CDN_MARKER}';document.getElementsByTagName('head')[0].appendChild(a);</script>
</head><body><div class="card h-100"><h4 class="card-title"><a href="/events/205">أساسيات الإدارة الرشيقة</a></h4>
<h6 class="card-subtitle">10 أغسطس 2026</h6></div></body></html>`;

assert.equal(
  looksLikeBotChallenge(realPageBehindCloudflare),
  false,
  'a real page must not be classified as a challenge just because Cloudflare injected its passive detection script'
);

const interstitials = {
  'cloudflare "just a moment" interstitial': '<html><head><title>Just a moment...</title></head><body><div id="challenge-form"></div></body></html>',
  'cloudflare attention-required block': '<html><head><title>Attention Required! | Cloudflare</title></head><body><div class="cf-error-overview"><h1>Sorry, you have been blocked</h1></div></body></html>',
  'legacy browser-verification page': '<html><body><div class="cf-browser-verification">checking your browser</div></body></html>',
  'challenge options bootstrap': '<html><body><script>window._cf_chl_opt={cvId:"3"};</script></body></html>',
  'F5/imperva style refusal': '<html><body><h1>The requested URL was rejected. Request Rejected</h1><p>Your support ID is: 123456</p></body></html>'
};

for (const [name, html] of Object.entries(interstitials)) {
  assert.equal(looksLikeBotChallenge(html), true, `${name} must still be detected as a bot challenge`);
}

// Content beats classification: even a page that looks like an interstitial is
// demonstrably not one if our extractor found real events in it. This is the
// safety valve that keeps a future vendor-markup change from silently starving
// a source again.
assert.equal(
  looksLikeBotChallenge(interstitials['cloudflare "just a moment" interstitial'], { extractedItems: 3 }),
  false,
  'a payload that yielded extracted items must never be classified as a challenge'
);

assert.equal(looksLikeBotChallenge(''), false, 'an empty payload is not a challenge (it is a different failure)');

console.log('bot-challenge-detection-regression-test: ok');
