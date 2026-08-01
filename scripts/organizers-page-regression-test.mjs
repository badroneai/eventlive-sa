import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const organizersPath = path.join(root, 'dist', 'organizers.html');
const organizerIntakePath = path.join(root, 'dist', 'organizer-intake.html');
const organizerIntakeJsonPath = path.join(root, 'dist', 'organizer-intake.json');
const sitemapPath = path.join(root, 'dist', 'sitemap.xml');

assert.equal(fs.existsSync(organizersPath), true, 'dist/organizers.html must exist; run npm run build first');
assert.equal(fs.existsSync(organizerIntakePath), true, 'dist/organizer-intake.html must exist; run npm run build first');
assert.equal(fs.existsSync(organizerIntakeJsonPath), true, 'dist/organizer-intake.json must exist; run npm run build first');
assert.equal(fs.existsSync(sitemapPath), true, 'dist/sitemap.xml must exist; run npm run build first');

const html = fs.readFileSync(organizersPath, 'utf8');
const intakeHtml = fs.readFileSync(organizerIntakePath, 'utf8');
const intakeContract = JSON.parse(fs.readFileSync(organizerIntakeJsonPath, 'utf8'));
const sitemap = fs.readFileSync(sitemapPath, 'utf8');

assert.match(sitemap, /https:\/\/eventme\.live\/organizers\.html/, 'organizers.html must be listed in sitemap');
assert.match(sitemap, /https:\/\/eventme\.live\/organizer-intake\.html/, 'organizer-intake.html must be listed in sitemap');
assert.match(html, /mailto:hello%40eventme\.live|mailto:hello@eventme\.live/, 'organizers page must expose the organizer email CTA');
assert.match(html, /organizer-intake\.html/, 'organizers page must link to the structured organizer intake page');
assert.match(html, /اجعل فعاليتك مفهومة لحظة الحضور/, 'organizers page must lead with the live-attendance value proposition');
assert.match(html, /متى تكون EventLive مناسبة؟/, 'organizers page must explain when the product is appropriate');
assert.match(html, /معايير النشر والثقة/, 'organizers page must state publication trust rules');
assert.match(html, /لا ننشر فعالية بلا مصدر اعتماد/, 'organizers page must preserve the trusted-source boundary');
assert.match(html, /اتفاق البيانات قبل التفعيل/, 'organizers page must define the organizer data contract');
// WO-4 owner-isolation policy (scripts/owner-only-pages.mjs): source-health.html
// is owner-only and must never be linked from a public page. The organizers
// page is public, so it must NOT link source-health.html or surface its
// "حالة الجلب" (source-health) label — the opposite of what this test used
// to assert before the WO-4 ruling.
assert.doesNotMatch(html, /source-health\.html/, 'organizers page must not link the owner-only source-health page (WO-4)');
assert.doesNotMatch(html, /حالة الجلب/, 'organizers page must not surface the owner-only source-health label (WO-4)');
assert.match(html, /guide-organizers-live-schedule\.html/, 'organizers page must link to the organizer guide');

const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
const service = jsonLd.find((item) => item['@type'] === 'Service');
assert.ok(service, 'organizers page must include Service JSON-LD');
assert.equal(service.provider?.url, 'https://eventme.live', 'Service JSON-LD must keep eventme.live as provider URL');
assert.ok(service.hasOfferCatalog?.itemListElement?.length >= 4, 'Service JSON-LD must describe the organizer package');

const faq = jsonLd.find((item) => item['@type'] === 'FAQPage');
assert.ok(faq, 'organizers page must include FAQPage JSON-LD');
assert.ok(faq.mainEntity.some((entry) => entry.name.includes('منصة تذاكر')), 'FAQPage must clarify ticketing boundary');
assert.ok(faq.mainEntity.some((entry) => entry.name.includes('بلا اعتماد')), 'FAQPage must clarify verification boundary');

assert.match(intakeHtml, /data-organizer-intake-form/, 'organizer intake must render the structured intake form');
assert.match(intakeHtml, /data-intake-preview/, 'organizer intake must show structured JSON preview');
assert.match(intakeHtml, /لا ينشر EventLive فعالية بلا مصدر اعتماد/, 'organizer intake must preserve the source trust boundary');
assert.equal(intakeContract.contact_email, 'hello@eventme.live', 'organizer intake contract must expose the correct contact email');
assert.ok(intakeContract.required_fields.includes('source_url_or_program_file'), 'organizer intake contract must require source evidence');

const intakeJsonLd = [...intakeHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]));
assert.ok(intakeJsonLd.some((item) => item['@type'] === 'ContactPage'), 'organizer intake must include ContactPage JSON-LD');
assert.ok(intakeJsonLd.some((item) => item['@type'] === 'Dataset' && item.url === 'https://eventme.live/organizer-intake.json'), 'organizer intake must include Dataset JSON-LD for its contract');

console.log('organizers-page-regression-test: ok');
