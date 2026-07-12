import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  baseCandidate,
  extractInformaEventFromHtml,
  extractInformaSaudiPortfolio,
  informaSaudiSitemapUrls
} from './collect-source-candidates.mjs';

const source = {
  id: 'informa-connect-saudi-events',
  name: 'Informa Connect Saudi Event Portfolio',
  url: 'https://informaconnect.com/',
  owner: 'Informa Connect / Informa Group',
  source_type: 'conference-organizer',
  trust_level: 'official',
  candidate_gate: 'duplicate-review',
  evidence_required: 'First-party Event structured data.',
  cities: ['Riyadh', 'Saudi Arabia'],
  categories: ['conferences']
};

function eventHtml({
  name = 'Saudi Event Show',
  description = 'The leading Saudi event industry exhibition.',
  startDate = '2026-09-09',
  endDate = '2026-09-10',
  url = 'https://informaconnect.com/saudi-event-show/',
  locality = 'Riyadh',
  country = 'Saudi Arabia',
  language = 'en',
  startTime = '11:30:00',
  endTime = '19:30:00'
} = {}) {
  const event = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description,
    image: 'https://knect365.imgix.net/uploads/event.png?auto=format&fit=max&w=1920',
    startDate,
    ...(endDate ? { endDate } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventSchedule: {
      '@type': 'Schedule',
      startTime,
      endTime
    },
    url,
    location: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: locality,
        addressCountry: country
      }
    },
    organizer: {
      '@type': 'Organization',
      name: 'Informa Group PLC'
    },
    inLanguage: language
  };
  return `<!doctype html><html lang="${language}"><head><script type="application/ld+json">${JSON.stringify(event)}</script></head><body><h1>${name}</h1><a href="${url}register/">Register now</a><p>${description}</p></body></html>`;
}

const sitemap = `<?xml version="1.0"?><sitemapindex>
  <sitemap><loc>https://informaconnect.com/saudi-event-show/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://informaconnect.com/saudi-event-show/ar/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://informaconnect.com/saudi-ai-week/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://informaconnect.com/saudi-strategy-week/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://informaconnect.com/saudi-in-paris/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://informaconnect.com/saudi-intermobility-expo-visa-invitation-form/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://example.com/saudi-event/sitemap.xml</loc></sitemap>
  <sitemap><loc>https://informaconnect.com/london-finance-week/sitemap.xml</loc></sitemap>
</sitemapindex>`;

assert.deepEqual(informaSaudiSitemapUrls(sitemap), [
  'https://informaconnect.com/saudi-event-show/sitemap.xml',
  'https://informaconnect.com/saudi-event-show/ar/sitemap.xml',
  'https://informaconnect.com/saudi-ai-week/sitemap.xml',
  'https://informaconnect.com/saudi-strategy-week/sitemap.xml',
  'https://informaconnect.com/saudi-in-paris/sitemap.xml'
]);

const event = extractInformaEventFromHtml(eventHtml(), source, 'https://informaconnect.com/saudi-event-show/');
assert.ok(event);
assert.equal(event.title, 'Saudi Event Show');
assert.equal(event.starts_at, '2026-09-09T11:30:00+03:00');
assert.equal(event.ends_at, '2026-09-10T19:30:00+03:00');
assert.equal(event.city, 'Riyadh');
assert.equal(event.category, 'exhibition');
assert.equal(event.registration_url, 'https://informaconnect.com/saudi-event-show/register/');
assert.equal(event.image_url, 'https://knect365.imgix.net/uploads/event.png?auto=format&fit=max&w=1920');
assert.equal(event.verification_method, 'official-informa-portfolio-json-ld');
assert.equal(event.publication_gate, 'duplicate-review');
const candidate = baseCandidate(source, event, 'data/raw/source-snapshots/informa-fixture.html');
assert.equal(candidate.source_type, 'official-site');
assert.equal(candidate.confidence, 'official');
assert.equal(
  extractInformaEventFromHtml(eventHtml({ startTime: '8:05', endTime: '9:10' }), source, 'https://informaconnect.com/saudi-event-show/').starts_at,
  '2026-09-09T08:05:00+03:00',
  'single-digit schedule hours must normalize to the public Saudi datetime contract'
);

assert.equal(
  extractInformaEventFromHtml(eventHtml({ endDate: '' }), source, 'https://informaconnect.com/saudi-strategy-week/'),
  null,
  'date-incomplete schema must never become a candidate'
);
assert.equal(
  extractInformaEventFromHtml(eventHtml({ locality: 'Paris', country: 'France' }), source, 'https://informaconnect.com/saudi-in-paris/'),
  null,
  'a Saudi keyword in the title or URL must not override structured non-Saudi location evidence'
);

const pages = new Map([
  ['https://informaconnect.com/saudi-event-show/', eventHtml()],
  ['https://informaconnect.com/saudi-event-show/ar/', eventHtml({ url: 'https://informaconnect.com/saudi-event-show/ar/', language: 'ar' })],
  ['https://informaconnect.com/saudi-ai-week/', eventHtml({
    name: 'Saudi AI Week',
    description: 'A technology conference in Riyadh.',
    startDate: '2026-11-08',
    endDate: '2026-11-12',
    url: 'https://informaconnect.com/saudi-ai-week/'
  })],
  ['https://informaconnect.com/saudi-strategy-week/', eventHtml({ endDate: '' })],
  ['https://informaconnect.com/saudi-in-paris/', eventHtml({ locality: 'Paris', country: 'France' })]
]);

const portfolio = await extractInformaSaudiPortfolio(sitemap, source, {
  fetchPage: async (url) => pages.get(url) || '',
  writeSnapshot: false
});
assert.equal(portfolio.length, 2, 'Arabic/English duplicates and invalid schemas must be removed');
assert.deepEqual(portfolio.map((row) => row.title), ['Saudi Event Show', 'Saudi AI Week']);
assert.equal(portfolio[0].url, 'https://informaconnect.com/saudi-event-show/ar/', 'the richer Arabic edition should win duplicate selection');

const registry = JSON.parse(fs.readFileSync('data/source_registry.json', 'utf8'));
const registered = registry.sources.find((entry) => entry.id === source.id);
assert.ok(registered, 'Informa Saudi portfolio must remain registered');
assert.equal(registered.collector_url, 'https://informaconnect.com/sitemap-sites.xml');
assert.equal(registered.fetch_method, 'sitemap-pages');
assert.equal(registered.intake_policy, 'official-feed-preferred');
assert.equal(registered.candidate_gate, 'duplicate-review');

console.log(`INFORMA_SAUDI_PORTFOLIO_OK sitemap_roots=${informaSaudiSitemapUrls(sitemap).length} valid=${portfolio.length} duplicates_rejected=1 invalid_rejected=2`);
