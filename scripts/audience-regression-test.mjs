import fs from 'node:fs';
import path from 'node:path';
import { audienceLabel, classifyAudiences, normalizeAudienceText } from './audience-utils.mjs';

const failures = [];

function check(name, condition, details = '') {
  if (!condition) failures.push(`${name}${details ? `: ${details}` : ''}`);
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${name}`);
}

function hasAudience(name, event, slug) {
  const audiences = classifyAudiences(event);
  check(name, audiences.includes(slug), `expected ${slug}, got ${audiences.join(', ')}`);
}

function lacksAudience(name, event, slug) {
  const audiences = classifyAudiences(event);
  check(name, !audiences.includes(slug), `did not expect ${slug}, got ${audiences.join(', ')}`);
}

hasAudience('Arabic AI bootcamp => tech', {
  title: 'معسكر الذكاء الاصطناعي التطبيقي',
  summary: 'برنامج تقني للطلاب والخريجين في تحليل البيانات.',
  category: 'technology training',
  source_label: 'SDAIA Academy'
}, 'tech');

hasAudience('Arabic AI bootcamp => students', {
  title: 'معسكر الذكاء الاصطناعي التطبيقي',
  summary: 'برنامج تقني للطلاب والخريجين في تحليل البيانات.',
  category: 'technology training'
}, 'students');

hasAudience('English startup forum => entrepreneurs', {
  title: 'Startup Investment Forum',
  summary: 'Venture capital, founders, accelerators, and SME growth.',
  category: 'entrepreneurship'
}, 'entrepreneurs');

hasAudience('Mixed career fair => job-seekers', {
  title: 'ملتقى Career Fair للتوظيف',
  summary: 'ورش سيرة ذاتية وتأهيل لسوق العمل.',
  category: 'career'
}, 'job-seekers');

hasAudience('Cultural festival => families', {
  title: 'مهرجان ترفيهي عائلي',
  summary: 'فعاليات للأطفال والعائلات طوال الويكند.',
  category: 'season'
}, 'families');

hasAudience('Cultural festival => creatives', {
  title: 'Ithra Art and Music Festival',
  summary: 'فنون وموسيقى وتجارب إبداعية.',
  category: 'culture'
}, 'creatives');

hasAudience('Sports fixture => sports', {
  title: 'Saudi Pro League Match',
  summary: 'مباراة ضمن الدوري السعودي.',
  category: 'sports'
}, 'sports');

hasAudience('Arabic running race => sports', {
  title: 'سباق جري مجتمعي',
  summary: 'سباق مفتوح للجمهور في المدينة.',
  category: 'community'
}, 'sports');

lacksAudience('Arabic verb جرى must not imply sports', {
  title: 'زيارة وفد تجاري',
  summary: 'جرى خلال الزيارة استعراض فرص التعاون بين الجهتين.',
  category: 'business'
}, 'sports');

hasAudience('Explicit women-only event => women', {
  title: 'ورشة نسائية في التصميم',
  summary: 'للسيدات فقط.',
  category: 'design'
}, 'women');

const generic = classifyAudiences({
  title: 'فعالية عامة في الرياض',
  summary: 'لقاء مفتوح للجمهور.',
  category: 'general'
});
check('No strong signal => general', generic.length === 1 && generic[0] === 'general', `got ${generic.join(', ')}`);

lacksAudience('Hiring event must not become families', {
  title: 'ملتقى التوظيف وسوق العمل',
  summary: 'فرص وظيفية ومقابلات مهنية.',
  category: 'career'
}, 'families');

lacksAudience('Riyadh entertainment must not become tech from ai substring', {
  title: 'The Groves Riyadh',
  summary: 'Experience Riyadh Season dining and live entertainment.',
  category: 'Entertainment / Families',
  tags: ['seasons', 'tourism', 'culture', 'entertainment', 'destinations']
}, 'tech');

hasAudience('Riyadh entertainment keeps families audience', {
  title: 'The Groves Riyadh',
  summary: 'Experience Riyadh Season dining and live entertainment.',
  category: 'Entertainment / Families',
  tags: ['seasons', 'tourism', 'culture', 'entertainment', 'destinations']
}, 'families');

lacksAudience('Generic Visit Saudi tags must not force sports audience', {
  title: 'Arabic Language Exhibition',
  summary: 'Culture and history experience for families.',
  category: 'Culture & History / Families',
  tags: ['tourism', 'culture', 'entertainment', 'sports']
}, 'sports');

check('Arabic normalization removes hamza variants',
  normalizeAudienceText('الذكاء الإصطناعي والبيانات') === normalizeAudienceText('الذكاء الاصطناعي والبيانات'));

check('Audience label exists', audienceLabel('tech') === 'تقنيون');

const distEventsPath = path.join(process.cwd(), 'dist', 'events.json');
const distAudiencesPath = path.join(process.cwd(), 'dist', 'audiences.json');
const sitemapPath = path.join(process.cwd(), 'dist', 'sitemap.xml');

if (fs.existsSync(distEventsPath) && fs.existsSync(distAudiencesPath) && fs.existsSync(sitemapPath)) {
  const events = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
  const audiences = JSON.parse(fs.readFileSync(distAudiencesPath, 'utf8')).audiences || [];
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const missingAudiences = events.filter((event) => !Array.isArray(event.audiences) || event.audiences.length === 0);
  const missingLabels = events.filter((event) => !Array.isArray(event.audience_labels) || event.audience_labels.length === 0);
  const missingPages = audiences.filter((audience) => !fs.existsSync(path.join(process.cwd(), 'dist', 'for', `${audience.slug}.html`)));
  const missingSitemap = audiences.filter((audience) => !sitemap.includes(`/for/${audience.slug}.html`));
  const byId = new Map(events.map((event) => [event.id, event]));
  check('Built catalog events carry audiences[]', events.length > 0 && missingAudiences.length === 0, `missing ${missingAudiences.length} of ${events.length}`);
  check('Built catalog events carry audience labels', events.length > 0 && missingLabels.length === 0, `missing ${missingLabels.length} of ${events.length}`);
  check('Audience index has pages', audiences.length > 0, `audiences ${audiences.length}`);
  check('Audience pages exist', missingPages.length === 0, `missing ${missingPages.map((item) => item.slug).join(', ')}`);
  check('Audience pages are in sitemap', missingSitemap.length === 0, `missing ${missingSitemap.map((item) => item.slug).join(', ')}`);
  check('Built The Groves must not be tagged tech', !byId.get('event-the-groves')?.audiences?.includes('tech'), `got ${byId.get('event-the-groves')?.audiences?.join(', ')}`);
  check('Built Fan Zone must not be tagged tech', !byId.get('event-coca-cola-fan-zone-at-jax-district')?.audiences?.includes('tech'), `got ${byId.get('event-coca-cola-fan-zone-at-jax-district')?.audiences?.join(', ')}`);
  check('Built Arabic Language Exhibition must not be tagged sports', !byId.get('event-arabic-language-exhibition-28')?.audiences?.includes('sports'), `got ${byId.get('event-arabic-language-exhibition-28')?.audiences?.join(', ')}`);
}

// 2026-09-19 — word boundaries. `/art/` had none, so "Sm-art Data & AI Summit", "Saudi AI Week"
// (artifici-al), "Cityscape Global" (sm-art), "Web Summit" (st-art-up), "Quarter-Finals: FIFA"
// (qu-art-er) and "Pool Party" (P-art-y) all landed on the creatives audience page; `/فن/` is two
// letters, so a hotel-management diploma qualified through الإدارة الفند-قية. And JavaScript's \b
// is ASCII-only, so the obvious repair — /\bفن\b/ — matches nothing at all. Both directions are
// asserted here: the false ones must go, and the real ones must stay.
{
  const creativesOf = (event) => classifyAudiences({ ...event, audiences: undefined });
  const mustNot = [
    ['artificial ≠ art', { title: 'Global AI Summit', summary: 'A summit on artificial intelligence.', category: 'technology-innovation' }],
    ['smart ≠ art', { title: 'Cityscape Global 2026', summary: 'Smart city real estate exhibition.', category: 'exhibitions-conferences' }],
    ['startup ≠ art', { title: 'Web Summit', summary: 'A gathering for startups and investors.', category: 'business-entrepreneurship' }],
    ['quarter ≠ art', { title: 'Quarter-Finals at the Fan Zone', summary: 'Football screening.', category: 'sports-outdoors' }],
    ['party ≠ art', { title: 'Pool Party', summary: 'A summer pool party.', category: 'family-entertainment' }],
    ['فندقية ≠ فن', { title: 'دبلوم الإدارة الفندقية', summary: 'برنامج في الإدارة الفندقية.', category: 'education-training' }],
    ['designed ≠ design', { title: 'Ruh Space', summary: 'Designed for football enthusiasts, the venue offers live screenings.', category: 'sports-outdoors' }]
  ];
  for (const [label, event] of mustNot) {
    check(`creatives must not fire on ${label}`, !creativesOf(event).includes('creatives'), `got ${creativesOf(event).join(', ')}`);
  }
  const mustFire = [
    ['شارع الفن', { title: 'شارع الفن - القرية الريفية', summary: 'شارع للفنون.', category: 'tourism-experiences' }],
    ['معرض الحرف', { title: 'معرض الحرف والأعمال اليدوية', summary: 'معرض للحرف اليدوية.', category: 'exhibitions-conferences' }],
    ['والثقافة with a comma', { title: 'مهابة', summary: 'تجربة تجمع بين الطبيعة، والثقافة، والترفيه.', category: 'sports-outdoors' }],
    ['موسيقية', { title: 'مهرجان لحن المملكة', summary: 'فعالية موسيقية نوعية.', category: 'culture-arts' }],
    ['plain art', { title: 'Hayy Arts | Red Wind', summary: 'A contemporary art exhibition.', category: 'culture-arts' }]
  ];
  for (const [label, event] of mustFire) {
    check(`creatives must still fire on ${label}`, creativesOf(event).includes('creatives'), `got ${creativesOf(event).join(', ')}`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} audience regression failure(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('\nAll audience regression checks passed.');
