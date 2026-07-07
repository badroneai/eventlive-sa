import assert from 'node:assert/strict';

process.env.EVENTLIVE_IMAGE_DISCOVERY_SKIP_RUN = '1';
const { extractImagesFromHtml, isLikelyImageUrl } = await import('./discover-event-images-from-pages.mjs');

const html = `<!doctype html>
<html><head>
  <meta property="og:image" content="/media/event-cover.webp">
  <meta name="twitter:image" content="https://cdn.example.com/cards/event-social.jpg?w=1200">
  <script type="application/ld+json">{
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "Image Discovery Fixture",
    "image": "https://assets.example.com/events/fixture-large.png"
  }</script>
</head><body>
  <img src="/assets/logo.svg" alt="logo">
  <img src="/uploads/gallery/event-hall.jpg" alt="hall">
  <img data-src="/uploads/2026/workshop-featured-900x500.webp" alt="Workshop featured image">
  <picture>
    <source srcset="/uploads/small-event.jpg 480w, /uploads/hero-event-large.jpg 1280w" type="image/jpeg">
  </picture>
</body></html>`;

assert.equal(isLikelyImageUrl('https://example.com/events/detail-page'), false, 'source HTML pages must not be treated as images');
assert.equal(isLikelyImageUrl('https://cdn.example.com/uploads/event.webp'), true, 'direct image assets must be accepted');
assert.equal(isLikelyImageUrl('https://cdn.example.com/uploads/power-bi-to-quickbooks-time-integration.png'), true, 'valid image names containing "integration" must not be rejected as icons');
assert.equal(isLikelyImageUrl('https://investsaudi.sa/backend/wp-content/uploads/2026/02/innoprom-logos-01-scaled.png'), true, 'event-branded uploaded images must not be rejected just because the filename contains logos');
assert.equal(isLikelyImageUrl('https://example.com/assets/logo.svg'), false, 'site logos must not be treated as event images');
assert.equal(isLikelyImageUrl('https://example.com/assets/img/logo-white.png'), false, 'generic site logo assets must not be treated as event images');
assert.equal(isLikelyImageUrl('https://example.com/assets/unsupported/unsupported.png'), false, 'placeholder images must not be treated as event images');
assert.equal(isLikelyImageUrl('https://dhahranexpo.com.sa/assets/img/arrow-left.png?v=1'), false, 'decorative arrows must not be treated as event images');
assert.equal(isLikelyImageUrl('https://hub.misk.org.sa/media/vc3ebibj/calendar-2.png'), false, 'generic calendar icons must not be treated as event images');
assert.equal(isLikelyImageUrl('https://www.swa.gov.sa/en/events/assets/images/default_meta_image.png'), false, 'source default meta images must not be treated as event images');

const images = extractImagesFromHtml(html, 'https://example.com/events/fixture');
assert.ok(images.length >= 3, 'image discovery should collect meta and JSON-LD candidates');
assert.equal(images[0].url, 'https://cdn.example.com/cards/event-social.jpg?w=1200', 'large social image should rank first');
assert.ok(images.some((image) => image.url === 'https://example.com/media/event-cover.webp'), 'relative og:image must be resolved');
assert.ok(images.some((image) => image.source === 'json-ld'), 'JSON-LD image candidates must be extracted');
assert.ok(images.some((image) => image.url === 'https://example.com/uploads/2026/workshop-featured-900x500.webp' && image.source === 'img'), 'data-src event images must be extracted');
assert.ok(images.some((image) => image.url === 'https://example.com/uploads/hero-event-large.jpg' && image.source === 'srcset'), 'largest srcset event image must be extracted');
assert.equal(images.some((image) => /logo/i.test(image.url)), false, 'logo image candidates must be excluded');

console.log('event-image-discovery-regression-test: ok');
