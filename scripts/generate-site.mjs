import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { normalizeArabicSearch } from './arabic-normalize.mjs';
import { AUDIENCE_TAXONOMY, audienceObjects, classifyAudiences } from './audience-utils.mjs';
import { normalizeSaudiCity } from './city-utils.mjs';
import { classifyEventKind, eventKindLabel, getEventStatus } from './event-kind-utils.mjs';
import { isLikelyImageAssetUrl, isRejectedImageAssetUrl, isSourcePageLikeImageUrl } from './image-asset-utils.mjs';
import { coordinatesQuery, resolveVenueLocation } from './venue-location-utils.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const eventsDir = path.join(distDir, 'events');
const citiesDir = path.join(distDir, 'cities');
const categoriesDir = path.join(distDir, 'categories');
const audiencesDir = path.join(distDir, 'for');
const feedsDir = path.join(distDir, 'feeds');
const coversDir = path.join(distDir, 'assets', 'event-covers');
const platformName = 'EventLive';
const platformDomain = 'eventme.live';
const siteUrl = `https://${platformDomain}`;
const buildAt = new Date().toISOString();
const includeDemoEvent = process.env.EVENTLIVE_INCLUDE_DEMO === '1';
const imageCacheManifest = readJson('data/event_image_cache_manifest.json', { images: {} });
const registeredSources = readJson('data/source_registry.json', { sources: [] }).sources || [];
const venueRegistry = readJson('data/venue_registry.json', { venues: [] }).venues || [];
const registeredSourcesByName = new Map();
for (const source of registeredSources) {
  for (const value of [source.name, source.owner].filter(Boolean)) {
    registeredSourcesByName.set(normalizeArabicSearch(value), source);
  }
}

fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });
for (const generatedDir of [eventsDir, citiesDir, categoriesDir, audiencesDir, feedsDir, coversDir]) {
  if (fs.existsSync(generatedDir)) fs.rmSync(generatedDir, { recursive: true, force: true });
}
fs.mkdirSync(eventsDir, { recursive: true });
fs.mkdirSync(citiesDir, { recursive: true });
fs.mkdirSync(categoriesDir, { recursive: true });
fs.mkdirSync(audiencesDir, { recursive: true });
fs.mkdirSync(feedsDir, { recursive: true });
fs.mkdirSync(coversDir, { recursive: true });

const brandVisual = '<span class="brand-word" aria-label="EventLive"><span class="brand-sr">EventLive</span><span aria-hidden="true">EventL<span class="live-i">ı</span>ve</span></span>';
const brandCss = `<style id="eventlive-brand-pulse">
@keyframes eventliveLiveDotPulse {
  0%, 100% { opacity: .92; transform: translateX(-50%) scale(1); box-shadow: 0 0 0 0 rgba(229, 72, 77, .2); }
  58% { opacity: .7; transform: translateX(-50%) scale(.94); box-shadow: 0 0 0 5px rgba(229, 72, 77, 0); }
  82% { opacity: .9; transform: translateX(-50%) scale(1.01); box-shadow: 0 0 0 1px rgba(229, 72, 77, .08); }
}
.brand-word { display: inline-flex; align-items: baseline; white-space: nowrap; letter-spacing: 0; }
.brand-word .live-i { position: relative; display: inline-block; font-style: normal; line-height: .95; min-width: .18em; margin-inline: .01em; }
.brand-word .live-i::after { content: ""; position: absolute; width: .24em; height: .24em; border-radius: 999px; background: #c4212b; top: -.16em; left: 50%; transform: translateX(-50%); animation: eventliveLiveDotPulse 5.6s ease-in-out infinite; }
.brand-sr { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
.footer-links { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; font-weight: 700; }
.footer-links a { color: #0d6b52; }
.footer { color: #566960 !important; }
.trust { color: #48635a !important; }
.primary, .btn.primary, .status-card.primary a { background: #006f67 !important; color: #fff !important; }
.status-card.primary .label, .status-card.primary .meta { color: rgba(255,255,255,.92) !important; }
.card h3 { text-align: center; -webkit-line-clamp: 3; min-height: auto; }
.card h3 a { unicode-bidi: plaintext; }
.breadcrumbs { display: flex; align-items: center; gap: 8px; padding: 18px 0 0; color: #66756f; font-size: .92rem; font-weight: 700; }
.breadcrumbs a { color: #0d6b52; }
.breadcrumbs strong { color: #10231d; font-weight: 800; max-width: 46ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session { scroll-margin-top: 88px; }
@media (prefers-reduced-motion: reduce) {
  .brand-word .live-i::after { animation: none; opacity: 1; box-shadow: 0 0 0 3px rgba(229, 72, 77, .18); }
}
@media (max-width: 760px) {
  .breadcrumbs strong { max-width: 24ch; }
  details.more > summary, .cta-now, .card-foot a, .card-foot button { min-height: 44px; }
  .more-panel a { min-height: 44px; display:flex; align-items:center; }
  .site-head { padding-top:env(safe-area-inset-top); }
  .site-head .head-in { min-height:58px; gap:8px; }
  .site-head .brand { gap:8px; margin-inline-end:0; min-width:0; }
  .site-head .brand .mark { width:34px; height:34px; border-radius:9px; flex:0 0 34px; }
  .site-head .brand b { font-size:18px; line-height:1; }
  .site-head .brand small { display:none; }
  .site-head .cta-now {
    order:1;
    min-height:44px;
    padding:7px 12px;
    border:1px solid var(--line);
    border-radius:8px;
    background:#fff;
    color:var(--brand-deep);
    box-shadow:none;
    font-size:13.5px;
  }
  .site-head .cta-now .dot { background:var(--live); animation-duration:5.6s; }
  .site-head .burger { order:2; margin-inline-start:0; }
  .site-head .burger > summary {
    display:grid;
    place-items:center;
    width:44px;
    height:44px;
    min-height:44px;
    padding:0;
    border:1px solid var(--line);
    border-radius:8px;
    background:#fff;
    font-size:18px;
  }
  .site-head .more-panel { top:calc(58px + env(safe-area-inset-top)); }
  .site-head + .hero .hero-in { gap:16px; padding:20px 0 24px; }
  .site-head + .hero .eyebrow { margin-bottom:10px; padding:4px 9px; }
  .site-head + .hero h1 { margin-bottom:8px; font-size:26px; }
  .site-head + .hero .lead {
    margin-bottom:14px;
    font-size:14px;
    line-height:1.7;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden;
  }
  .site-head + .hero .search-box input { min-height:48px; border-radius:10px; }
  .site-head + .hero .hero-ctas { gap:8px; margin-top:12px; }
  .site-head + .hero .hero-ctas .ghost { flex:1; min-height:44px; padding:8px 10px; text-align:center; }
  .site-head + .hero .board { padding:14px; border-radius:14px; }
  .site-head + .hero .board-label { margin-bottom:8px; }
  .site-head + .hero .board h2 { font-size:18px; }
  .site-head + .hero .board .b-meta { margin-bottom:10px; }
  .site-head + .hero .countdown { gap:6px; margin-bottom:12px; }
  .site-head + .hero .cd-cell { padding:8px 4px 7px; border-radius:8px; }
  .site-head + .hero .cd-cell b { font-size:20px; }
  .site-head + .hero .board-actions .primary { flex:1; min-height:44px; padding:9px 12px; text-align:center; }
  .site-head + .hero .board-actions .plain, .site-head + .hero .board-stats { display:none; }
  .card-row {
    scroll-padding-inline:16px;
    overscroll-behavior-inline:contain;
    -webkit-overflow-scrolling:touch;
  }
  .card-row .card {
    flex:0 0 min(82vw,320px);
    min-width:0;
    scroll-snap-align:start;
  }
  .card-row:focus-visible {
    outline:3px solid rgba(13,107,82,.35);
    outline-offset:4px;
  }
  .h-section-head { align-items:flex-start; }
  .h-section-head .more-link { display:inline-flex; align-items:center; min-height:44px; }
}
</style>`;

const pageCss = `<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
:root{--bg:#f7f5ef;--ink:#10231d;--muted:#66756f;--line:#dfe6df;--card:#fffdf8;--green:#0d6b52;--green-dark:#07231c;--live:#c4212b;--gold:#b88a2a}
*{box-sizing:border-box}body{margin:0;font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.75}a{color:inherit;text-decoration:none}.wrap{width:min(1120px,calc(100% - 32px));margin:auto}.topbar{position:sticky;top:0;z-index:20;background:rgba(247,245,239,.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}.nav{height:72px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand{display:flex;align-items:center;gap:10px;font-weight:700}.brand-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:8px;background:var(--green-dark);color:#fff;font-weight:700}.nav-links{display:flex;gap:18px;color:var(--muted);font-weight:700;font-size:.94rem}.mobile-site-menu{display:none;position:relative}.mobile-site-menu>summary{list-style:none;display:grid;place-items:center;width:44px;height:44px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);font-size:1.25rem;cursor:pointer}.mobile-site-menu>summary::-webkit-details-marker{display:none}.mobile-site-menu nav{position:fixed;top:64px;inset-inline:11px;z-index:40;display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px;border:1px solid var(--line);border-radius:10px;background:#fff;box-shadow:0 18px 40px rgba(16,35,29,.16)}.mobile-site-menu nav a{display:flex;align-items:center;min-height:44px;padding:8px 10px;border-radius:8px;background:#f7f5ef;font-weight:700}.cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:0;border-radius:8px;background:var(--green);color:#fff;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer}.cta.is-saved{background:var(--green-dark)}.cta-status{flex-basis:100%;margin:0;color:var(--muted);font-size:.88rem}.hero{padding:54px 0 30px;background:linear-gradient(135deg,var(--green-dark),#0d6b52);color:#fff}.eyebrow{display:inline-flex;gap:8px;align-items:center;color:#f7df9a;font-weight:700}.live-dot{width:9px;height:9px;border-radius:999px;background:var(--live);box-shadow:0 0 0 4px rgba(229,72,77,.18)}h1{font-size:clamp(2rem,5vw,4.4rem);line-height:1.12;margin:14px 0 12px;letter-spacing:0}.lead{font-size:1.08rem;max-width:760px;color:rgba(255,255,255,.82)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.section{padding:32px 0}.card,.activation-card{background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden;box-shadow:0 18px 40px rgba(16,35,29,.06)}.activation-card{padding:18px}.activation-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.card-body{padding:18px}.cover{aspect-ratio:16/9;width:100%;object-fit:cover;background:#dfe6df}.meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;color:var(--muted);font-size:.9rem}.chip{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:4px 9px;background:#fff}.chip-live{background:var(--live);border-color:var(--live);color:#fff}.title{font-size:1.18rem;font-weight:700;margin:0 0 8px}.signal-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:18px}.signal{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:12px}.signal b{display:block;font-size:1.35rem}.facet-focus,.readiness{background:#fff;border:1px solid var(--line);border-radius:8px;padding:18px;margin:18px 0}.facet-primary{border-color:rgba(13,107,82,.35);box-shadow:0 16px 36px rgba(13,107,82,.09)}.signals{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.signal-check,.program-check{border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff}.signal-check.good,.program-check{border-color:rgba(13,107,82,.35)}.signal-check.warn{border-color:rgba(229,72,77,.25)}.decision-score{font-size:2rem;font-weight:700;color:var(--green)}.timeline{display:grid;gap:10px;margin-top:14px}.session{border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff}.footer{padding:28px 0;border-top:1px solid var(--line);color:var(--muted)}.footer-links{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;font-weight:700}.footer-links a{color:var(--green)}.event-quick-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.event-quick-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 14px;border:1px solid rgba(255,255,255,.28);border-radius:8px;background:rgba(255,255,255,.1);color:#fff;font-weight:700}@media(max-width:760px){html{scroll-padding-top:68px}.nav-links{display:none}.mobile-site-menu{display:block;margin-inline-start:auto}.nav{height:auto;min-height:64px;gap:8px}.brand{min-width:0}.brand b{font-size:.95rem}.brand-mark{flex:0 0 36px}.topbar .cta{padding-inline:10px;font-size:.82rem;white-space:nowrap}.hero{padding:26px 0 22px}.wrap{width:min(100% - 22px,1120px)}.facet-page .hero h1{font-size:1.8rem;margin-block:10px}.facet-page .hero .lead{font-size:.9rem;line-height:1.7;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.facet-page .hero .signal-strip{grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:13px}.facet-page .hero .signal{padding:8px}.facet-page .hero .signal b{font-size:1.05rem}.facet-page .section{padding:18px 0}.facet-page .facet-focus{margin:0 0 14px;padding:14px}.facet-page .facet-focus h2{font-size:1.25rem;line-height:1.5;margin-block:6px}.facet-page .facet-focus p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.facet-page .card-body>p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.facet-page .card-body .meta{max-height:78px;overflow:hidden}.facet-page .card-body .meta .chip:nth-child(n+4){display:none}.facet-page .card-body .cta{min-height:44px}.event-detail .breadcrumbs{padding-top:10px;white-space:nowrap;overflow:hidden}.event-detail .breadcrumbs strong{display:none}.event-detail .hero h1{font-size:1.7rem;line-height:1.3;margin-block:10px}.event-detail .hero .lead{font-size:.92rem;line-height:1.75;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.event-detail .hero .signal-strip{grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.event-detail .hero .signal{padding:9px}.event-detail .hero .signal b{font-size:.92rem;line-height:1.5}.event-detail .section{padding:20px 0}.event-detail .readiness{margin:0;padding:14px}.event-detail .signals{grid-template-columns:1fr 1fr;gap:8px}.event-detail .signal-check{padding:9px;font-size:.82rem}.event-detail .readiness>.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px}.event-detail .readiness>.meta .cta{width:100%;min-height:44px}.event-detail .cta-status{grid-column:1/-1}.event-detail .event-quick-actions a{flex:1 1 calc(50% - 4px);padding-inline:8px}.event-detail .program-check{padding:11px}.event-detail .session{padding:11px}.event-detail .session-top{gap:6px}.event-detail .footer-links a{min-height:44px;display:inline-flex;align-items:center}}
</style>`;

const agendaCss = `<style>
.agenda-head{display:flex;align-items:end;justify-content:space-between;gap:16px}.agenda-head p{margin:0;color:#5f6e68}.agenda-head .eyebrow{color:#72530a}
.agenda-live-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:16px 0}.agenda-live-item{border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff}.agenda-live-item span{display:block;color:var(--muted);font-size:.86rem}.agenda-live-item b{display:block;margin-top:4px}
.agenda-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) minmax(190px,.45fr);gap:10px;margin:14px 0}.agenda-search,.agenda-room{width:100%;min-height:46px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);padding:10px 12px;font:inherit}
.agenda-toolbar-single{grid-template-columns:1fr}
.agenda-days{display:flex;gap:8px;overflow-x:auto;padding:2px 0 8px;scroll-snap-type:x proximity}.agenda-day{flex:0 0 auto;min-height:42px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;scroll-snap-align:start}.agenda-day[aria-pressed="true"]{background:var(--green-dark);border-color:var(--green-dark);color:#fff}.agenda-count{color:#5f6e68;font-weight:700}
.session[hidden]{display:none}.session.is-live{border-color:var(--live);box-shadow:inset 4px 0 0 var(--live)}.session.is-ended{background:#f3f4f1;border-color:#d7dfd9}.session.is-ended .session-status{color:#566960;font-weight:700}.session-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.session-time{white-space:nowrap;color:var(--green);font-weight:700}.session b{unicode-bidi:plaintext}.session-speaker{margin:6px 0 0;color:var(--muted);font-size:.92rem}.session-source{color:var(--green);font-size:.88rem;font-weight:700}.session-status{color:var(--muted);font-size:.84rem}
@media(max-width:760px){.agenda-toolbar,.agenda-live-summary{grid-template-columns:1fr}.agenda-head,.session-top{align-items:flex-start;flex-direction:column}.session-time{white-space:normal}}
</style>`;

function readJson(relativePath, fallback = {}) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return fallback;
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function writeJson(relativePath, value) {
  fs.mkdirSync(path.dirname(path.join(distDir, relativePath)), { recursive: true });
  fs.writeFileSync(path.join(distDir, relativePath), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(fullPath, value) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, 'utf8');
}

function stripTrailingWhitespace(value = '') {
  return String(value).replace(/[ \t]+$/gm, '');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(value = 'event') {
  const slug = String(value || 'event')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 110);
  return slug || 'event';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function dateValue(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortEventsByStart(events = []) {
  return [...events].sort((a, b) => {
    const aStart = dateValue(a.starts_at)?.getTime();
    const bStart = dateValue(b.starts_at)?.getTime();
    const aKey = Number.isFinite(aStart) ? aStart : Number.POSITIVE_INFINITY;
    const bKey = Number.isFinite(bStart) ? bStart : Number.POSITIVE_INFINITY;
    if (aKey !== bKey) return aKey - bKey;
    return a.title.localeCompare(b.title, 'ar');
  });
}

function isInActiveWindow(event, nowMs, windowMs, includeActive = true) {
  const start = dateValue(event.starts_at)?.getTime();
  if (!Number.isFinite(start)) return false;
  if (event.status === 'ended') return false;

  const end = dateValue(event.ends_at || event.starts_at)?.getTime();
  const windowSpanMs = Number.isFinite(windowMs) && Number.isFinite(nowMs) ? Math.max(0, windowMs - nowMs) : 0;
  if (includeActive && start <= nowMs && start >= (nowMs - windowSpanMs) && (!Number.isFinite(end) || end >= nowMs)) return true;
  return start >= nowMs && start <= windowMs;
}

function eventsForWindow(events = [], referenceMs, hours) {
  const now = referenceMs || Date.now();
  const limitMs = now + (hours * 60 * 60 * 1000);
  return sortEventsByStart(events.filter((event) => isInActiveWindow(event, now, limitMs, true)));
}

function formatDate(value) {
  const date = dateValue(value);
  if (!date) return 'لم يحدد الوقت';
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Riyadh'
  }).format(date);
}

function absoluteUrl(relativePath = '') {
  return `${siteUrl}/${String(relativePath).replace(/^\.\//, '')}`;
}

function publicAssetUrl(value = '') {
  if (!value) return '';
  const text = String(value);
  if (/^https?:\/\//i.test(text)) return text;
  return absoluteUrl(text.replace(/^\//, ''));
}

function isOnlineEvent(event = {}) {
  const text = [
    event.city,
    event.city_label,
    event.venue,
    event.venue_address,
    event.training_delivery,
    event.delivery_mode,
    event.attendance_mode
  ].filter(Boolean).join(' ');
  return /\bOnline\b|عن بعد|افتراضي|افتراضية|تفاعلية مباشرة|أونلاين|اونلاين/i.test(text);
}

const cityLabelMap = new Map([
  ['Riyadh', 'الرياض'],
  ['Jeddah', 'جدة'],
  ['Makkah', 'مكة'],
  ['Madinah', 'المدينة المنورة'],
  ['Dammam', 'الدمام'],
  ['Khobar', 'الخبر'],
  ['Dhahran', 'الظهران'],
  ['AlUla', 'العلا'],
  ['Abha', 'أبها'],
  ['Aseer', 'عسير'],
  ['Khamis Mushait', 'خميس مشيط'],
  ['Buraydah', 'بريدة'],
  ['Taif', 'الطائف'],
  ['Tabuk', 'تبوك'],
  ['Hail', 'حائل'],
  ['Al Muzahimiyah', 'المزاحمية'],
  ['Al Namas', 'النماص'],
  ['Jazan', 'جازان'],
  ['Najran', 'نجران'],
  ['Al Baha', 'الباحة'],
  ['Sakaka', 'سكاكا'],
  ['Dumat Al Jandal', 'دومة الجندل'],
  ['Arar', 'عرعر'],
  ['Rafha', 'رفحاء'],
  ['Turaif', 'طريف'],
  ['NEOM', 'نيوم'],
  ['Unaizah', 'عنيزة'],
  ['Rass', 'الرس'],
  ['Al Kharj', 'الخرج'],
  ['Dawadmi', 'الدوادمي'],
  ['Majmaah', 'المجمعة'],
  ['Shaqra', 'شقراء'],
  ['Hafar Al Batin', 'حفر الباطن'],
  ['Rabigh', 'رابغ'],
  ['Yanbu', 'ينبع'],
  ['Al Ahsa', 'الأحساء'],
  ['Thuwal', 'ثول'],
  ['Qatif', 'القطيف'],
  ['Diriyah', 'الدرعية'],
  ['Jubail', 'الجبيل'],
  ['Nationwide', 'على مستوى المملكة'],
  ['Global', 'دولي'],
  ['Online', 'عن بعد'],
  ['Saudi Arabia', 'السعودية']
]);

const citySlugMap = new Map([
  ['Riyadh', 'riyadh'],
  ['Jeddah', 'jeddah'],
  ['Makkah', 'makkah'],
  ['Madinah', 'madinah'],
  ['Dammam', 'dammam'],
  ['Khobar', 'khobar'],
  ['Dhahran', 'dhahran'],
  ['AlUla', 'alula'],
  ['Abha', 'abha'],
  ['Aseer', 'aseer'],
  ['Khamis Mushait', 'khamis-mushait'],
  ['Buraydah', 'buraydah'],
  ['Taif', 'taif'],
  ['Tabuk', 'tabuk'],
  ['Hail', 'hail'],
  ['Al Muzahimiyah', 'al-muzahimiyah'],
  ['Al Namas', 'al-namas'],
  ['Jazan', 'jazan'],
  ['Najran', 'najran'],
  ['Al Baha', 'al-baha'],
  ['Sakaka', 'sakaka'],
  ['Dumat Al Jandal', 'dumat-al-jandal'],
  ['Arar', 'arar'],
  ['Rafha', 'rafha'],
  ['Turaif', 'turaif'],
  ['NEOM', 'neom'],
  ['Unaizah', 'unaizah'],
  ['Rass', 'rass'],
  ['Al Kharj', 'al-kharj'],
  ['Dawadmi', 'dawadmi'],
  ['Majmaah', 'majmaah'],
  ['Shaqra', 'shaqra'],
  ['Hafar Al Batin', 'hafar-al-batin'],
  ['Rabigh', 'rabigh'],
  ['Yanbu', 'yanbu'],
  ['Al Ahsa', 'al-ahsa'],
  ['Thuwal', 'thuwal'],
  ['Qatif', 'qatif'],
  ['Diriyah', 'diriyah'],
  ['Jubail', 'jubail'],
  ['Nationwide', 'nationwide'],
  ['Global', 'global'],
  ['Online', 'online']
]);

function cityLabel(city) {
  return cityLabelMap.get(city) || city;
}

function citySlug(city) {
  return citySlugMap.get(city) || slugify(city);
}

function categorySlug(category = '', event = {}) {
  const categoryText = normalizeArabicSearch(category);
  const text = normalizeArabicSearch([
    category,
    event.title,
    event.summary,
    Array.isArray(event.tags) ? event.tags.join(' ') : ''
  ].filter(Boolean).join(' '));
  if (/غرف|غرفه|\bchamber\b|\bcommerce\b/.test(text)) return 'chamber-event';
  if (/غذاء|دواء|صحه|صحي|طبي|تنظيم|لوائح|مبيدات|\bsfda\b|\bregulatory\b|\bhealthcare\b|\bpharma\b/.test(text)) return 'regulatory-workshop';
  if (/العاب|الكترونيه|\bgaming\b|\besports?\b|\bgamers?\b/.test(text)) return 'gaming-esports';
  if (/رياضه|رياضي|مباراه|بطوله|\bsports?\b|\bfootball\b|\bmatch\b|\bcup\b/.test(categoryText)) return 'sports';
  if (/ثقاف|تراث|فنون|ادب|\bculture\b|\bhistory\b|\bheritage\b|\barts?\b/.test(categoryText)) return 'culture-arts';
  if (/موسم|ترفيه|عائلات|اطفال|موسيقي|موسيقى|\bfamil(y|ies)\b|\bfestival\b|\bseason\b|\bentertainment\b|\bpublic holidays?\b|\bmusic\b|\bconcert\b|\bclub\b/.test(categoryText)) return 'entertainment-families';
  if (/جائزه|جوائز|تكريم|\bawards?\b|\bprizes?\b|\bceremon(y|ies)\b/.test(text)) return 'awards-ceremonies';
  if (/فضاء|فلك|\bastronomy\b|\bspace\b|\bartemis\b|\bcopuos\b|\bastronautical\b|\bmadar\b/.test(text)) return 'science-space';
  if (/مؤتمر|ملتقي|منتدي|قمه|\bconference\b|\bforum\b|\bsummit\b/.test(text)) return 'conference-forum';
  if (/معرض|اكسبو|مزاد|\bexhibition\b|\bexpo\b|\btrade show\b|\bauction\b|\bvenue event\b|\bcidex\b|\bjewels\b/.test(text)) return 'exhibition-trade';
  if (/جامعه|اكاديمي|مجتمع|محاضره|ورشه|\bworkshop\b|\bcommunity\b|\buniversity event\b|\bpublic lecture\b|\bkaust\b/.test(text)) return 'education-community';
  if (/تدريب|تقني|معسكر|مهارات|\bbootcamp\b|\bcourse\b|\btraining\b|\btuwaiq\b|\bfuture skills\b|\bmcit\b|\bcode\b|\bsdaia\b|\bai\b|\bcyber\b|\bdata\b|\bdigital\b|\bcloud\b|\bsoftware\b|\bprogramming\b|\bgenerative\b/.test(text)) return 'technology-training';
  if (/رياضه|رياضي|مباراه|بطوله|\bsports?\b|\bfootball\b|\bmatch\b|\bcup\b/.test(text)) return 'sports';
  if (/ثقاف|تراث|فنون|ادب|\bculture\b|\bhistory\b|\bheritage\b|\barts?\b|\bithra\b/.test(text)) return 'culture-arts';
  if (/موسم|ترفيه|عائلات|اطفال|موسيقي|موسيقى|\bfamil(y|ies)\b|\bfestival\b|\bseason\b|\bentertainment\b|\bpublic holidays?\b|\bmusic\b|\bconcert\b|\bclub\b/.test(text)) return 'entertainment-families';
  if (/رياده|منشات|منشآت|\bstartup\b|\bentrepreneur\b|\bbiban\b/.test(text)) return 'entrepreneurship';
  return slugify(category || 'general-events');
}

function categoryLabel(slug, original = '') {
  const labels = new Map([
    ['technology-training', 'تدريب تقني'],
    ['chamber-event', 'فعاليات الغرف التجارية'],
    ['entertainment-families', 'ترفيه وعائلات'],
    ['culture-arts', 'ثقافة وفنون'],
    ['gaming-esports', 'ألعاب ورياضات إلكترونية'],
    ['national-day', 'مناسبات وطنية'],
    ['sports', 'رياضة وفعاليات جماهيرية'],
    ['entrepreneurship', 'ريادة أعمال'],
    ['regulatory-workshop', 'ورش تنظيمية وصحية'],
    ['science-space', 'علوم وفضاء'],
    ['conference-forum', 'مؤتمرات ومنتديات'],
    ['exhibition-trade', 'معارض وتجارية'],
    ['education-community', 'جامعات ومجتمع'],
    ['awards-ceremonies', 'جوائز وتكريم'],
    ['general-events', 'فعاليات عامة']
  ]);
  return labels.get(slug) || original || 'فعاليات عامة';
}

const categorySlugAliases = new Map([
  ['conferences-forums', 'conference-forum'],
  ['technology-bootcamp', 'technology-training'],
  ['sports-families', 'sports'],
  ['sports-and-community', 'sports'],
  ['culture-history-families', 'culture-arts'],
  ['skills-program', 'technology-training'],
  ['saudi-seasons', 'entertainment-families'],
  ['معسكر-هندسة-الميكاترونكس', 'technology-training']
]);

function canonicalCategorySlug(slug = '') {
  const decoded = decodeURIComponent(String(slug || '').trim());
  return categorySlugAliases.get(decoded) || decoded;
}

const strategicCoverageCities = [
  'Riyadh',
  'Jeddah',
  'Makkah',
  'Madinah',
  'Dammam',
  'Khobar',
  'Dhahran',
  'AlUla',
  'Abha',
  'Aseer',
  'Khamis Mushait',
  'Buraydah',
  'Taif',
  'Tabuk',
  'Hail',
  'Jazan',
  'Najran',
  'Yanbu',
  'Al Ahsa',
  'Thuwal',
  'Qatif',
  'Diriyah',
  'Jubail',
  'Online',
  'Nationwide'
];

const strategicCoverageCategories = [
  ['technology training', 'تدريب تقني'],
  ['chamber event', 'فعاليات الغرف التجارية'],
  ['entertainment families', 'ترفيه وعائلات'],
  ['sports', 'رياضة وفعاليات جماهيرية'],
  ['entrepreneurship', 'ريادة أعمال'],
  ['regulatory workshop', 'ورش تنظيمية وصحية'],
  ['science space', 'علوم وفضاء'],
  ['conference forum', 'مؤتمرات ومنتديات'],
  ['exhibition trade', 'معارض وتجارية'],
  ['education community', 'جامعات ومجتمع'],
  ['general events', 'فعاليات عامة']
];

const saudiRegions = [
  ['al-baha-region', 'منطقة الباحة', ['Al Baha']],
  ['al-jawf-region', 'منطقة الجوف', ['Sakaka', 'Dumat Al Jandal']],
  ['northern-borders-region', 'منطقة الحدود الشمالية', ['Arar', 'Rafha', 'Turaif']],
  ['tabuk-region', 'منطقة تبوك', ['Tabuk', 'NEOM']],
  ['hail-region', 'منطقة حائل', ['Hail']],
  ['najran-region', 'منطقة نجران', ['Najran']],
  ['madinah-region', 'منطقة المدينة المنورة', ['Madinah', 'Yanbu', 'AlUla']],
  ['jazan-region', 'منطقة جازان', ['Jazan']],
  ['qassim-region', 'منطقة القصيم', ['Buraydah', 'Unaizah', 'Rass']],
  ['riyadh-region', 'منطقة الرياض', ['Riyadh', 'Diriyah', 'Al Kharj', 'Dawadmi', 'Majmaah', 'Shaqra']],
  ['eastern-region', 'المنطقة الشرقية', ['Dammam', 'Khobar', 'Dhahran', 'Jubail', 'Qatif', 'Al Ahsa', 'Hafar Al Batin']],
  ['makkah-region', 'منطقة مكة المكرمة', ['Jeddah', 'Makkah', 'Taif', 'Thuwal', 'Rabigh']],
  ['aseer-region', 'منطقة عسير', ['Aseer', 'Abha', 'Khamis Mushait']]
];

function eventIdentity(event) {
  return `${normalizeArabicSearch(event.title || '')}|${event.starts_at || ''}|${normalizeSaudiCity(event.city || event.venue || '', 'Saudi Arabia')}`;
}

function coverTitleLines(title) {
  const words = String(title || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return ['EventLive'];
  const hasArabic = /[\u0600-\u06ff]/.test(title);
  const softLimit = hasArabic ? 24 : 20;
  const maxLines = 5;
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > softLimit && current && lines.length < maxLines - 1) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > maxLines ? [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')] : lines;
}

function fallbackCover(event) {
  const file = `${event.file_slug || event.id}.svg`;
  const fullPath = path.join(coversDir, file);
  const titleLines = coverTitleLines(event.title);
  const hasArabic = /[\u0600-\u06ff]/.test(event.title || '');
  const fontSize = titleLines.length <= 2 ? 60 : titleLines.length === 3 ? 52 : 44;
  const lineHeight = Math.round(fontSize * 1.24);
  const firstY = 320 - Math.round(((titleLines.length - 1) * lineHeight) / 2);
  const titleText = titleLines.map((line, index) => `<text x="700" y="${firstY + index * lineHeight}" text-anchor="middle" direction="${hasArabic ? 'rtl' : 'ltr'}" unicode-bidi="plaintext" fill="#fff" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800" paint-order="stroke" stroke="rgba(7,35,28,.34)" stroke-width="5" stroke-linejoin="round">${escapeHtml(line)}</text>`).join('');
  const hue = Math.abs([...String(event.id || event.title)].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="788" viewBox="0 0 1400 788" role="img" aria-label="${escapeHtml(event.title)}"><title>${escapeHtml(event.title)}</title><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 48% 22%)"/><stop offset="1" stop-color="hsl(${(hue + 48) % 360} 54% 38%)"/></linearGradient><pattern id="p" width="72" height="72" patternUnits="userSpaceOnUse"><path d="M0 36h72M36 0v72" stroke="rgba(255,255,255,.11)" stroke-width="2"/></pattern></defs><rect width="1400" height="788" fill="url(#g)"/><rect width="1400" height="788" fill="url(#p)"/><rect x="72" y="92" width="1256" height="604" rx="42" fill="rgba(7,35,28,.18)" stroke="rgba(255,255,255,.12)"/><circle cx="1160" cy="154" r="126" fill="rgba(229,72,77,.2)"/><text x="700" y="166" text-anchor="middle" fill="#f7df9a" font-family="Arial, sans-serif" font-size="38" font-weight="700">${platformName}</text>${titleText}<text x="700" y="650" text-anchor="middle" fill="rgba(255,255,255,.84)" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeHtml(cityLabel(event.city || 'Saudi Arabia'))}</text></svg>`;
  writeText(fullPath, svg);
  return `/assets/event-covers/${file}`;
}

function localImagePathExists(publicPath = '') {
  if (!String(publicPath || '').startsWith('/')) return false;
  return fs.existsSync(path.join(distDir, publicPath.replace(/^\//, '')));
}

function localizeEventImage(imageUrl = '') {
  const value = String(imageUrl || '').trim();
  if (!value) return '';
  if (isRejectedImageAssetUrl(value)) return '';
  if (value.startsWith('/assets/event-images/')) return localImagePathExists(value) ? value : '';
  if (value.startsWith('/assets/event-covers/')) return localImagePathExists(value) ? value : '';
  if (!/^https?:\/\//i.test(value)) return value;
  let normalizedUrl = value;
  try {
    normalizedUrl = new URL(value).href;
  } catch {
    normalizedUrl = value;
  }
  const record = imageCacheManifest.images?.[value] || imageCacheManifest.images?.[normalizedUrl];
  if (!record?.public_path || !record.file) return '';
  return fs.existsSync(path.join(root, record.file)) ? record.public_path : '';
}

function remoteImageCandidate(...values) {
  for (const value of values.map((item) => String(item || '').trim())) {
    if (!/^https?:\/\//i.test(value)) continue;
    try {
      const url = new URL(value);
      if (!isLikelyImageAssetUrl(url.href)) continue;
      return url.href;
    } catch {
      continue;
    }
  }
  return '';
}

function loadPreviousEvents() {
  const previous = readJson('dist/events.json', { events: [] });
  const byId = new Map();
  const byIdentity = new Map();
  for (const event of previous.events || []) {
    if (event.id) byId.set(event.id, event);
    byIdentity.set(eventIdentity(event), event);
  }
  return { byId, byIdentity };
}

function makeDemoEvent(demo) {
  if (!demo.program) return null;
  const sessions = (demo.sessions || []).map((session) => ({
    id: session.id,
    title: session.session_title,
    starts_at: session.start_at,
    ends_at: session.end_at,
    session_type: session.session_type,
    track: session.track,
    speaker: session.speaker,
    moderator: session.moderator,
    room: session.room
  }));
  return {
    id: 'demo-event',
    slug: 'demo-event',
    title: demo.program.program_title,
    organizer: demo.program.organizer_display_name || demo.program.organizer_name,
    city: demo.program.city,
    venue: demo.program.venue,
    venue_address: demo.program.venue_address,
    category: 'technology training',
    summary: 'نموذج فعالية حي يوضح تجربة EventLive عند وصول الزائر: الجلسة الحالية، التالية، القاعة، ومعلومات الوصول.',
    starts_at: demo.program.event_start,
    ends_at: demo.program.event_end,
    updated_at: demo.program.updated_at,
    sessions,
    live_updates: Array.isArray(demo.live_updates) ? demo.live_updates : [],
    sessions_count: sessions.length,
    tracks_count: unique(sessions.map((session) => session.track)).length,
    rooms_count: unique(sessions.map((session) => session.room)).length,
    live_updates_count: (demo.live_updates || []).length,
    linked_live_updates_count: (demo.live_updates || []).length,
    source_label: demo.program.source_label,
    source_url: siteUrl,
    evidence_url: siteUrl,
    source_confidence: 'approved-source',
    approval_status: 'published',
    published_by: 'EventLive Operations',
    live_schedule_ready: true,
    audiences: ['tech', 'professionals', 'general'],
    tags: ['live-schedule', 'technology', 'government'],
    maps_url: demo.program.maps_url,
    directions_url: demo.program.directions_url,
    parking_note: demo.program.parking_note,
    gate_label: demo.program.gate_label,
    check_in_note: demo.program.check_in_note,
    arrival_note: demo.program.arrival_note,
    public_transport_note: demo.program.public_transport_note,
    richness_score: 8
  };
}

function enrichEventSummary(summary, event) {
  const clean = String(summary || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length >= 120) return clean;
  const parts = [
    clean,
    `${event.title} ضمن ${event.category_label || 'فعاليات السعودية'} في ${event.city_label || cityLabel(event.city)}.`,
    `تبدأ الفعالية ${formatDate(event.starts_at)} وتنتهي ${formatDate(event.ends_at)} حسب البيانات المتاحة.`,
    event.live_schedule_ready
      ? 'تتوفر لها صفحة جدول حي تساعد الزائر على متابعة الحالة والوقت أثناء الحضور.'
      : 'تعرض الصفحة وقت الفعالية وموقعها ومصدرها وروابط التقويم والاتجاهات عند توفرها.',
    event.source_label ? `المصدر: ${event.source_label}.` : ''
  ].filter(Boolean);
  return unique(parts).join(' ').slice(0, 520);
}

function hasValidDateRange(startsAt, endsAt) {
  const start = Date.parse(startsAt || '');
  const end = Date.parse(endsAt || '');
  return Number.isFinite(start) && Number.isFinite(end) && end >= start;
}

function attendanceWindowForEvent(event = {}) {
  if (!hasValidDateRange(event.starts_at, event.ends_at)) return null;
  return {
    title: 'نافذة الحضور',
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    room: event.venue || event.venue_address || event.city_label || cityLabel(event.city),
    track: event.event_kind === 'program' ? 'برنامج ممتد' : 'الفعالية الرئيسية',
    session_type: 'attendance-window',
    inferred: true,
    source: 'event-start-end'
  };
}

function isInferredAttendanceWindow(session = {}) {
  return ['attendance-window', 'opening-hours'].includes(session.session_type)
    || session.source === 'event-start-end'
    || session.inferred === true;
}

function detailedSessionsFrom(value) {
  return Array.isArray(value) ? value.filter((session) => !isInferredAttendanceWindow(session)) : [];
}

function sourceTrustProfile(raw = {}, previous = {}) {
  const sourceLabel = raw.source_label || raw.source_owner || previous.source_label || '';
  const registered = registeredSourcesByName.get(normalizeArabicSearch(sourceLabel));
  const confidence = String(raw.source_confidence || raw.confidence || previous.source_confidence || '').toLowerCase();
  const sourceTrust = registered?.trust_level || '';
  let tier = 'corroborated';
  let label = 'مؤكد بأدلة متعددة';
  if (/organizer-confirmed/.test(confidence)) {
    tier = 'organizer-confirmed';
    label = 'مؤكد من المنظم';
  } else if (sourceTrust === 'official') {
    tier = 'official';
    label = 'مصدر حكومي أو رسمي';
  } else if (sourceTrust === 'venue-official') {
    tier = 'official-venue';
    label = 'مصدر المكان الرسمي';
  } else if (sourceTrust === 'official-marketplace') {
    tier = 'official-marketplace';
    label = 'منصة حجز رسمية';
  } else if (sourceTrust === 'partner' || /partner/.test(confidence)) {
    tier = 'partner';
    label = 'مصدر شريك';
  } else if (/approved|official/.test(confidence)) {
    tier = 'approved-source';
    label = 'مصدر معتمد';
  }
  const verifiedAt = raw.verified_at || raw.updated_at || raw.collected_at || previous.verified_at || previous.updated_at || buildAt;
  const verifiedMs = Date.parse(verifiedAt);
  const freshnessHours = Number.isFinite(verifiedMs) ? Math.max(0, Math.floor((Date.parse(buildAt) - verifiedMs) / 3600000)) : null;
  return {
    trust_tier: tier,
    trust_label: label,
    verified_at: verifiedAt,
    verification_method: raw.verification_method || previous.verification_method || (registered ? `registered-${sourceTrust}` : 'approved-source-evidence'),
    freshness_hours: freshnessHours
  };
}

function normalizeEvent(raw, sourceGroup, previousLookup) {
  const previous = previousLookup.byId.get(raw.id) || previousLookup.byIdentity.get(eventIdentity(raw)) || {};
  const sourceCity = raw.city || previous.city || raw.venue || raw.venue_address || 'Saudi Arabia';
  const normalizedCity = normalizeSaudiCity(sourceCity, sourceCity || 'Saudi Arabia');
  const slug = raw.slug || previous.slug || slugify(raw.title || raw.id);
  const fileSlug = raw.file_slug || raw.id || previous.file_slug || slug;
  const category = raw.category || previous.category || 'general-events';
  const catSlug = categorySlug(category, raw);
  const kind = classifyEventKind({ ...raw, event_kind: raw.event_kind || previous.event_kind });
  const status = sourceGroup === 'ended'
    ? { key: 'ended', label: 'منتهية' }
    : getEventStatus(raw.starts_at, raw.ends_at, Date.now(), kind);
  const audiences = classifyAudiences({ ...previous, ...raw });
  const rawSessions = detailedSessionsFrom(raw.sessions);
  const previousSessions = detailedSessionsFrom(previous.sessions);
  const sessions = rawSessions.length ? rawSessions : previousSessions;
  const trustProfile = sourceTrustProfile(raw, previous);
  const venueLocation = resolveVenueLocation({
    ...previous,
    ...raw,
    city: normalizedCity,
    venue: raw.venue || previous.venue || normalizedCity,
    venue_address: raw.venue_address || previous.venue_address || raw.venue || normalizedCity
  }, venueRegistry);
  const venueCoordinates = coordinatesQuery(venueLocation);
  const detailUrl = `./events/${fileSlug}.html`;
  const originalImage = remoteImageCandidate(raw.original_image_url, raw.image_url, raw.image, previous.original_image_url, previous.image_url);
  const imageUrl = localizeEventImage(raw.cached_image_url || previous.cached_image_url || raw.image_url || raw.image || previous.image_url || '');
  const event = {
    ...previous,
    ...raw,
    id: raw.id || previous.id || fileSlug,
    file_slug: fileSlug,
    slug,
    title: raw.title || previous.title || 'فعالية بدون عنوان',
    organizer: raw.organizer || raw.source_owner || previous.organizer || 'جهة منظمة',
    city: normalizedCity,
    city_label: cityLabel(normalizedCity),
    venue: raw.venue || previous.venue || normalizedCity,
    venue_address: raw.venue_address || previous.venue_address || raw.venue || normalizedCity,
    category,
    category_slug: catSlug,
    category_label: categoryLabel(catSlug, category),
    summary: raw.summary || previous.summary || 'تفاصيل الفعالية محفوظة من مصدرها المعتمد ليستخدمها الزائر قبل وأثناء وبعد وقت الفعالية.',
    starts_at: raw.starts_at || previous.starts_at,
    ends_at: raw.ends_at || previous.ends_at,
    updated_at: raw.updated_at || raw.collected_at || previous.updated_at || buildAt,
    sessions,
    sessions_count: Math.max(Number(raw.sessions_count ?? previous.sessions_count ?? 0), sessions.length),
    tracks_count: Math.max(Number(raw.tracks_count ?? previous.tracks_count ?? 0), unique(sessions.map((session) => session.track).filter(Boolean)).length),
    rooms_count: Math.max(Number(raw.rooms_count ?? previous.rooms_count ?? 0), unique(sessions.map((session) => session.room).filter(Boolean)).length),
    live_updates_count: Number(raw.live_updates_count ?? previous.live_updates_count ?? 0),
    linked_live_updates_count: Number(raw.linked_live_updates_count ?? previous.linked_live_updates_count ?? raw.live_updates_count ?? 0),
    source_label: raw.source_label || raw.source_owner || previous.source_label || 'مصدر موثوق',
    source_url: raw.source_url || previous.source_url || '',
    evidence_url: raw.evidence_url || raw.source_url || previous.evidence_url || previous.source_url || '',
    source_confidence: raw.source_confidence || raw.confidence || previous.source_confidence || 'approved-source',
    ...trustProfile,
    approval_status: raw.approval_status || previous.approval_status || (sourceGroup === 'ended' ? 'reviewed' : 'published'),
    approval_status_label: raw.approval_status_label || previous.approval_status_label || (sourceGroup === 'ended' ? 'تمت المراجعة' : 'منشورة'),
    published_by: raw.published_by || previous.published_by || 'EventLive Auto Publisher',
    live_schedule_ready: sessions.length > 0,
    event_kind: kind,
    event_kind_label: eventKindLabel(kind),
    status: status.key,
    status_label: status.label,
    image_url: imageUrl,
    image_alt: raw.image_alt || previous.image_alt || raw.title || previous.title || '',
    image_source_url: raw.image_source_url || raw.source_url || previous.image_source_url || previous.source_url || '',
    original_image_url: originalImage,
    tags: unique([...(Array.isArray(raw.tags) ? raw.tags : []), ...(sourceGroup === 'ended' ? ['ended-event'] : [])]),
    audiences,
    audience_labels: audienceObjects(audiences),
    audience_urls: audiences.map((audience) => `./for/${audience}.html`),
    detail_url: detailUrl,
    url: detailUrl,
    share_url: detailUrl,
    print_url: `./print.html?event=${encodeURIComponent(fileSlug)}`,
    ics_url: `./events/${fileSlug}.ics`,
    city_url: `./cities/${citySlug(normalizedCity)}.html`,
    category_url: `./categories/${catSlug}.html`,
    latitude: venueLocation?.latitude,
    longitude: venueLocation?.longitude,
    location_precision: venueLocation?.precision || '',
    location_verification_method: venueLocation?.verification_method || '',
    location_verified_at: venueLocation?.verified_at || '',
    location_evidence_url: venueLocation?.evidence_url || '',
    location_registry_id: venueLocation?.registry_id || '',
    maps_url: venueCoordinates
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueCoordinates)}`
      : raw.maps_url || previous.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${raw.venue || normalizedCity} ${normalizedCity}`)}`,
    directions_url: venueCoordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venueCoordinates)}`
      : raw.directions_url || previous.directions_url || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${raw.venue || normalizedCity} ${normalizedCity}`)}`,
    catalog_group: sourceGroup,
    richness_score: Number(raw.richness_score ?? previous.richness_score ?? 3)
  };
  if (isOnlineEvent(event)) {
    event.city = 'Online';
    event.city_label = cityLabel('Online');
    event.venue = event.venue || 'عن بعد';
    event.venue_address = event.venue_address || event.venue;
    event.maps_url = '';
    event.directions_url = '';
    event.city_url = `./cities/${citySlug('Online')}.html`;
  }
  const hasDetailedSessions = Array.isArray(event.sessions) && event.sessions.length > 0;
  const attendanceWindow = attendanceWindowForEvent(event);
  event.attendance_window = attendanceWindow;
  event.attendance_window_ready = Boolean(attendanceWindow);
  event.schedule_quality = hasDetailedSessions
    ? 'detailed'
    : attendanceWindow ? 'basic-window' : 'missing';
  if (!hasDetailedSessions && attendanceWindow) {
    event.sessions = [attendanceWindow];
    event.sessions_count = 1;
    event.tracks_count = 1;
    event.rooms_count = attendanceWindow.room ? 1 : 0;
  }
  event.official_sessions_count = hasDetailedSessions ? event.sessions.length : 0;
  event.agenda_ready = event.official_sessions_count >= 2;
  event.schedule_depth = event.agenda_ready
    ? 'multi-session-agenda'
    : event.official_sessions_count === 1
      ? 'official-single-session'
      : attendanceWindow
        ? 'attendance-window'
        : 'missing';
  event.live_schedule_ready = event.official_sessions_count > 0;
  event.summary = enrichEventSummary(event.summary, event);
  if (!event.image_url || String(event.image_url).startsWith('/assets/event-covers/')) {
    event.image_url = fallbackCover(event);
    event.image_alt = `غلاف EventLive لفعالية ${event.title}`;
    event.generated_image = true;
  } else {
    event.generated_image = false;
  }
  return event;
}

function isPublicLaunchRecord(raw, sourceGroup) {
  if (sourceGroup === 'demo') return includeDemoEvent;
  if (sourceGroup === 'ended') return true;
  const label = String(raw.source_label || raw.source_owner || '');
  const confidence = String(raw.source_confidence || raw.confidence || '');
  if (/EventLive التجريبي/.test(label)) return false;
  if (/sample-record|needs-source-evidence|needs-organizer-confirmation/.test(confidence)) return false;
  return true;
}

function buildEvents() {
  const previousLookup = loadPreviousEvents();
  const catalog = readJson('data/events_catalog.json', { events: [] }).events || [];
  const ended = readJson('data/source_ended_events.json', { ended_events: [] }).ended_events || [];
  const demoEvent = includeDemoEvent ? makeDemoEvent(readJson('data/demo_program.json', {})) : null;
  const rawEvents = [
    ...catalog.map((event) => [event, 'catalog']),
    ...ended.map((event) => [event, 'ended']),
    ...(demoEvent ? [[demoEvent, 'demo']] : [])
  ];
  const seenIds = new Set();
  const seenSemantic = new Set();
  const seenSourceIdentity = new Set();
  const events = [];
  let excludedDraftLikeRecords = 0;
  const excludedPublicSlugs = includeDemoEvent ? [] : ['demo-event'];
  for (const [raw, sourceGroup] of rawEvents) {
    if (!isPublicLaunchRecord(raw, sourceGroup)) {
      excludedDraftLikeRecords += 1;
      excludedPublicSlugs.push(raw.file_slug || raw.slug || raw.id || slugify(raw.title || 'event'));
      continue;
    }
    const event = normalizeEvent(raw, sourceGroup, previousLookup);
    const idKey = event.id || eventIdentity(event);
    const semanticKey = [
      normalizeArabicSearch(event.title),
      normalizeSaudiCity(event.city, event.city),
      event.starts_at,
      event.ends_at,
      normalizeArabicSearch(event.source_label || event.organizer)
    ].join('|');
    let sourceIdentityKey = '';
    const sourceIdentityUrl = event.source_url || event.evidence_url || '';
    const isMultiEventDocument = /\.(?:pdf|csv|xlsx?|ics)(?:$|[?#])/i.test(sourceIdentityUrl);
    try {
      const sourceUrl = new URL(isMultiEventDocument ? '' : sourceIdentityUrl);
      const stableParams = [...sourceUrl.searchParams.entries()]
        .filter(([key, value]) => /^(?:id|eventid|itemid|event|programid|courseid|bootcampid|circular)$/i.test(key) && value)
        .sort(([a], [b]) => a.localeCompare(b));
      const pathParts = sourceUrl.pathname.split('/').filter(Boolean);
      if (/^(?:ar|en)$/i.test(pathParts[0])) pathParts.shift();
      const genericTail = new Set(['event', 'events', 'calendar', 'program', 'programs', 'bootcamp', 'bootcamps', 'course', 'courses', 'workshop', 'workshops']);
      if (pathParts.length >= 2 && !genericTail.has(pathParts.at(-1)?.toLowerCase())) {
        sourceIdentityKey = `${sourceUrl.hostname}/${pathParts.join('/')}`.replace(/\/+$/g, '').toLowerCase();
        if (stableParams.length) sourceIdentityKey += `?${new URLSearchParams(stableParams).toString().toLowerCase()}`;
      }
    } catch {
      sourceIdentityKey = '';
    }
    if (seenIds.has(idKey) || seenSemantic.has(semanticKey) || (sourceIdentityKey && seenSourceIdentity.has(sourceIdentityKey))) continue;
    seenIds.add(idKey);
    seenSemantic.add(semanticKey);
    if (sourceIdentityKey) seenSourceIdentity.add(sourceIdentityKey);
    events.push(event);
  }
  const sortedEvents = events.sort((a, b) => {
    const aTime = dateValue(a.starts_at)?.getTime() || 0;
    const bTime = dateValue(b.starts_at)?.getTime() || 0;
    if (a.status === 'ended' && b.status !== 'ended') return 1;
    if (a.status !== 'ended' && b.status === 'ended') return -1;
    return a.status === 'ended' ? bTime - aTime : aTime - bTime;
  });
  sortedEvents.excludedDraftLikeRecords = excludedDraftLikeRecords;
  sortedEvents.excludedPublicSlugs = excludedPublicSlugs;
  return sortedEvents;
}

function jsonLd(value) {
  return `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
}

function seoDescription(value = '') {
  const clean = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  const suffix = ' EventLive يعرض الوقت الحي، المدينة، الموقع، المصدر، روابط التقويم والاتجاهات لتجربة حضور أوضح في فعاليات السعودية.';
  if (!clean) return suffix.trim();
  if (clean.length >= 110) return clean;
  return `${clean}${suffix}`.slice(0, 300);
}

function platformWebSiteJsonLd() {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: platformName,
    alternateName: ['EventLive Saudi Events', 'فعاليات السعودية الحية'],
    url: siteUrl,
    inLanguage: 'ar-SA',
    publisher: { '@type': 'Organization', name: platformName, url: siteUrl },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/events.html?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  });
}

function baseHead({ title, description, canonical, image, manifestHref = './manifest.webmanifest', type = 'website', imageAlt = '', noindex = false }) {
  const shareImage = image || publicAssetUrl('/assets/eventlive-hero.png');
  const metaDescription = seoDescription(description);
  const safeImageAlt = imageAlt || title;
  const resourcePrefix = manifestHref.replace(/manifest\.webmanifest.*$/, '') || './';
  return `<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}" />
  <meta name="application-name" content="${platformName}" />
  <meta name="author" content="${platformName}" />
  <meta name="publisher" content="${platformName}" />
  <meta name="theme-color" content="#0d6b52" />
  <meta name="color-scheme" content="light" />
  <link rel="icon" type="image/svg+xml" href="${escapeHtml(`${resourcePrefix}favicon.svg`)}" />
  ${noindex ? '<meta name="robots" content="noindex,nofollow" />' : '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />'}
  <link rel="canonical" href="${canonical}" />
  <link rel="alternate" hreflang="ar-SA" href="${canonical}" />
  <link rel="alternate" hreflang="x-default" href="${canonical}" />
  <link rel="manifest" href="${escapeHtml(manifestHref)}" />
  <link rel="alternate" type="text/calendar" title="EventLive - تقويم الفعاليات" href="${escapeHtml(`${resourcePrefix}events.ics`)}" />
  <link rel="alternate" type="application/rss+xml" title="EventLive - RSS" href="${escapeHtml(`${resourcePrefix}feeds/all.xml`)}" />
  <link rel="alternate" type="application/feed+json" title="EventLive - JSON Feed" href="${escapeHtml(`${resourcePrefix}feeds/all.json`)}" />
  <meta property="og:site_name" content="EventLive" />
  <meta property="og:locale" content="ar_SA" />
  <meta property="og:type" content="${escapeHtml(type)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(metaDescription)}" />
  <meta property="og:image" content="${escapeHtml(shareImage)}" />
  <meta property="og:image:alt" content="${escapeHtml(safeImageAlt)}" />
  <meta property="og:updated_time" content="${escapeHtml(buildAt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(shareImage)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(safeImageAlt)}" />
  ${platformWebSiteJsonLd()}`;
}

function analyticsHeadSnippet() {
  return `<!-- Privacy-friendly analytics by Plausible -->
<script async src="https://plausible.io/js/pa-BwvEgusGCTTM9Ak8D0dKB.js"></script>
<script>
  window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()
</script>`;
}

function analyticsRuntimeScript() {
  return `<script id="eventlive-analytics-runtime">
(function () {
  var ownerOnlyPattern = /\\/(sources|methodology|trust|source-health|candidates|resolver|owner-status)\\.html$|\\/(events|sources|trust|methodology|readiness|source-coverage-gaps|regions|owner-status)\\.json$/;
  var path = window.location.pathname || '';
  if (ownerOnlyPattern.test(path)) {
    window.eventLiveTrack = function () {};
    return;
  }

  function clean(value) {
    return String(value || '').replace(/\\s+/g, ' ').trim().slice(0, 160);
  }

  function payload(extra) {
    return Object.assign({
      path: path,
      title: clean(document.title),
      referrer_host: document.referrer ? (new URL(document.referrer, window.location.href)).host : ''
    }, extra || {});
  }

  window.eventLiveTrack = function (name, props) {
    var eventName = clean(name || '');
    if (!eventName) return;
    var eventProps = payload(props);
    try {
      if (typeof window.plausible === 'function') {
        window.plausible(eventName, { props: eventProps });
        return;
      }
      if (typeof window.umami === 'object' && typeof window.umami.track === 'function') {
        window.umami.track(eventName, eventProps);
        return;
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, eventProps);
      }
    } catch (error) {
      if (window.console && window.console.debug) window.console.debug('EventLive analytics skipped', error);
    }
  };

  window.eventLiveTrack('page_view', {
    page_kind: document.body?.dataset?.pageKind || path.split('/').filter(Boolean).pop() || 'home'
  });

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('a,button,[data-analytics-event]') : null;
    if (!target) return;
    var explicit = target.getAttribute('data-analytics-event');
    var href = target.getAttribute('href') || '';
    var text = clean(target.textContent);
    var name = explicit || '';
    if (!name && /\\.ics(?:$|\\?)/.test(href)) name = 'calendar_downloaded';
    if (!name && /google\\.com\\/maps|maps\\.apple\\.com|directions/i.test(href)) name = 'directions_clicked';
    if (!name && /\\/events\\//.test(href)) name = 'event_opened';
    if (!name && /\\/cities\\//.test(href)) name = 'city_filter_used';
    if (!name && /\\/categories\\//.test(href)) name = 'category_filter_used';
    if (!name && /\\/for\\//.test(href)) name = 'audience_filter_used';
    if (!name && /screen\\.html/.test(href)) name = 'live_screen_opened';
    if (!name && /share\\.html/.test(href)) name = 'share_clicked';
    if (!name && /organizer/.test(href + ' ' + text)) name = 'organizer_cta_clicked';
    if (!name && /today/.test(href)) name = 'today_opened';
    if (!name && /this-week/.test(href)) name = 'this_week_opened';
    if (!name && /source|evidence|visitsaudi|gea|moc|tuwaiq|mcit|mdlbeast|experiencealula/i.test(href)) name = 'source_clicked';
    if (!name) return;
    window.eventLiveTrack(name, { href: href, label: text });
  }, { capture: true });

  var searchTimer = null;
  document.addEventListener('input', function (event) {
    var target = event.target;
    if (!target || !/search|q|query/i.test(target.getAttribute('type') || target.getAttribute('name') || target.getAttribute('placeholder') || '')) return;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () {
      window.eventLiveTrack('search_used', { query_length: clean(target.value).length });
    }, 700);
  }, { passive: true });

  window.addEventListener('storage', function (event) {
    if (/saved|eventlive-saved-events/i.test(event.key || '')) {
      window.eventLiveTrack('saved_event', { storage_key: event.key || '' });
    }
  });
})();
</script>`;
}

function header(relativePrefix = './') {
  const mobileLinks = `<nav aria-label="قائمة الجوال"><a href="${relativePrefix}events.html">كل الفعاليات</a><a href="${relativePrefix}today-events.html">فعاليات اليوم</a><a href="${relativePrefix}this-month.html">هذا الشهر</a><a href="${relativePrefix}cities.html">المدن</a><a href="${relativePrefix}categories.html">التصنيفات</a><a href="${relativePrefix}audiences.html">الجمهور</a><a href="${relativePrefix}organizers.html">للمنظمين</a><a href="${relativePrefix}organizer-intake.html">إضافة فعالية</a></nav>`;
  return `<header class="topbar"><div class="wrap nav"><a class="brand" href="${relativePrefix}index.html"><span class="brand-mark">EL</span><b>${brandVisual}</b></a><nav class="nav-links" aria-label="روابط رئيسية"><a href="${relativePrefix}events.html">كل الفعاليات</a><a href="${relativePrefix}today-events.html">اليوم</a><a href="${relativePrefix}this-month.html">هذا الشهر</a><a href="${relativePrefix}cities.html">المدن</a><a href="${relativePrefix}categories.html">التصنيفات</a><a href="${relativePrefix}audiences.html">الجمهور</a><a href="${relativePrefix}organizers.html">للمنظمين</a><a href="${relativePrefix}organizer-intake.html">إضافة فعالية</a></nav><details class="mobile-site-menu"><summary aria-label="فتح قائمة التنقل">☰</summary>${mobileLinks}</details><a class="cta" href="${relativePrefix}today.html"><span class="live-dot"></span> الآن</a></div></header>`;
}

function footer(relativePrefix = './') {
  return `<footer class="footer"><div class="wrap">EventLive يبقي الدومين الرسمي ${platformDomain} ويربط كل فعالية بمصدرها قدر الإمكان. آخر بناء: ${formatDate(buildAt)}<div class="footer-links"><a href="${relativePrefix}privacy.html">الخصوصية</a><a href="${relativePrefix}terms.html">الشروط</a><a href="${relativePrefix}source-rights.html">حقوق المصادر</a></div></div></footer>`;
}

function hideOwnerOnlyPublicLinks(html) {
  return String(html)
    .replace(/<a\b[^>]*href=(["'])(?:\.\.\/|\.\/)?(?:sources|methodology|trust)\.html\1[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<a\b[^>]*href=(["'])(?:\.\.\/|\.\/)?events\.json\1[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<a href="\.\/sources\.html">المصادر<\/a>/g, '')
    .replace(/<a href="\.\/methodology\.html">المنهجية<\/a>/g, '')
    .replace(/<a href="\.\/methodology\.html">منهجية الجمع والنشر<\/a>\s*·\s*/g, '')
    .replace(/\s*·\s*<a href="\.\/sources\.html">المصادر<\/a>/g, '')
    .replace(/<a href="\.\.\/sources\.html">المصادر<\/a>/g, '')
    .replace(/<a href="\.\.\/methodology\.html">المنهجية<\/a>/g, '')
    .replace(/<a href="\.\.\/methodology\.html">منهجية الجمع والنشر<\/a>\s*·\s*/g, '')
    .replace(/\s*·\s*<a href="\.\.\/sources\.html">المصادر<\/a>/g, '');
}

function isOwnerOnlyPage(filePath) {
  const relativePath = path.relative(distDir, filePath).replace(/\\/g, '/');
  const pageName = path.basename(String(filePath));
  const ownerOnlyPages = new Set(['sources.html', 'methodology.html', 'trust.html', 'candidates.html', 'resolver.html', 'source-health.html', 'owner-status.html']);
  return ownerOnlyPages.has(relativePath) || ownerOnlyPages.has(pageName);
}

function runtimeAttrs(event) {
  return `data-start="${escapeHtml(event.starts_at || '')}" data-end="${escapeHtml(event.ends_at || event.starts_at || '')}" data-kind="${escapeHtml(event.event_kind || 'moment')}"`;
}

function liveRuntimeScript() {
  return `<script>
(function () {
  function clampHours(value) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
  }
  function t(value) {
    var date = new Date(value || '');
    var time = date.getTime();
    return Number.isFinite(time) ? time : null;
  }
  function inTemporalWindow(startMs, endMs, now, windowHours) {
    if (!Number.isFinite(startMs) || windowHours <= 0) return true;
    if (endMs && endMs < now) return false;
    var limitMs = now + (windowHours * 60 * 60 * 1000);
    if (startMs >= now && startMs <= limitMs) return true;
    if (startMs <= now) {
      return startMs >= (now - (windowHours * 60 * 60 * 1000));
    }
    return false;
  }
  function enforceTemporalWindow() {
    var section = document.querySelector('[data-temporal-window-hours]');
    if (!section) return;

    var windowHours = clampHours(section.getAttribute('data-temporal-window-hours'));
    if (windowHours <= 0) return;

    var now = Date.now();
    var cards = section.querySelectorAll('.card[data-event-start]');
    var visibleCount = 0;
    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      var start = t(card.getAttribute('data-event-start'));
      var end = t(card.getAttribute('data-event-end')) || start;
      var isAllowed = Number.isFinite(start) && inTemporalWindow(start, end, now, windowHours);
      if (!isAllowed) {
        card.remove();
        continue;
      }
      var stateEl = card.querySelector('[data-runtime-status]');
      if (stateEl && stateEl.textContent === 'منتهية') {
        card.remove();
        continue;
      }
      visibleCount += 1;
    }

    if (!visibleCount) {
      var grid = section.querySelector('.grid');
      if (grid) grid.innerHTML = '<p class=\"empty-state\">لا توجد فعاليات ضمن النطاق المطلوب حاليا.</p>';
    }
  }
  function remaining(ms) {
    var value = Math.max(0, ms || 0);
    var day = Math.floor(value / 86400000);
    var hour = Math.floor((value % 86400000) / 3600000);
    var minute = Math.floor((value % 3600000) / 60000);
    if (day > 0) return day + ' يوم ' + hour + ' ساعة';
    if (hour > 0) return hour + ' ساعة';
    if (minute > 0) return minute + ' دقيقة';
    return 'أقل من دقيقة';
  }
  function runtime(el) {
    var start = t(el.dataset.start);
    var end = t(el.dataset.end) || start;
    var kind = el.dataset.kind || 'moment';
    var now = Date.now();
    if (!start) return { key: 'draft', label: 'وقت غير مؤكد', note: 'وقت غير مؤكد' };
    if (now < start) return { key: 'upcoming', label: 'قادمة', note: 'يبدأ بعد ' + remaining(start - now) };
    if (end && now <= end) {
      if (kind === 'program') return { key: 'ongoing', label: 'برنامج جارٍ', note: 'نافذة البرنامج مفتوحة، ينتهي بعد ' + remaining(end - now) };
      return { key: 'live', label: 'مباشرة الآن', note: 'ينتهي بعد ' + remaining(end - now) };
    }
    return { key: 'ended', label: 'منتهية', note: 'انتهت منذ ' + remaining(now - (end || start)) };
  }
  function applyStatusClass(el, state) {
    ['live', 'ongoing', 'upcoming', 'ended', 'draft'].forEach(function (key) {
      el.classList.remove('status-' + key);
      el.classList.remove('chip-' + key);
    });
    el.classList.add(el.classList.contains('chip') ? 'chip-' + state.key : 'status-' + state.key);
  }
  function updateLiveRuntime() {
    document.querySelectorAll('[data-live-time]').forEach(function (el) {
      el.textContent = runtime(el).note;
    });
    document.querySelectorAll('[data-runtime-status]').forEach(function (el) {
      var state = runtime(el);
      el.textContent = state.label;
      applyStatusClass(el, state);
    });
  }
  window.EventLiveRuntimeClock = { update: updateLiveRuntime };
  updateLiveRuntime();
  setInterval(updateLiveRuntime, 60000);
  enforceTemporalWindow();

  var host = window.location && window.location.hostname ? window.location.hostname.toLowerCase() : '';
  var isLocalHost = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');
  if (isLocalHost && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      registrations.forEach(function (registration) { registration.unregister().catch(function () {}); });
    }).catch(function () {});
    if ('caches' in window) {
      caches.keys().then(function (keys) {
        keys.filter(function (key) { return /^eventlive-/i.test(key); }).forEach(function (key) { caches.delete(key).catch(function () {}); });
      }).catch(function () {});
    }
  }
  if (!isLocalHost && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  }
})();
</script>`;
}

function sessionAgendaScript() {
  return `<script>
(function () {
  var root = document.querySelector('[data-event-agenda]');
  if (!root) return;
  var items = Array.prototype.slice.call(root.querySelectorAll('[data-session-item]'));
  var dayButtons = Array.prototype.slice.call(root.querySelectorAll('[data-agenda-day]'));
  var roomSelect = root.querySelector('[data-agenda-room]');
  var searchInput = root.querySelector('[data-agenda-search]');
  var count = root.querySelector('[data-agenda-count]');
  var nowOutput = root.querySelector('[data-agenda-now]');
  var nextOutput = root.querySelector('[data-agenda-next]');
  var selectedDay = 'all';

  function normalize(value) {
    return String(value || '').toLowerCase().normalize('NFKD')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
  }
  function time(value) {
    var parsed = new Date(value || '').getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  function riyadhDay() {
    var parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return values.year + '-' + values.month + '-' + values.day;
  }
  function setDay(day) {
    selectedDay = day;
    dayButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-agenda-day') === day ? 'true' : 'false');
    });
    applyFilters();
  }
  function applyFilters() {
    var room = roomSelect ? roomSelect.value : 'all';
    var query = normalize(searchInput ? searchInput.value : '');
    var visible = 0;
    items.forEach(function (item) {
      var dayMatch = selectedDay === 'all' || item.getAttribute('data-day') === selectedDay;
      var roomMatch = room === 'all' || item.getAttribute('data-room') === room;
      var searchMatch = !query || normalize(item.getAttribute('data-search')).indexOf(query) !== -1;
      item.hidden = !(dayMatch && roomMatch && searchMatch);
      if (!item.hidden) visible += 1;
    });
    if (count) count.textContent = visible ? visible + ' جلسة ظاهرة' : 'لا توجد جلسات مطابقة';
  }
  function updateStatus() {
    var now = Date.now();
    var active = [];
    var upcoming = [];
    items.forEach(function (item) {
      var start = time(item.getAttribute('data-start'));
      var end = time(item.getAttribute('data-end')) || start;
      var status = item.querySelector('[data-session-status]');
      item.classList.remove('is-live', 'is-ended');
      if (start !== null && end !== null && now >= start && now <= end) {
        item.classList.add('is-live');
        if (status) status.textContent = 'تجري الآن';
        active.push(item);
      } else if (end !== null && now > end) {
        item.classList.add('is-ended');
        if (status) status.textContent = 'انتهت';
      } else {
        if (status) status.textContent = 'قادمة';
        if (start !== null) upcoming.push(item);
      }
    });
    upcoming.sort(function (a, b) { return time(a.getAttribute('data-start')) - time(b.getAttribute('data-start')); });
    if (nowOutput) nowOutput.textContent = active.length ? (active.length > 1 ? active.length + ' جلسات جارية · ' : '') + active[0].querySelector('b').textContent : 'لا توجد جلسة جارية الآن';
    if (nextOutput) nextOutput.textContent = upcoming.length ? upcoming[0].querySelector('b').textContent : 'لا توجد جلسات قادمة';
  }

  dayButtons.forEach(function (button) { button.addEventListener('click', function () { setDay(button.getAttribute('data-agenda-day')); }); });
  if (roomSelect) roomSelect.addEventListener('change', applyFilters);
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (dayButtons.length) {
    var days = dayButtons.map(function (button) { return button.getAttribute('data-agenda-day'); }).filter(function (day) { return day !== 'all'; }).sort();
    var today = riyadhDay();
    var nextAvailableDay = days.find(function (day) { return day >= today; });
    var initial = days.indexOf(today) !== -1 ? today : (nextAvailableDay || days[days.length - 1]);
    setDay(initial || 'all');
  } else {
    applyFilters();
  }
  updateStatus();
  setInterval(updateStatus, 60000);
  window.EventLiveAgenda = { filter: applyFilters, refresh: updateStatus, setDay: setDay };
})();
</script>`;
}

function eventCard(event, prefix = './') {
  const detail = `${prefix}${event.detail_url.replace(/^\.\//, '')}`;
  const image = event.image_url.startsWith('/') ? `${prefix}${event.image_url.slice(1)}` : event.image_url;
  const statusClass = event.status === 'live' ? ' chip-live' : '';
  return `<article class="card" data-event-start="${escapeHtml(event.starts_at || '')}" data-event-end="${escapeHtml(event.ends_at || event.starts_at || '')}" data-event-status="${escapeHtml(event.status || '')}"><img class="cover" src="${escapeHtml(image)}" alt="${escapeHtml(event.image_alt || event.title)}" loading="lazy" /><div class="card-body"><h2 class="title"><a dir="auto" href="${escapeHtml(detail)}">${escapeHtml(event.title)}</a></h2><p>${escapeHtml(event.summary)}</p><div class="meta"><span class="chip${statusClass}" data-runtime-status ${runtimeAttrs(event)}>${escapeHtml(event.status_label)}</span><span class="chip">${escapeHtml(formatDate(event.starts_at))}</span><span class="chip" data-live-time ${runtimeAttrs(event)}>جاري حساب الوقت...</span><span class="chip">${escapeHtml(cityLabel(event.city))}</span><span class="chip">${escapeHtml(event.category_label)}</span></div><a class="cta" href="${escapeHtml(detail)}">تفاصيل الحضور</a></div></article>`;
}

function readinessSignals(event) {
  const online = isOnlineEvent(event);
  const signals = [
    ['وقت واضح', Boolean(event.starts_at && event.ends_at)],
    [`مصدر موثوق · ${event.trust_label || 'مصدر معتمد'}`, Boolean(event.evidence_url || event.source_url)],
    ['مدينة محددة', Boolean(event.city && event.city !== 'Saudi Arabia')],
    [online ? 'رابط حضور' : 'موقع قابل للوصول', online ? Boolean(event.source_url || event.evidence_url) : Boolean(event.venue || event.maps_url)],
    [event.agenda_ready ? 'أجندة متعددة الجلسات' : 'جلسة رسمية', Boolean(event.live_schedule_ready)],
    ['رابط مشاركة', Boolean(event.share_url)],
    ['تصنيف مفهوم', Boolean(event.category_label)],
    ['جمهور مناسب', Boolean(event.audience_labels?.length)]
  ];
  return signals.map(([label, ok]) => `<div class="signal-check ${ok ? 'good' : 'warn'}"><b>${ok ? 'جاهز' : 'بحاجة إثراء'}</b><span>${label}</span></div>`).join('');
}

function eventLocationJsonLd(event, canonical) {
  if (isOnlineEvent(event)) {
    return {
      '@type': 'VirtualLocation',
      name: event.venue || 'عن بعد',
      url: event.source_url || event.evidence_url || canonical
    };
  }
  const region = saudiRegions.find(([, , cities]) => cities.includes(event.city));
  const latitude = Number(event.latitude ?? event.lat);
  const longitude = Number(event.longitude ?? event.lng ?? event.lon);
  return {
    '@type': 'Place',
    name: event.venue,
    address: {
      '@type': 'PostalAddress',
      streetAddress: event.venue_address || event.venue,
      addressLocality: cityLabel(event.city),
      addressRegion: region?.[1],
      addressCountry: 'SA'
    },
    geo: Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { '@type': 'GeoCoordinates', latitude, longitude }
      : undefined
  };
}

function eventKeywords(event = {}) {
  return unique([
    event.title,
    event.category_label,
    event.category,
    event.event_kind_label,
    event.status_label,
    event.city_label || cityLabel(event.city),
    event.venue,
    event.source_label,
    ...(event.tags || []),
    ...(event.audience_labels || []).map((audience) => audience.label || audience.label_ar || audience.slug)
  ]).slice(0, 28);
}

function eventAudienceJsonLd(event = {}) {
  const labels = event.audience_labels?.length
    ? event.audience_labels.map((audience) => audience.label || audience.label_ar || audience.slug)
    : ['الجمهور العام'];
  return labels.filter(Boolean).map((label) => ({ '@type': 'Audience', audienceType: label }));
}

function eventOfferJsonLd(event = {}, canonical = '') {
  const url = event.ticket_url || event.registration_url || event.source_url || event.evidence_url || canonical;
  if (!url) return undefined;
  const priceText = String(event.price_label || '').trim();
  const free = /مجاني|free|بدون رسوم/i.test(priceText);
  return {
    '@type': 'Offer',
    url,
    availability: 'https://schema.org/InStock',
    price: free ? '0' : undefined,
    priceCurrency: free ? 'SAR' : undefined,
    category: priceText || (event.registration_url ? 'Registration' : 'Event access')
  };
}

function eventPublicJson(event = {}, canonical = '', schemaImage = '') {
  const online = isOnlineEvent(event);
  return {
    id: event.id,
    title: event.title,
    summary: event.summary,
    canonical_url: canonical,
    detail_url: event.detail_url,
    calendar_url: event.ics_url,
    source_label: event.source_label,
    source_url: event.source_url,
    evidence_url: event.evidence_url,
    trust_tier: event.trust_tier,
    trust_label: event.trust_label,
    verified_at: event.verified_at,
    verification_method: event.verification_method,
    freshness_hours: event.freshness_hours,
    city: event.city_label || cityLabel(event.city),
    venue: event.venue,
    venue_address: event.venue_address,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    status: event.status,
    status_label: event.status_label,
    event_kind: event.event_kind,
    event_kind_label: event.event_kind_label,
    attendance_mode: online ? 'online' : 'in_person',
    live_schedule_ready: Boolean(event.live_schedule_ready),
    agenda_ready: Boolean(event.agenda_ready),
    official_sessions_count: Number(event.official_sessions_count || 0),
    schedule_depth: event.schedule_depth,
    schedule_quality: event.schedule_quality,
    image_url: publicAssetUrl(event.image_url),
    image_alt: event.image_alt || event.title,
    category: event.category_label || event.category,
    category_url: event.category_url,
    audiences: event.audience_labels || [],
    keywords: eventKeywords(event),
    sessions: (event.sessions || []).map((session, index) => ({
      title: session.title || session.session_title || 'جلسة',
      starts_at: session.starts_at || session.start_at || event.starts_at,
      ends_at: session.ends_at || session.end_at || event.ends_at,
      room: session.room || session.track || event.venue || '',
      anchor: `#${sessionAnchor(session, index)}`
    })),
    schema_org: {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      startDate: event.starts_at,
      endDate: event.ends_at,
      eventStatus: event.status === 'ended' ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
      eventAttendanceMode: online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
      location: eventLocationJsonLd(event, canonical),
      organizer: { '@type': 'Organization', name: event.organizer },
      image: schemaImage ? [schemaImage] : undefined,
      description: event.summary,
      url: canonical,
      mainEntityOfPage: canonical,
      isAccessibleForFree: /مجاني|free|بدون رسوم/i.test(String(event.price_label || '')),
      keywords: eventKeywords(event).join(', '),
      audience: eventAudienceJsonLd(event),
      sameAs: unique([event.source_url, event.evidence_url]).filter(Boolean),
      offers: eventOfferJsonLd(event, canonical)
    }
  };
}

function eventDetailActions(event) {
  const actions = [];
  const icsHref = String(event.ics_url || '').replace(/^\.\/events\//, './');
  if (isOnlineEvent(event)) {
    if (event.source_url || event.evidence_url) {
      actions.push(`<a class="cta" href="${escapeHtml(event.source_url || event.evidence_url)}">الدخول أو التسجيل</a>`);
    }
  } else if (event.directions_url) {
    actions.push(`<a class="cta" href="${escapeHtml(event.directions_url)}">الاتجاهات</a>`);
  }
  actions.push(`<a class="cta" href="${escapeHtml(icsHref)}">أضف للتقويم</a>`);
  if (event.status !== 'ended') {
    actions.push(`<button class="cta" type="button" data-attendance-save data-event-id="${escapeHtml(event.id)}">احفظ للحضور</button>`);
    actions.push('<p class="cta-status" data-attendance-status aria-live="polite">يحفظ الصفحة والجدول على هذا الجهاز عند ضعف الشبكة.</p>');
  }
  if (!isOnlineEvent(event) && event.source_url) {
    actions.push(`<a class="cta" href="${escapeHtml(event.source_url)}">المصدر</a>`);
  }
  return actions.join('');
}

function eventQuickActions(event) {
  const actions = [];
  const icsHref = String(event.ics_url || '').replace(/^\.\/events\//, './');
  if (isOnlineEvent(event)) {
    if (event.registration_url || event.ticket_url || event.source_url || event.evidence_url) {
      actions.push(`<a href="${escapeHtml(event.registration_url || event.ticket_url || event.source_url || event.evidence_url)}">الدخول أو التسجيل</a>`);
    }
  } else if (event.directions_url) {
    actions.push(`<a href="${escapeHtml(event.directions_url)}">الاتجاهات</a>`);
  }
  if (icsHref) actions.push(`<a href="${escapeHtml(icsHref)}">أضف للتقويم</a>`);
  return actions.length ? `<nav class="event-quick-actions" aria-label="إجراءات سريعة">${actions.join('')}</nav>` : '';
}

function attendanceModeScript(event, image) {
  if (event.status === 'ended') return '';
  const assets = unique([
    `./${event.file_slug}.html`,
    `./${event.file_slug}.json`,
    `./${event.file_slug}.ics`,
    image
  ]).filter(Boolean);
  return `<script id="eventlive-attendance-mode">
(function () {
  var button = document.querySelector('[data-attendance-save]');
  var status = document.querySelector('[data-attendance-status]');
  if (!button || !status) return;
  var eventId = ${JSON.stringify(event.id)};
  var assets = ${JSON.stringify(assets)};
  var storageKey = 'eventlive-attendance-events';

  function savedEvents() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (error) { return {}; }
  }
  function renderSaved() {
    var saved = savedEvents();
    if (!saved[eventId]) return;
    button.classList.add('is-saved');
    button.textContent = 'محفوظ للحضور';
    status.textContent = 'هذه الفعالية وجدولها محفوظان على هذا الجهاز.';
  }
  function askWorkerToCache() {
    if (!('serviceWorker' in navigator)) return Promise.resolve({ cached: 0 });
    return navigator.serviceWorker.getRegistration().then(function (registration) {
      if (!registration) return { cached: 0 };
      var worker = navigator.serviceWorker.controller || registration.active;
      if (!worker) return { cached: 0 };
      return new Promise(function (resolve) {
        var channel = new MessageChannel();
        var timer = window.setTimeout(function () { resolve({ cached: 0 }); }, 5000);
        channel.port1.onmessage = function (message) {
          window.clearTimeout(timer);
          resolve(message.data || { cached: 0 });
        };
        worker.postMessage({ type: 'CACHE_EVENT_ASSETS', eventId: eventId, assets: assets }, [channel.port2]);
      });
    }).catch(function () { return { cached: 0 }; });
  }

  button.addEventListener('click', function () {
    button.disabled = true;
    status.textContent = 'جاري تجهيز وضع الحضور...';
    askWorkerToCache().then(function (result) {
      var saved = savedEvents();
      saved[eventId] = { savedAt: new Date().toISOString(), path: window.location.pathname, cachedAssets: Number(result.cached || 0) };
      localStorage.setItem(storageKey, JSON.stringify(saved));
      button.disabled = false;
      renderSaved();
      if (typeof window.eventLiveTrack === 'function') {
        window.eventLiveTrack('attendance_mode_saved', { event_id: eventId, cached_assets: Number(result.cached || 0) });
      }
    });
  });
  renderSaved();
})();
</script>`;
}

function sessionAnchor(session = {}, index = 0) {
  return `session-${slugify(session.id || session.title || session.session_title || `item-${index + 1}`)}`;
}

function sessionJsonLd(session = {}, event = {}, index = 0, canonical = '') {
  const sessionTitle = session.title || session.session_title || 'جلسة';
  const room = session.room || session.track || event.venue || '';
  const online = isOnlineEvent(event);
  const physicalLocation = eventLocationJsonLd(event, canonical);
  return {
    '@type': 'Event',
    name: sessionTitle,
    startDate: session.starts_at || session.start_at || event.starts_at,
    endDate: session.ends_at || session.end_at || event.ends_at,
    eventAttendanceMode: online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: event.status === 'ended' ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
    location: online
      ? eventLocationJsonLd(event, canonical)
      : { ...physicalLocation, name: room || event.venue },
    organizer: { '@type': 'Organization', name: event.organizer },
    url: `${canonical}#${sessionAnchor(session, index)}`
  };
}

function officialSessionRows(event = {}) {
  return (event.sessions || []).filter((session) => !isInferredAttendanceWindow(session));
}

function eventBreadcrumbJsonLd(event, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: platformName, item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'كل الفعاليات', item: absoluteUrl('events.html') },
      { '@type': 'ListItem', position: 3, name: event.category_label || 'تصنيف الفعالية', item: absoluteUrl((event.category_url || './events.html').replace(/^\.\//, '')) },
      { '@type': 'ListItem', position: 4, name: event.title, item: canonical }
    ]
  };
}

function eventBreadcrumbHtml(event, relative = '../') {
  const categoryHref = event.category_url ? `${relative}${event.category_url.replace(/^\.\//, '')}` : `${relative}events.html`;
  return `<nav class="breadcrumbs wrap" aria-label="مسار التنقل"><a href="${relative}index.html">EventLive</a><span>/</span><a href="${relative}events.html">كل الفعاليات</a><span>/</span><a href="${escapeHtml(categoryHref)}">${escapeHtml(event.category_label || 'تصنيف الفعالية')}</a><span>/</span><strong>${escapeHtml(event.title)}</strong></nav>`;
}

function eventFaqItems(event) {
  const city = event.city_label || cityLabel(event.city);
  const source = event.source_label || event.organizer || 'المصدر الرسمي';
  const liveSchedule = event.live_schedule_ready
    ? 'نعم، تعرض الصفحة جدولًا حيًا أو جلسات قابلة للمتابعة حسب الوقت.'
    : 'تعرض الصفحة نافذة الحضور الأساسية، ويضاف الجدول التفصيلي عند توفره من المصدر.';
  return [
    {
      question: `متى تبدأ ${event.title}؟`,
      answer: `تبدأ ${event.title} في ${formatDate(event.starts_at)} وتنتهي في ${formatDate(event.ends_at)} بتوقيت السعودية.`
    },
    {
      question: `أين تقام ${event.title}؟`,
      answer: isOnlineEvent(event)
        ? `هذه فعالية عن بعد أو مرتبطة برابط حضور/تسجيل، وتعرض EventLive رابط المصدر عند توفره.`
        : `تقام الفعالية في ${city}${event.venue ? `، ${event.venue}` : ''}.`
    },
    {
      question: 'هل المعلومات موثوقة؟',
      answer: `تعتمد EventLive على ${source} أو رابط دليل ظاهر في صفحة الفعالية، مع إبقاء رابط المصدر للمراجعة.`
    },
    {
      question: 'هل يوجد جدول حي لهذه الفعالية؟',
      answer: liveSchedule
    }
  ];
}

function faqJsonLd(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };
}

function renderFaqSection(items = [], title = 'أسئلة سريعة') {
  if (!items.length) return '';
  return `<section class="section"><div class="wrap"><article class="readiness"><span>إجابات مختصرة</span><h2>${escapeHtml(title)}</h2><div class="grid">${items.map((item) => `<div class="program-check"><b>${escapeHtml(item.question)}</b><p>${escapeHtml(item.answer)}</p></div>`).join('')}</div></article></div></section>`;
}

function formatSessionTime(value) {
  const date = dateValue(value);
  if (!date) return 'وقت غير محدد';
  return new Intl.DateTimeFormat('ar-SA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Riyadh'
  }).format(date);
}

function formatAgendaDay(value) {
  const date = dateValue(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Riyadh'
  }).format(date);
}

function renderEventSessions(event, sessionsTitle, sessionsNote) {
  const rows = Array.isArray(event.sessions) ? event.sessions : [];
  if (!rows.length) return '';
  const detailed = event.schedule_quality !== 'basic-window' && rows.length >= 6;
  const days = unique(rows.map((session) => String(session.starts_at || session.start_at || '').slice(0, 10)).filter(Boolean));
  const rooms = unique(rows.map((session) => session.room).filter(Boolean)).sort((a, b) => a.localeCompare(b));
  const roomFilter = rooms.length ? `<select class="agenda-room" data-agenda-room aria-label="تصفية حسب القاعة"><option value="all">كل القاعات</option>${rooms.map((room) => `<option value="${escapeHtml(room)}">${escapeHtml(room)}</option>`).join('')}</select>` : '';
  const agendaSummary = [`${rows.length} جلسة`, rooms.length ? `${rooms.length} قاعات` : '', 'بتوقيت الرياض'].filter(Boolean).join(' · ');
  const toolbar = detailed
    ? `<div class="agenda-live-summary" aria-live="polite"><div class="agenda-live-item"><span>يجري الآن</span><b data-agenda-now>لا توجد جلسة جارية الآن</b></div><div class="agenda-live-item"><span>التالي</span><b data-agenda-next>يُحدد حسب الوقت الفعلي</b></div></div><div class="agenda-days" aria-label="أيام البرنامج"><button class="agenda-day" type="button" data-agenda-day="all" aria-pressed="false">كل الأيام</button>${days.map((day) => `<button class="agenda-day" type="button" data-agenda-day="${escapeHtml(day)}" aria-pressed="false">${escapeHtml(formatAgendaDay(`${day}T12:00:00+03:00`))}</button>`).join('')}</div><div class="agenda-toolbar${rooms.length ? '' : ' agenda-toolbar-single'}"><input class="agenda-search" type="search" data-agenda-search placeholder="ابحث في الجلسات أو المتحدثين" aria-label="ابحث في جلسات الفعالية">${roomFilter}</div><p class="agenda-count" data-agenda-count>${rows.length} جلسة</p>`
    : '';
  const timeline = rows.map((session, index) => {
    const start = session.starts_at || session.start_at || '';
    const end = session.ends_at || session.end_at || start;
    const day = String(start).slice(0, 10);
    const search = normalizeArabicSearch([session.title, session.session_title, session.speaker, session.room, session.track].filter(Boolean).join(' '));
    const sourceLink = session.source_url ? `<a class="session-source" href="${escapeHtml(session.source_url)}" rel="noopener noreferrer">المصدر الرسمي</a>` : '';
    return `<article class="session" id="${escapeHtml(sessionAnchor(session, index))}" data-session-item data-day="${escapeHtml(day)}" data-room="${escapeHtml(session.room || '')}" data-search="${escapeHtml(search)}" data-start="${escapeHtml(start)}" data-end="${escapeHtml(end)}"><div class="session-top"><div><b>${escapeHtml(session.title || session.session_title || 'جلسة')}</b>${session.speaker ? `<p class="session-speaker">${escapeHtml(session.speaker)}</p>` : ''}</div><time class="session-time" datetime="${escapeHtml(start)}">من ${escapeHtml(formatSessionTime(start))} إلى ${escapeHtml(formatSessionTime(end))}</time></div><div class="meta">${session.room ? `<span class="chip">${escapeHtml(session.room)}</span>` : ''}${session.track ? `<span class="chip">${escapeHtml(session.track)}</span>` : ''}<span class="session-status" data-session-status>قادمة</span>${sourceLink}</div></article>`;
  }).join('');
  return `<section class="section" data-event-agenda><div class="wrap"><div class="agenda-head"><div><span class="eyebrow">برنامج موثق</span><h2>${sessionsTitle}</h2></div>${detailed ? `<p>${agendaSummary}</p>` : ''}</div>${sessionsNote}${toolbar}<div class="timeline">${timeline}</div></div></section>`;
}

function renderEventDetail(event) {
  const relative = '../';
  const description = `${event.title} في ${cityLabel(event.city)}: الوقت، الموقع، المصدر، وحالة الجدول الحي عبر EventLive.`;
  const canonical = absoluteUrl(`events/${event.file_slug}.html`);
  const image = event.image_url.startsWith('/') ? `${relative}${event.image_url.slice(1)}` : event.image_url;
  const schemaImage = publicAssetUrl(event.image_url);
  const jsonHref = `${event.file_slug}.json`;
  const online = isOnlineEvent(event);
  const score = [
    event.starts_at && event.ends_at,
    event.evidence_url || event.source_url,
    event.city && event.city !== 'Saudi Arabia',
    online ? (event.source_url || event.evidence_url) : event.venue,
    event.live_schedule_ready,
    event.image_url,
    event.audience_labels?.length,
    event.category_label
  ].filter(Boolean).length;
  const endedNote = event.status === 'ended' && !event.live_schedule_ready
    ? '<p><strong>فعالية مكتملة محفوظة.</strong> اكتملت هذه الفعالية وتبقى في EventLive كسجل طبيعي مثل أي فعالية كانت منشورة ثم انتهت.</p>'
    : '';
  const sessionsTitle = event.schedule_quality === 'basic-window' ? 'نافذة الحضور' : 'الجدول الحي';
  const sessionsNote = event.schedule_quality === 'basic-window'
    ? '<p class="muted">هذه نافذة حضور أساسية مستنتجة من وقت بداية ونهاية الفعالية. عند توفر البرنامج التفصيلي ستظهر الجلسات والفقرات هنا.</p>'
    : '';
  const officialSessions = officialSessionRows(event);
  const sessions = renderEventSessions(event, sessionsTitle, sessionsNote);
  const outline = event.program_outline || {};
  const outlineLists = [
    ['الأهداف', outline.goals],
    ['المميزات', outline.features],
    ['المتطلبات', outline.requirements]
  ].filter(([, items]) => Array.isArray(items) && items.length);
  const registrationDeadline = outline.registration_deadline || event.registration_deadline || '';
  const programOutline = (outline.official_description || outline.duration_text || registrationDeadline || outlineLists.length)
    ? `<section class="section"><div class="wrap"><article class="readiness" aria-label="محاور البرنامج الرسمية"><span>من المصدر الرسمي</span><h2>محاور البرنامج</h2>${outline.official_description ? `<p>${escapeHtml(outline.official_description)}</p>` : ''}<div class="signal-strip">${outline.duration_text ? `<div class="signal"><span>المدة</span><b>${escapeHtml(outline.duration_text)}</b></div>` : ''}${registrationDeadline ? `<div class="signal"><span>إغلاق التسجيل</span><b>${escapeHtml(formatDate(registrationDeadline))}</b></div>` : ''}${outline.provider ? `<div class="signal"><span>المزود</span><b>${escapeHtml(outline.provider)}</b></div>` : ''}</div><div class="grid">${outlineLists.map(([label, items]) => `<div class="program-check"><b>${escapeHtml(label)}</b><ul>${items.slice(0, 6).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`).join('')}</div></article></div></section>`
    : '';
  const eventFaq = eventFaqItems(event);
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `${event.title} | EventLive`, description, canonical, image: schemaImage, manifestHref: '../manifest.webmanifest', type: 'event', imageAlt: event.image_alt || event.title })}
  <link rel="alternate" type="application/json" title="${escapeHtml(event.title)} - EventLive JSON" href="${escapeHtml(jsonHref)}" />
  <link rel="alternate" type="text/calendar" title="${escapeHtml(event.title)} - EventLive ICS" href="${escapeHtml(`${event.file_slug}.ics`)}" />
  ${pageCss}
  ${agendaCss}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    inLanguage: 'ar-SA',
    name: event.title,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }
  })}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.starts_at,
    endDate: event.ends_at,
    eventStatus: event.status === 'ended' ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location: eventLocationJsonLd(event, canonical),
    organizer: { '@type': 'Organization', name: event.organizer },
    image: schemaImage ? [schemaImage] : undefined,
    description: event.summary,
    url: canonical,
    mainEntityOfPage: canonical,
    isAccessibleForFree: /مجاني|free|بدون رسوم/i.test(String(event.price_label || '')),
    keywords: eventKeywords(event).join(', '),
    audience: eventAudienceJsonLd(event),
    sameAs: unique([event.source_url, event.evidence_url]).filter(Boolean),
    offers: eventOfferJsonLd(event, canonical),
    subEvent: officialSessions.length ? officialSessions.slice(0, 20).map((session, index) => sessionJsonLd(session, event, index, canonical)) : undefined
  })}
  ${jsonLd(eventBreadcrumbJsonLd(event, canonical))}
  ${jsonLd(faqJsonLd(eventFaq))}
</head>
<body class="event-detail">
${header(relative)}
<main>
  ${eventBreadcrumbHtml(event, relative)}
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span><span data-runtime-status ${runtimeAttrs(event)}>${escapeHtml(event.status_label)}</span> · ${escapeHtml(event.event_kind_label)}</span><h1>${escapeHtml(event.title)}</h1><p class="lead">${escapeHtml(event.summary)}</p><div class="signal-strip"><div class="signal"><span>المدينة</span><b>${escapeHtml(cityLabel(event.city))}</b></div><div class="signal"><span>البداية</span><b>${escapeHtml(formatDate(event.starts_at))}</b></div><div class="signal"><span>النهاية</span><b>${escapeHtml(formatDate(event.ends_at))}</b></div><div class="signal"><span>الحالة الحية</span><b data-live-time ${runtimeAttrs(event)}>جاري حساب الوقت...</b></div></div>${eventQuickActions(event)}</div></section>
  <section class="section"><div class="wrap grid"><article class="card"><img class="cover" src="${escapeHtml(image)}" alt="${escapeHtml(event.image_alt || event.title)}" /></article><article class="readiness" aria-label="ملخص جاهزية الحضور"><span>درجة جاهزية الحضور</span><div class="decision-score">${score}/8</div>${endedNote}<div class="signals">${readinessSignals(event)}</div><div class="meta">${eventDetailActions(event)}</div></article></div></section>
  ${renderFaqSection(eventFaq, 'ما يحتاجه الزائر بسرعة')}
  ${programOutline}
  ${sessions}
</main>
${footer(relative)}
${liveRuntimeScript()}
${sessionAgendaScript()}
${attendanceModeScript(event, image)}
</body>
</html>`;
  writeText(path.join(eventsDir, `${event.file_slug}.html`), html);
  writeJson(`events/${event.file_slug}.json`, eventPublicJson(event, canonical, schemaImage));
}

function icsDate(value) {
  const date = dateValue(value) || new Date();
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsText(value = '') {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function renderIcsEvent(event) {
  return [
    'BEGIN:VEVENT',
    `UID:${icsText(event.id)}@${platformDomain}`,
    `DTSTAMP:${icsDate(buildAt)}`,
    `DTSTART:${icsDate(event.starts_at)}`,
    `DTEND:${icsDate(event.ends_at || event.starts_at)}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(event.summary)}`,
    `LOCATION:${icsText(event.venue_address || event.venue || event.city)}`,
    `URL:${absoluteUrl(event.detail_url)}`,
    'END:VEVENT'
  ].join('\n');
}

function calendarText(name, events) {
  const safeName = icsText(name);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `PRODID:-//${platformName}//Saudi Events//AR`,
    `X-WR-CALNAME:${safeName}`,
    'X-WR-TIMEZONE:Asia/Riyadh',
    ...events.map(renderIcsEvent),
    'END:VCALENDAR'
  ].join('\n');
}

function writeCalendar(fullPath, name, events) {
  writeText(fullPath, `${calendarText(name, events)}\n`);
}

function xmlText(value = '') {
  return escapeHtml(value);
}

function rfc822Date(value) {
  const date = dateValue(value) || dateValue(buildAt) || new Date();
  return date.toUTCString();
}

function feedEventUrl(event) {
  return absoluteUrl(event.detail_url);
}

function rssText(name, description, feedPath, events) {
  const items = events.map((event) => `    <item>
      <title>${xmlText(event.title)}</title>
      <link>${xmlText(feedEventUrl(event))}</link>
      <guid isPermaLink="true">${xmlText(feedEventUrl(event))}</guid>
      <description>${xmlText(event.summary)}</description>
      <category>${xmlText(event.category_label || event.category || 'فعاليات')}</category>
      <pubDate>${rfc822Date(event.updated_at || event.starts_at)}</pubDate>
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xmlText(name)}</title>
    <link>${xmlText(siteUrl)}</link>
    <description>${xmlText(description)}</description>
    <language>ar-SA</language>
    <lastBuildDate>${rfc822Date(buildAt)}</lastBuildDate>
    <generator>${xmlText(platformName)}</generator>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${xmlText(absoluteUrl(feedPath))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function jsonFeed(name, description, feedPath, events) {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: name,
    home_page_url: siteUrl,
    feed_url: absoluteUrl(feedPath),
    description,
    language: 'ar-SA',
    authors: [{ name: platformName, url: siteUrl }],
    items: events.map((event) => ({
      id: feedEventUrl(event),
      url: feedEventUrl(event),
      title: event.title,
      content_text: event.summary,
      date_published: event.starts_at || event.updated_at || buildAt,
      date_modified: event.updated_at || buildAt,
      tags: unique([event.city_label || cityLabel(event.city), event.category_label, ...(event.audience_labels || []).map((audience) => audience.label)].filter(Boolean)),
      external_url: event.source_url || event.evidence_url || undefined
    }))
  };
}

function writeRssFeed(fullPath, name, description, feedPath, events) {
  writeText(fullPath, rssText(name, description, feedPath, events));
}

function writeJsonFeed(fullPath, name, description, feedPath, events) {
  writeText(fullPath, `${JSON.stringify(jsonFeed(name, description, feedPath, events), null, 2)}\n`);
}

function writeFeedBundle(slug, name, description, events, manifestRows) {
  const basePath = `feeds/${slug}`;
  writeCalendar(path.join(feedsDir, `${slug}.ics`), name, events);
  writeRssFeed(path.join(feedsDir, `${slug}.xml`), name, description, `./${basePath}.xml`, events);
  writeJsonFeed(path.join(feedsDir, `${slug}.json`), name, description, `./${basePath}.json`, events);
  manifestRows.push({
    slug,
    title: name,
    description,
    count: events.length,
    ics_url: `./${basePath}.ics`,
    rss_url: `./${basePath}.xml`,
    json_url: `./${basePath}.json`
  });
}

function writeIcs(events) {
  const upcoming = events.filter((event) => event.status !== 'ended').slice(0, 200);
  writeCalendar(path.join(distDir, 'events.ics'), `فعاليات السعودية | ${platformName}`, upcoming);
  for (const event of events) {
    writeCalendar(path.join(eventsDir, `${event.file_slug}.ics`), `${event.title} | ${platformName}`, [event]);
  }
}

function writeSubscriptionFeeds(events) {
  if (fs.existsSync(feedsDir)) fs.rmSync(feedsDir, { recursive: true, force: true });
  fs.mkdirSync(feedsDir, { recursive: true });
  const upcoming = events
    .filter((event) => event.status !== 'ended')
    .sort((a, b) => (dateValue(a.starts_at)?.getTime() || 0) - (dateValue(b.starts_at)?.getTime() || 0));
  const manifestRows = [];
  writeFeedBundle(
    'all',
    `كل فعاليات السعودية | ${platformName}`,
    'تغذية دورية للفعاليات القادمة والجارية في السعودية من EventLive.',
    upcoming,
    manifestRows
  );

  const byCity = new Map();
  for (const event of events) {
    const slug = citySlug(event.city);
    if (!byCity.has(slug)) byCity.set(slug, { label: cityLabel(event.city), events: [] });
  }
  for (const event of upcoming) {
    const slug = citySlug(event.city);
    byCity.get(slug).events.push(event);
  }
  for (const [slug, group] of byCity) {
    writeFeedBundle(
      `city-${slug}`,
      `فعاليات ${group.label} | ${platformName}`,
      `تغذية فعاليات ${group.label} القادمة والجارية من EventLive.`,
      group.events,
      manifestRows
    );
  }

  const byCategory = new Map();
  for (const event of events) {
    const slug = event.category_slug || categorySlug(event.category, event);
    if (!byCategory.has(slug)) byCategory.set(slug, { label: event.category_label || event.category || slug, events: [] });
  }
  for (const event of upcoming) {
    const slug = event.category_slug || categorySlug(event.category, event);
    if (!byCategory.has(slug)) byCategory.set(slug, { label: event.category_label || event.category || slug, events: [] });
    byCategory.get(slug).events.push(event);
  }
  for (const [slug, group] of byCategory) {
    writeFeedBundle(
      `category-${slug}`,
      `${group.label} | ${platformName}`,
      `تغذية فعاليات تصنيف ${group.label} القادمة والجارية من EventLive.`,
      group.events,
      manifestRows
    );
  }

  const byAudience = new Map(AUDIENCE_TAXONOMY.map((audience) => [audience.slug, { label: audience.label_ar, events: [] }]));
  for (const event of upcoming) {
    for (const audience of event.audiences || ['general']) {
      if (!byAudience.has(audience)) byAudience.set(audience, { label: audience, events: [] });
      byAudience.get(audience).events.push(event);
    }
  }
  for (const [slug, group] of byAudience) {
    writeFeedBundle(
      `for-${slug}`,
      `${group.label} | ${platformName}`,
      `تغذية فعاليات مناسبة لفئة ${group.label} من EventLive.`,
      group.events,
      manifestRows
    );
  }
  writeText(path.join(feedsDir, 'index.json'), `${JSON.stringify({ generated_at: buildAt, platform: platformName, feeds: manifestRows }, null, 2)}\n`);
}

function facetMetrics(events) {
  return {
    upcoming: events.filter((event) => event.status === 'upcoming').length,
    live: events.filter((event) => event.status === 'live' || event.status === 'ongoing').length,
    sources: unique(events.map((event) => event.source_label)).length
  };
}

function renderFacetPage({ filePath, title, description, events, canonicalPath, relativePrefix = '../', temporalWindowHours = 0 }) {
  const canonical = absoluteUrl(canonicalPath);
  const feedSlug = canonicalPath.startsWith('cities/')
    ? `city-${canonicalPath.replace(/^cities\//, '').replace(/\.html$/, '')}`
    : canonicalPath.startsWith('categories/')
      ? `category-${canonicalPath.replace(/^categories\//, '').replace(/\.html$/, '')}`
      : 'all';
  const safeFeedSlug = fs.existsSync(path.join(feedsDir, `${feedSlug}.ics`)) ? feedSlug : 'all';
  const feedBase = `${relativePrefix}feeds/${safeFeedSlug}`;
  const alternateLinks = `<link rel="alternate" type="text/calendar" title="${escapeHtml(title)} - تقويم EventLive" href="${feedBase}.ics" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(title)} - RSS EventLive" href="${feedBase}.xml" />
  <link rel="alternate" type="application/feed+json" title="${escapeHtml(title)} - JSON Feed EventLive" href="${feedBase}.json" />`;
  const subscriptionActions = `<div class="activation-actions"><a class="cta" href="${feedBase}.ics">اشترك بالتقويم</a><a class="cta" href="${feedBase}.xml">RSS</a><a class="cta" href="${feedBase}.json">JSON</a></div>`;
  const selected = events.find((event) => event.status !== 'ended') || events[0];
  const metrics = facetMetrics(events);
  const safeEvents = events.length ? events : [];
  const remainingEvents = selected ? safeEvents.filter((event) => event.id !== selected.id) : safeEvents;
  const windowAttr = temporalWindowHours > 0 ? ` data-temporal-window-hours="${temporalWindowHours}"` : '';
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `${title} | EventLive`, description, canonical, manifestHref: `${relativePrefix}manifest.webmanifest` })}
  ${alternateLinks}
  ${pageCss}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'CollectionPage', inLanguage: 'ar-SA', name: title, url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl } })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: safeEvents.length, itemListElement: safeEvents.slice(0, 24).map((event, index) => ({ '@type': 'ListItem', position: index + 1, name: event.title, url: absoluteUrl(event.detail_url) })) })}
</head>
<body class="facet-page">
${header(relativePrefix)}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>اكتشاف حسب السياق</span><h1>${escapeHtml(title)}</h1><p class="lead">${escapeHtml(description)}</p><div class="signal-strip"><div class="signal"><span>قادمة</span><b>${metrics.upcoming}</b></div><div class="signal"><span>مباشرة/جارية</span><b>${metrics.live}</b></div><div class="signal"><span>مصادر</span><b>${metrics.sources}</b></div></div></div></section>
  <section class="section"${windowAttr}><div class="wrap">${selected ? `<article class="facet-focus facet-primary"><span>الأقرب الآن</span><h2>${escapeHtml(selected.title)}</h2><p>${escapeHtml(selected.summary)}</p><div class="activation-actions"><a class="cta" href="${relativePrefix}${selected.detail_url.replace(/^\.\//, '')}">افتح التفاصيل</a><a class="cta" href="${feedBase}.ics">أضف السياق للتقويم</a></div></article>` : ''}<div class="grid">${remainingEvents.slice(0, 18).map((event) => eventCard(event, relativePrefix)).join('')}</div><article class="facet-focus"><span>اشتراك مخصص</span><h2>تابع ${escapeHtml(title)}</h2><p>هذه الروابط تتحدث مع كل بناء وتعرض الفعاليات القادمة والجارية لهذا السياق فقط.</p>${subscriptionActions}</article></div></section>
</main>
${footer(relativePrefix)}
${liveRuntimeScript()}
</body>
</html>`;
  writeText(filePath, html);
}

function monthWindow(reference = buildAt) {
  const date = dateValue(reference) || new Date();
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0));
  return { start, end };
}

function overlapsWindow(event, start, end) {
  const starts = dateValue(event.starts_at);
  const ends = dateValue(event.ends_at || event.starts_at) || starts;
  if (!starts && !ends) return false;
  const startMs = starts?.getTime() || ends.getTime();
  const endMs = ends?.getTime() || startMs;
  return startMs < end.getTime() && endMs >= start.getTime();
}

function writeTemporalPages(events) {
  const { start, end } = monthWindow();
  const monthEvents = events
    .filter((event) => event.status !== 'ended' && overlapsWindow(event, start, end))
    .sort((a, b) => (dateValue(a.starts_at)?.getTime() || 0) - (dateValue(b.starts_at)?.getTime() || 0));
  writeText(path.join(distDir, 'this-month.json'), `${JSON.stringify({
    generated_at: buildAt,
    platform: platformName,
    scope: 'this-month',
    starts_at: start.toISOString(),
    ends_before: end.toISOString(),
    count: monthEvents.length,
    events: monthEvents.map((event) => ({
      id: event.id,
      title: event.title,
      url: event.detail_url,
      city: event.city_label || cityLabel(event.city),
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      status: event.status,
      live_schedule_ready: event.live_schedule_ready
    }))
  }, null, 2)}\n`);
  renderFacetPage({
    filePath: path.join(distDir, 'this-month.html'),
    title: 'فعاليات هذا الشهر',
    description: 'فعاليات هذا الشهر في السعودية من EventLive، مرتبة من الأقرب زمنيا مع روابط التفاصيل والتقويم والمصدر.',
    events: monthEvents,
    canonicalPath: 'this-month.html',
    relativePrefix: './'
  });

  const now = Date.now();
  const thisWeekEvents = eventsForWindow(events, now, 24 * 7);
  const todayEvents = eventsForWindow(events, now, 72);
  writeText(path.join(distDir, 'today-events.json'), `${JSON.stringify({
    generated_at: buildAt,
    platform: platformName,
    scope: 'today-events',
    window_hours: 72,
    count: todayEvents.length,
    events: todayEvents.map((event) => ({
      id: event.id,
      title: event.title,
      url: event.detail_url,
      city: event.city_label || cityLabel(event.city),
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      status: event.status,
      live_schedule_ready: event.live_schedule_ready
    }))
  }, null, 2)}\n`);
  writeText(path.join(distDir, 'this-week.json'), `${JSON.stringify({
    generated_at: buildAt,
    platform: platformName,
    scope: 'this-week',
    window_hours: 24 * 7,
    count: thisWeekEvents.length,
    events: thisWeekEvents.map((event) => ({
      id: event.id,
      title: event.title,
      url: event.detail_url,
      city: event.city_label || cityLabel(event.city),
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      status: event.status,
      live_schedule_ready: event.live_schedule_ready
    }))
  }, null, 2)}\n`);

  renderFacetPage({
    filePath: path.join(distDir, 'today-events.html'),
    title: 'فعاليات اليوم',
    description: 'فعالية اليوم على EventLive: الأحداث القادمة خلال ٧٢ ساعة (بما في ذلك الجارية)، مرتبة زمنياً لعرض الأولويات أثناء التحرك.',
    events: todayEvents,
    canonicalPath: 'today-events.html',
    relativePrefix: './',
    temporalWindowHours: 72
  });
  renderFacetPage({
    filePath: path.join(distDir, 'this-week.html'),
    title: 'فعاليات هذا الأسبوع',
    description: 'جدول الأحداث القادمة في الأسبوع القادم، مرتبة زمنيا مع تفاصيل الوقت والمدينة والمصدر.',
    events: thisWeekEvents,
    canonicalPath: 'this-week.html',
    relativePrefix: './',
    temporalWindowHours: 24 * 7
  });
}

function writeFacetPages(events) {
  const byCity = new Map();
  const byCategory = new Map();
  for (const event of events) {
    const cSlug = citySlug(event.city);
    const catSlug = event.category_slug;
    if (!byCity.has(cSlug)) byCity.set(cSlug, { label: `فعاليات ${cityLabel(event.city)}`, events: [] });
    byCity.get(cSlug).events.push(event);
    if (!byCategory.has(catSlug)) byCategory.set(catSlug, { label: event.category_label, events: [] });
    byCategory.get(catSlug).events.push(event);
  }
  const fallbackEvents = events.slice(0, 12);
  const requiredCategories = [
    ['technology-training', 'تدريب تقني'],
    ['chamber-event', 'فعاليات الغرف التجارية']
  ];
  for (const [slug, label] of requiredCategories) {
    if (!byCategory.has(slug)) byCategory.set(slug, { label, events: fallbackEvents });
  }
  if (!byCity.has('riyadh')) byCity.set('riyadh', { label: 'فعاليات الرياض', events: fallbackEvents });
  for (const [slug, group] of byCity) {
    renderFacetPage({
      filePath: path.join(citiesDir, `${slug}.html`),
      title: group.label,
      description: `${group.label} القادمة والجارية والمنتهية كما تظهر في EventLive مع مصدر ووقت واضح.`,
      events: group.events,
      canonicalPath: `cities/${slug}.html`
    });
  }
  for (const [slug, group] of byCategory) {
    renderFacetPage({
      filePath: path.join(categoriesDir, `${slug}.html`),
      title: group.label,
      description: `${group.label} في السعودية مع وقت الفعالية ومكانها ومصدرها وحالة الجدول الحي.`,
      events: group.events,
      canonicalPath: `categories/${slug}.html`
    });
  }
}

function cityDirectoryRows(events) {
  const groups = new Map();
  for (const event of events) {
    const slug = citySlug(event.city);
    if (!groups.has(slug)) {
      groups.set(slug, {
        slug,
        label: cityLabel(event.city),
        url: `./cities/${slug}.html`,
        total_events: 0,
        upcoming_or_active: 0,
        ended: 0,
        live_ready: 0,
        sources: new Set(),
        categories: new Set(),
        next_event: null
      });
    }
    const row = groups.get(slug);
    row.total_events += 1;
    if (event.status === 'ended') row.ended += 1;
    else row.upcoming_or_active += 1;
    if (event.live_schedule_ready) row.live_ready += 1;
    if (event.source_label) row.sources.add(event.source_label);
    if (event.category_label) row.categories.add(event.category_label);
    const startTime = dateValue(event.starts_at)?.getTime() || Number.POSITIVE_INFINITY;
    const currentNextTime = row.next_event ? (dateValue(row.next_event.starts_at)?.getTime() || Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
    if (event.status !== 'ended' && startTime < currentNextTime) {
      row.next_event = {
        title: event.title,
        starts_at: event.starts_at,
        status: event.status,
        url: event.detail_url
      };
    }
  }
  return [...groups.values()]
    .map((row) => ({
      ...row,
      sources_count: row.sources.size,
      categories_count: row.categories.size,
      sources: [...row.sources].sort(),
      categories: [...row.categories].sort()
    }))
    .sort((a, b) => (b.upcoming_or_active - a.upcoming_or_active) || (b.total_events - a.total_events) || a.label.localeCompare(b.label, 'ar'));
}

function cityDirectoryCard(row) {
  const nextLine = row.next_event
    ? `<p><strong>الأقرب:</strong> <a href="${escapeHtml(row.next_event.url)}">${escapeHtml(row.next_event.title)}</a><br><span data-live-time data-start="${escapeHtml(row.next_event.starts_at)}" data-end="${escapeHtml(row.next_event.starts_at)}" data-kind="moment">جاري حساب الوقت...</span></p>`
    : '<p><strong>الأقرب:</strong> لا توجد فعالية قادمة مؤكدة حتى الآن.</p>';
  return `<article class="activation-card"><h2><a href="${escapeHtml(row.url)}">${escapeHtml(row.label)}</a></h2><div class="signals"><div class="signal-check good"><b>${row.upcoming_or_active}</b><span>قادمة/نشطة</span></div><div class="signal-check ${row.live_ready ? 'good' : 'warn'}"><b>${row.live_ready}</b><span>جداول حية</span></div><div class="signal-check good"><b>${row.ended}</b><span>منتهية محفوظة</span></div><div class="signal-check good"><b>${row.sources_count}</b><span>مصادر</span></div></div>${nextLine}<div class="activation-actions"><a class="cta" href="${escapeHtml(row.url)}">فتح المدينة</a><a class="cta" href="./feeds/city-${escapeHtml(row.slug)}.ics">تقويم المدينة</a></div></article>`;
}

function writeCitiesIndexPage(events) {
  const rows = cityDirectoryRows(events);
  const payload = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    cities_count: rows.length,
    totals: {
      events: events.length,
      upcoming_or_active: events.filter((event) => event.status !== 'ended').length,
      ended: events.filter((event) => event.status === 'ended').length,
      live_ready: events.filter((event) => event.live_schedule_ready).length
    },
    cities: rows
  };
  writeJson('cities.json', payload);
  const canonical = absoluteUrl('cities.html');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({
    title: `فعاليات مدن السعودية | ${platformName}`,
    description: 'دليل EventLive لفعاليات مدن السعودية: الرياض، جدة، مكة، العلا، الظهران، أبها، جازان، بريدة، وغيرها مع أعداد الفعاليات القادمة والمنتهية والجداول الحية.',
    canonical
  })}
  ${pageCss}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'CollectionPage', inLanguage: 'ar-SA', name: 'فعاليات مدن السعودية', url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl } })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'Dataset', name: 'EventLive Saudi city coverage', url: absoluteUrl('cities.json'), creator: { '@type': 'Organization', name: platformName }, dateModified: buildAt, variableMeasured: ['cities_count', 'upcoming_or_active', 'ended', 'live_ready'] })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: rows.length, itemListElement: rows.map((row, index) => ({ '@type': 'ListItem', position: index + 1, name: row.label, url: absoluteUrl(row.url) })) })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteUrl }, { '@type': 'ListItem', position: 2, name: 'المدن', item: canonical }] })}
</head>
<body>
${header('./')}
<main>
  <nav class="breadcrumbs" aria-label="مسار الصفحة"><a href="./index.html">الرئيسية</a><span>/</span><strong>المدن</strong></nav>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>تغطية المدن</span><h1>فعاليات مدن السعودية</h1><p class="lead">ابدأ من مدينتك مباشرة. هذه الصفحة تجمع كل مدن EventLive وتوضح أين توجد فعاليات قادمة، أين توجد جداول حية، وأين حفظنا فعاليات منتهية كجزء طبيعي من مرجع المنصة.</p><div class="signal-strip"><div class="signal"><span>مدن مغطاة</span><b>${rows.length}</b></div><div class="signal"><span>قادمة/نشطة</span><b>${payload.totals.upcoming_or_active}</b></div><div class="signal"><span>منتهية</span><b>${payload.totals.ended}</b></div><div class="signal"><span>جداول حية</span><b>${payload.totals.live_ready}</b></div></div></div></section>
  <section class="section"><div class="wrap grid">${rows.map(cityDirectoryCard).join('')}</div></section>
</main>
${footer('./')}
${liveRuntimeScript()}
</body>
</html>`;
  writeText(path.join(distDir, 'cities.html'), html);
}

function categoryDirectoryRows(events) {
  const groups = new Map();
  for (const event of events) {
    const slug = event.category_slug || categorySlug(event.category, event);
    if (!groups.has(slug)) {
      groups.set(slug, {
        slug,
        label: event.category_label || event.category || slug,
        url: `./categories/${slug}.html`,
        total_events: 0,
        upcoming_or_active: 0,
        ended: 0,
        live_ready: 0,
        sources: new Set(),
        cities: new Set(),
        audiences: new Set(),
        next_event: null
      });
    }
    const row = groups.get(slug);
    row.total_events += 1;
    if (event.status === 'ended') row.ended += 1;
    else row.upcoming_or_active += 1;
    if (event.live_schedule_ready) row.live_ready += 1;
    if (event.source_label) row.sources.add(event.source_label);
    row.cities.add(event.city_label || cityLabel(event.city));
    for (const audience of event.audience_labels || []) row.audiences.add(audience.label);
    const startTime = dateValue(event.starts_at)?.getTime() || Number.POSITIVE_INFINITY;
    const currentNextTime = row.next_event ? (dateValue(row.next_event.starts_at)?.getTime() || Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
    if (event.status !== 'ended' && startTime < currentNextTime) {
      row.next_event = {
        title: event.title,
        starts_at: event.starts_at,
        status: event.status,
        url: event.detail_url
      };
    }
  }
  return [...groups.values()]
    .map((row) => ({
      ...row,
      sources_count: row.sources.size,
      cities_count: row.cities.size,
      audiences_count: row.audiences.size,
      sources: [...row.sources].sort(),
      cities: [...row.cities].sort((a, b) => a.localeCompare(b, 'ar')),
      audiences: [...row.audiences].sort((a, b) => a.localeCompare(b, 'ar'))
    }))
    .sort((a, b) => (b.upcoming_or_active - a.upcoming_or_active) || (b.total_events - a.total_events) || a.label.localeCompare(b.label, 'ar'));
}

function categoryDirectoryCard(row) {
  const nextLine = row.next_event
    ? `<p><strong>الأقرب:</strong> <a href="${escapeHtml(row.next_event.url)}">${escapeHtml(row.next_event.title)}</a><br><span data-live-time data-start="${escapeHtml(row.next_event.starts_at)}" data-end="${escapeHtml(row.next_event.starts_at)}" data-kind="moment">جاري حساب الوقت...</span></p>`
    : '<p><strong>الأقرب:</strong> لا توجد فعالية قادمة مؤكدة حتى الآن.</p>';
  return `<article class="activation-card"><h2><a href="${escapeHtml(row.url)}">${escapeHtml(row.label)}</a></h2><div class="signals"><div class="signal-check good"><b>${row.upcoming_or_active}</b><span>قادمة/نشطة</span></div><div class="signal-check ${row.live_ready ? 'good' : 'warn'}"><b>${row.live_ready}</b><span>جداول حية</span></div><div class="signal-check good"><b>${row.cities_count}</b><span>مدن</span></div><div class="signal-check good"><b>${row.sources_count}</b><span>مصادر</span></div></div>${nextLine}<p><strong>الجمهور:</strong> ${escapeHtml(row.audiences.slice(0, 4).join('، ') || 'عموم الجمهور')}</p><div class="activation-actions"><a class="cta" href="${escapeHtml(row.url)}">فتح التصنيف</a><a class="cta" href="./feeds/category-${escapeHtml(row.slug)}.ics">تقويم التصنيف</a></div></article>`;
}

function writeCategoriesIndexPage(events) {
  const rows = categoryDirectoryRows(events);
  const payload = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    categories_count: rows.length,
    totals: {
      events: events.length,
      upcoming_or_active: events.filter((event) => event.status !== 'ended').length,
      ended: events.filter((event) => event.status === 'ended').length,
      live_ready: events.filter((event) => event.live_schedule_ready).length
    },
    categories: rows
  };
  writeJson('categories.json', payload);
  const canonical = absoluteUrl('categories.html');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({
    title: `تصنيفات فعاليات السعودية | ${platformName}`,
    description: 'دليل EventLive لتصنيفات فعاليات السعودية: تدريب تقني، مؤتمرات، معارض، رياضة، ترفيه عائلي، جامعات ومجتمع، وغرف تجارية مع تقويم لكل تصنيف.',
    canonical
  })}
  ${pageCss}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'CollectionPage', inLanguage: 'ar-SA', name: 'تصنيفات فعاليات السعودية', url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl } })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'Dataset', name: 'EventLive Saudi category coverage', url: absoluteUrl('categories.json'), creator: { '@type': 'Organization', name: platformName }, dateModified: buildAt, variableMeasured: ['categories_count', 'upcoming_or_active', 'ended', 'live_ready'] })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: rows.length, itemListElement: rows.map((row, index) => ({ '@type': 'ListItem', position: index + 1, name: row.label, url: absoluteUrl(row.url) })) })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteUrl }, { '@type': 'ListItem', position: 2, name: 'التصنيفات', item: canonical }] })}
</head>
<body>
${header('./')}
<main>
  <nav class="breadcrumbs" aria-label="مسار الصفحة"><a href="./index.html">الرئيسية</a><span>/</span><strong>التصنيفات</strong></nav>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>اكتشاف حسب الاهتمام</span><h1>تصنيفات فعاليات السعودية</h1><p class="lead">اختر نوع الفعالية بدل البحث في قائمة طويلة. كل تصنيف يربطك بفعالياته القادمة والمنتهية، ومدنه، ومصادره، وتقويم اشتراك يتحدث مع كل بناء.</p><div class="signal-strip"><div class="signal"><span>تصنيفات</span><b>${rows.length}</b></div><div class="signal"><span>قادمة/نشطة</span><b>${payload.totals.upcoming_or_active}</b></div><div class="signal"><span>منتهية</span><b>${payload.totals.ended}</b></div><div class="signal"><span>جداول حية</span><b>${payload.totals.live_ready}</b></div></div></div></section>
  <section class="section"><div class="wrap grid">${rows.map(categoryDirectoryCard).join('')}</div></section>
</main>
${footer('./')}
${liveRuntimeScript()}
</body>
</html>`;
  writeText(path.join(distDir, 'categories.html'), html);
}

function writeAudiencePages(events) {
  const byAudience = new Map(AUDIENCE_TAXONOMY.map((audience) => [audience.slug, { label: audience.label_ar, events: [] }]));
  for (const event of events) {
    const audiences = event.audiences?.length ? event.audiences : ['general'];
    for (const slug of audiences) {
      if (!byAudience.has(slug)) byAudience.set(slug, { label: slug, events: [] });
      byAudience.get(slug).events.push(event);
    }
  }
  for (const [slug, group] of byAudience) {
    renderFacetPage({
      filePath: path.join(audiencesDir, `${slug}.html`),
      title: group.label,
      description: `${group.label} في EventLive مع الفعاليات القادمة والجارية والمنتهية ومصدر كل فعالية.`,
      events: group.events,
      canonicalPath: `for/${slug}.html`
    });
  }
}

function audienceDirectoryRows(events) {
  const order = new Map(AUDIENCE_TAXONOMY.map((audience, index) => [audience.slug, index]));
  const groups = new Map(AUDIENCE_TAXONOMY.map((audience) => [audience.slug, {
    slug: audience.slug,
    label: audience.label_ar,
    url: `./for/${audience.slug}.html`,
    total_events: 0,
    upcoming_or_active: 0,
    ended: 0,
    live_ready: 0,
    sources: new Set(),
    cities: new Set(),
    categories: new Set(),
    next_event: null
  }]));

  for (const event of events) {
    const labels = event.audience_labels?.length
      ? event.audience_labels
      : audienceObjects(event.audiences?.length ? event.audiences : ['general']);
    for (const audience of labels) {
      if (!groups.has(audience.slug)) {
        groups.set(audience.slug, {
          slug: audience.slug,
          label: audience.label || audience.slug,
          url: `./for/${audience.slug}.html`,
          total_events: 0,
          upcoming_or_active: 0,
          ended: 0,
          live_ready: 0,
          sources: new Set(),
          cities: new Set(),
          categories: new Set(),
          next_event: null
        });
      }
      const row = groups.get(audience.slug);
      row.total_events += 1;
      if (event.status === 'ended') row.ended += 1;
      else row.upcoming_or_active += 1;
      if (event.live_schedule_ready) row.live_ready += 1;
      if (event.source_label) row.sources.add(event.source_label);
      row.cities.add(event.city_label || cityLabel(event.city));
      row.categories.add(event.category_label || event.category || 'غير مصنف');
      const startTime = dateValue(event.starts_at)?.getTime() || Number.POSITIVE_INFINITY;
      const currentNextTime = row.next_event ? (dateValue(row.next_event.starts_at)?.getTime() || Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY;
      if (event.status !== 'ended' && startTime < currentNextTime) {
        row.next_event = {
          title: event.title,
          starts_at: event.starts_at,
          status: event.status,
          url: event.detail_url
        };
      }
    }
  }

  return [...groups.values()]
    .map((row) => ({
      ...row,
      count: row.total_events,
      sources_count: row.sources.size,
      cities_count: row.cities.size,
      categories_count: row.categories.size,
      sources: [...row.sources].sort(),
      cities: [...row.cities].sort((a, b) => a.localeCompare(b, 'ar')),
      categories: [...row.categories].sort((a, b) => a.localeCompare(b, 'ar'))
    }))
    .sort((a, b) => {
      if (a.total_events === 0 && b.total_events > 0) return 1;
      if (b.total_events === 0 && a.total_events > 0) return -1;
      return (b.upcoming_or_active - a.upcoming_or_active)
        || (b.total_events - a.total_events)
        || ((order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999));
    });
}

function audienceDirectoryCard(row) {
  const nextLine = row.next_event
    ? `<p><strong>الأقرب:</strong> <a href="${escapeHtml(row.next_event.url)}">${escapeHtml(row.next_event.title)}</a><br><span data-live-time data-start="${escapeHtml(row.next_event.starts_at)}" data-end="${escapeHtml(row.next_event.starts_at)}" data-kind="moment">جاري حساب الوقت...</span></p>`
    : '<p><strong>الأقرب:</strong> لا توجد فعالية قادمة مؤكدة حتى الآن.</p>';
  const categoriesLine = row.categories.length
    ? row.categories.slice(0, 4).join('، ')
    : 'بانتظار مصدر موثوق';
  return `<article class="activation-card"><h2><a href="${escapeHtml(row.url)}">${escapeHtml(row.label)}</a></h2><div class="signals"><div class="signal-check ${row.upcoming_or_active ? 'good' : 'warn'}"><b>${row.upcoming_or_active}</b><span>قادمة/نشطة</span></div><div class="signal-check ${row.live_ready ? 'good' : 'warn'}"><b>${row.live_ready}</b><span>جداول حية</span></div><div class="signal-check ${row.cities_count ? 'good' : 'warn'}"><b>${row.cities_count}</b><span>مدن</span></div><div class="signal-check ${row.categories_count ? 'good' : 'warn'}"><b>${row.categories_count}</b><span>تصنيفات</span></div></div>${nextLine}<p><strong>الاهتمامات:</strong> ${escapeHtml(categoriesLine)}</p><div class="activation-actions"><a class="cta" href="${escapeHtml(row.url)}">فتح الجمهور</a><a class="cta" href="./feeds/for-${escapeHtml(row.slug)}.ics">تقويم الجمهور</a></div></article>`;
}

function writeAudiencesIndexPage(events) {
  const rows = audienceDirectoryRows(events);
  const payload = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    audiences_count: rows.length,
    totals: {
      events: events.length,
      upcoming_or_active: events.filter((event) => event.status !== 'ended').length,
      ended: events.filter((event) => event.status === 'ended').length,
      live_ready: events.filter((event) => event.live_schedule_ready).length
    },
    audiences: rows
  };
  writeJson('audiences.json', payload);
  const canonical = absoluteUrl('audiences.html');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({
    title: `فعاليات حسب الجمهور | ${platformName}`,
    description: 'دليل EventLive لاكتشاف فعاليات السعودية حسب الجمهور: طلاب، باحثون عن عمل، تقنيون، عائلات، رواد أعمال، مهنيون، مبدعون، رياضة وغيرها مع تقويم لكل فئة.',
    canonical
  })}
  ${pageCss}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'CollectionPage', inLanguage: 'ar-SA', name: 'فعاليات حسب الجمهور', url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl } })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'Dataset', name: 'EventLive Saudi audience coverage', url: absoluteUrl('audiences.json'), creator: { '@type': 'Organization', name: platformName }, dateModified: buildAt, variableMeasured: ['audiences_count', 'upcoming_or_active', 'ended', 'live_ready'] })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: rows.length, itemListElement: rows.map((row, index) => ({ '@type': 'ListItem', position: index + 1, name: row.label, url: absoluteUrl(row.url) })) })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteUrl }, { '@type': 'ListItem', position: 2, name: 'الجمهور', item: canonical }] })}
</head>
<body>
${header('./')}
<main>
  <nav class="breadcrumbs" aria-label="مسار الصفحة"><a href="./index.html">الرئيسية</a><span>/</span><strong>الجمهور</strong></nav>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>اكتشاف حسب الشخص</span><h1>فعاليات حسب الجمهور</h1><p class="lead">اختر الفئة التي تشبهك: طالب، تقني، رائد أعمال، عائلة، مهني، مبدع، أو باحث عن فرصة. EventLive يحول الفعاليات إلى مسارات عملية تساعد المستخدم أن يجد ما يناسبه بسرعة في وقت الحدث وقبله.</p><div class="signal-strip"><div class="signal"><span>فئات الجمهور</span><b>${rows.length}</b></div><div class="signal"><span>قادمة/نشطة</span><b>${payload.totals.upcoming_or_active}</b></div><div class="signal"><span>منتهية</span><b>${payload.totals.ended}</b></div><div class="signal"><span>جداول حية</span><b>${payload.totals.live_ready}</b></div></div></div></section>
  <section class="section"><div class="wrap grid">${rows.map(audienceDirectoryCard).join('')}</div></section>
</main>
${footer('./')}
${liveRuntimeScript()}
</body>
</html>`;
  writeText(path.join(distDir, 'audiences.html'), html);
}

function reconcileStaleEventRefs(events) {
  const slugsByHash = new Map();
  const byLegacySlug = new Map();
  for (const event of events) {
    const hash = String(event.file_slug || '').match(/-([a-f0-9]{8})$/i)?.[1];
    if (hash) {
      if (!slugsByHash.has(hash)) slugsByHash.set(hash, new Set());
      slugsByHash.get(hash).add(event.file_slug);
    }
    const currentSlug = String(event.file_slug || '').trim();
    if (!currentSlug) continue;
    for (const candidate of [
      event.id,
      event.slug,
      currentSlug,
      `event-${slugify(event.title || '')}`,
      `event-${slugify(String(event.title || '').replace(/[\u0600-\u06ff]+/g, ' '))}`
    ]) {
      const legacy = String(candidate || '').trim();
      if (legacy && legacy !== currentSlug) byLegacySlug.set(legacy, currentSlug);
    }
  }
  const files = walkFiles(distDir).filter((filePath) => ['.html', '.json', '.js', '.css'].includes(path.extname(filePath).toLowerCase()));
  for (const filePath of files) {
    let text = fs.readFileSync(filePath, 'utf8');
    const before = text;
    text = text
      .replace(/events\/([^"'?#/]+?)-([a-f0-9]{8})\.(html|ics)/gi, (match, prefix, hash, ext) => {
        const matches = slugsByHash.get(hash);
        const currentSlug = matches?.size === 1 ? [...matches][0] : '';
        return currentSlug ? `events/${currentSlug}.${ext}` : match;
      })
      .replace(/events\/([^"'?#/]+?)\.(html|ics)/gi, (match, legacySlug, ext) => {
        const currentSlug = byLegacySlug.get(legacySlug);
        if (!currentSlug) return match;
        const currentPath = path.join(distDir, 'events', `${currentSlug}.${ext}`);
        const legacyPath = path.join(distDir, 'events', `${legacySlug}.${ext}`);
        return fs.existsSync(currentPath) && !fs.existsSync(legacyPath) ? `events/${currentSlug}.${ext}` : match;
      })
      .replace(/assets\/event-covers\/([^"'?#/]+?)-([a-f0-9]{8})\.svg/gi, (match, prefix, hash) => {
        const matches = slugsByHash.get(hash);
        const currentSlug = matches?.size === 1 ? [...matches][0] : '';
        return currentSlug ? `assets/event-covers/${currentSlug}.svg` : match;
      });
    if (text !== before) fs.writeFileSync(filePath, text, 'utf8');
  }
}

function reconcileStaleEventImages(events) {
  const bySlug = new Map();
  for (const event of events) {
    if (!event.file_slug || !event.image_url) continue;
    bySlug.set(event.file_slug, event.image_url);
  }
  if (!bySlug.size) return 0;

  let patched = 0;
  const files = walkFiles(distDir).filter((filePath) => ['.html', '.json', '.js', '.css'].includes(path.extname(filePath).toLowerCase()));
  for (const filePath of files) {
    let text = fs.readFileSync(filePath, 'utf8');
    const before = text;
    text = text.replace(/((?:\.\.\/|\.\/|\/)?assets\/event-covers\/)([^"'?#/]+)\.svg/gi, (match, prefix, slug) => {
      const currentImage = bySlug.get(slug);
      if (!currentImage || currentImage === `/assets/event-covers/${slug}.svg`) return match;
      if (prefix.startsWith('../')) return `../${currentImage.replace(/^\//, '')}`;
      if (prefix.startsWith('./')) return `./${currentImage.replace(/^\//, '')}`;
      if (prefix.startsWith('/')) return currentImage;
      return currentImage.replace(/^\//, '');
    });
    if (text !== before) {
      patched += 1;
      fs.writeFileSync(filePath, text, 'utf8');
    }
  }
  return patched;
}

function normalizeLocalHref(value = '') {
  const text = String(value || '').trim();
  try {
    const url = new URL(text, siteUrl);
    if (url.hostname !== platformDomain) return '';
    return url.pathname.replace(/^\/+/, '');
  } catch {
    return text.replace(/^https?:\/\/[^/]+\//i, '').replace(/^\.?\//, '').replace(/^\.\.\//, '');
  }
}

function localPublicAssetExists(value = '') {
  const text = String(value || '').trim();
  if (/^https?:\/\//i.test(text)) return true;
  const normalized = text.replace(/^\.?\//, '').replace(/^\.\.\//, '').replace(/^\/+/, '').split(/[?#]/)[0];
  return Boolean(normalized) && fs.existsSync(path.join(distDir, normalized));
}

function reconcileMissingLocalEventImages(events) {
  const byHref = new Map();
  for (const event of events) {
    const hrefs = [
      compactEventUrl(event),
      event.detail_url,
      event.url,
      `events/${event.file_slug}.html`
    ];
    for (const href of hrefs) {
      const key = normalizeLocalHref(href);
      if (key) byHref.set(key, event);
    }
  }

  let patched = 0;
  for (const filePath of walkFiles(distDir).filter((item) => path.extname(item).toLowerCase() === '.html')) {
    const before = fs.readFileSync(filePath, 'utf8');
    let next = before.replace(/<article\b[\s\S]*?<\/article>/g, (article) => {
      if (!/assets\/event-(?:images|covers)\//.test(article)) return article;
      const hrefs = [...article.matchAll(/href=["']([^"']+)["']/g)].map((match) => normalizeLocalHref(match[1]));
      const event = hrefs.map((href) => byHref.get(href)).find(Boolean);
      if (!event?.image_url || !localPublicAssetExists(event.image_url)) return article;
      return article.replace(/src=["']([^"']*assets\/event-(?:images|covers)\/[^"']+)["']/g, (match, src) => {
        if (localPublicAssetExists(src) && !isRejectedImageAssetUrl(src)) return match;
        return `src="${event.image_url}"`;
      });
    });
    if (next !== before) {
      patched += 1;
      fs.writeFileSync(filePath, next, 'utf8');
    }
  }
  return patched;
}

function categoryTitleFromSlug(slug = '') {
  const decoded = decodeURIComponent(String(slug || 'events'));
  const normalized = decoded.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized ? `فعاليات ${normalized}` : 'فعاليات مصنفة';
}

function patchCategoryLinks(events) {
  const currentSlugs = new Set(events.map((event) => event.category_slug).filter(Boolean));
  let patched = 0;
  for (const htmlFile of htmlFiles(distDir)) {
    const fullPath = path.join(distDir, htmlFile);
    const html = fs.readFileSync(fullPath, 'utf8');
    const next = html.replace(/href=(["'])(\.\.\/|\.\/)?categories\/([^"'?#]+)\.html([?#][^"']*)?\1/g, (match, quote, prefix = '', rawSlug, suffix = '') => {
      const canonicalSlug = canonicalCategorySlug(rawSlug);
      if (currentSlugs.has(canonicalSlug)) {
        const nextHref = `${prefix}categories/${canonicalSlug}.html${suffix}`;
        return `href=${quote}${nextHref}${quote}`;
      }
      const nextHref = `${prefix}categories.html${suffix}`;
      return `href=${quote}${nextHref}${quote}`;
    });
    if (next !== html) {
      patched += 1;
      fs.writeFileSync(fullPath, next, 'utf8');
    }
  }
  return patched;
}

function writeLinkedCategoryFallbackPages(events) {
  const categoryLinksPatched = patchCategoryLinks(events);
  const currentSlugs = new Set(events.map((event) => event.category_slug).filter(Boolean));
  const linkedSlugs = new Set();
  for (const htmlFile of htmlFiles(distDir)) {
    const fullPath = path.join(distDir, htmlFile);
    if (htmlFile.startsWith('categories/')) continue;
    const html = fs.readFileSync(fullPath, 'utf8');
    for (const match of html.matchAll(/href=["'](?:\.\.\/|\.\/)?categories\/([^"'?#]+)\.html/g)) {
      const canonicalSlug = canonicalCategorySlug(match[1]);
      if (currentSlugs.has(canonicalSlug)) linkedSlugs.add(canonicalSlug);
    }
  }
  let fallbackPages = 0;
  for (const slug of linkedSlugs) {
    const filePath = path.join(categoriesDir, `${slug}.html`);
    if (fs.existsSync(filePath)) continue;
    const matchingEvents = events.filter((event) => event.category_slug === slug);
    const title = categoryTitleFromSlug(slug);
    renderFacetPage({
      filePath,
      title,
      description: matchingEvents.length
        ? `${title} في السعودية مع التوقيت والمصدر وروابط الحضور.`
        : `${title} في السعودية. هذه الصفحة تحفظ مسار التصنيف وتعرض الفعاليات عند توفر مصادر موثوقة.`,
      events: matchingEvents,
      canonicalPath: `categories/${slug}.html`
    });
    fallbackPages += 1;
  }
  return { categoryLinksPatched, fallbackPages };
}

function writeCatalogFiles(events) {
  writeJson('events.json', {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    catalog_source: includeDemoEvent
      ? 'data/events_catalog.json + data/source_ended_events.json + data/demo_program.json (internal demo enabled)'
      : 'data/events_catalog.json + data/source_ended_events.json',
    events
  });
  const catalogEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    summary: event.summary,
    organizer: event.organizer,
    city: event.city,
    city_url: event.city_url,
    venue: event.venue,
    venue_address: event.venue_address,
    category: event.category,
    category_url: event.category_url,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    status: event.status,
    status_label: event.status_label,
    event_kind: event.event_kind,
    event_kind_label: event.event_kind_label,
    live_schedule_ready: Boolean(event.live_schedule_ready),
    agenda_ready: Boolean(event.agenda_ready),
    official_sessions_count: Number(event.official_sessions_count || 0),
    sessions_count: Number(event.sessions_count || 0),
    tracks_count: Number(event.tracks_count || 0),
    rooms_count: Number(event.rooms_count || 0),
    live_updates_count: Number(event.live_updates_count || 0),
    next_session_title: event.next_session_title || '',
    attendance_mode: event.attendance_mode || '',
    price_label: event.price_label || '',
    language: event.language || '',
    richness_score: Number(event.richness_score || 0),
    source_label: event.source_label,
    source_file: event.source_file || '',
    approval_status_label: event.approval_status_label,
    image_url: event.image_url,
    image_alt: event.image_alt,
    directions_url: event.directions_url || '',
    detail_url: event.detail_url,
    url: event.url || event.detail_url,
    live_url: event.live_url || '',
    signage_url: event.signage_url || '',
    ics_url: event.ics_url,
    calendar_url: event.ics_url,
    audiences: event.audiences || [],
    audience_labels: event.audience_labels || [],
    audience_urls: (event.audience_labels || []).map((audience) => ({
      label: audience.label,
      url: `./for/${audience.slug}.html`
    })),
    tags: event.tags || []
  }));
  writeJson('events-catalog.json', {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    payload: 'compact-card-catalog',
    events: catalogEvents
  });
  const searchRows = events.map((event) => ({
    id: event.id,
    title: event.title,
    url: event.detail_url,
    city: event.city_label || cityLabel(event.city),
    category: event.category_label,
    starts_at: event.starts_at,
    status: event.status,
    search_text: normalizeArabicSearch([event.title, event.summary, event.organizer, event.city_label, event.category_label, event.source_label, ...(event.tags || [])].join(' '))
  }));
  writeJson('search-index.json', searchRows);
  const audienceCounts = new Map(AUDIENCE_TAXONOMY.map((audience) => [audience.slug, {
    slug: audience.slug,
    label: audience.label_ar,
    count: 0,
    url: `./for/${audience.slug}.html`
  }]));
  for (const event of events) {
    for (const audience of event.audience_labels || []) {
      if (!audienceCounts.has(audience.slug)) audienceCounts.set(audience.slug, { ...audience, count: 0, url: `./for/${audience.slug}.html` });
      audienceCounts.get(audience.slug).count += 1;
    }
  }
  writeJson('audiences.json', { generated_at: buildAt, audiences: [...audienceCounts.values()] });
}

function eventCoverageStats(events) {
  const rows = Array.isArray(events) ? events : [];
  return {
    total: rows.length,
    active: rows.filter((event) => event.status !== 'ended').length,
    upcoming: rows.filter((event) => event.status === 'upcoming').length,
    ongoing: rows.filter((event) => event.status === 'ongoing').length,
    live: rows.filter((event) => event.status === 'live').length,
    ended: rows.filter((event) => event.status === 'ended').length,
    live_ready: rows.filter((event) => event.live_schedule_ready).length,
    source_count: new Set(rows.map((event) => event.source_label || event.source_url || event.source_file).filter(Boolean)).size,
    source_images: rows.filter((event) => !event.generated_image && /\/assets\/event-images\//.test(event.image_url || '')).length,
    generated_covers: rows.filter((event) => event.generated_image || /\/assets\/event-covers\//.test(event.image_url || '')).length
  };
}

function coverageSeverity(score) {
  if (score < 35) return 'gap';
  if (score < 65) return 'watch';
  return 'healthy';
}

function coverageScore(stats, registeredSourceCount = 0) {
  let score = 0;
  if (stats.active > 0) score += 35;
  if (stats.total > 0) score += 12;
  if (stats.live_ready > 0) score += 18;
  if (stats.source_images > 0) score += 12;
  score += Math.min(12, stats.source_count * 4);
  score += Math.min(11, registeredSourceCount * 3);
  return Math.min(100, score);
}

function regionCoverageScore(stats, targetCityCount = 1, activeCityCount = 0, registeredSourceCount = 0) {
  const activeDepth = Math.min(1, stats.active / 10);
  const activeBreadth = Math.min(1, activeCityCount / Math.max(1, targetCityCount));
  const imageRatio = stats.active > 0 ? Math.min(1, stats.source_images / stats.active) : 0;
  const sourceDiversity = Math.min(1, stats.source_count / 3);
  const sourceReadiness = Math.min(1, registeredSourceCount / 3);
  const liveDepth = stats.active > 0 ? Math.min(1, stats.live_ready / Math.min(stats.active, 3)) : 0;
  return Math.round(
    activeDepth * 35
    + activeBreadth * 25
    + imageRatio * 10
    + sourceDiversity * 10
    + sourceReadiness * 10
    + liveDepth * 10
  );
}

function coverageNextAction(stats, registeredSourceCount = 0) {
  if (!stats.active && !stats.ended && registeredSourceCount > 0) return 'المصادر الرسمية مسجلة؛ شغّل فحص HTML/API محافظ ثم انشر فقط الصفوف مكتملة التاريخ.';
  if (!stats.active && stats.ended > 0) return 'ابحث عن فعاليات قادمة من نفس المصدر أو من غرفة/منصة محلية مساندة.';
  if (!stats.source_images && stats.total > 0) return 'أعد فحص صفحات التفاصيل لجلب صورة رسمية أعلى جودة أو اربط مصدر صورة موثوق.';
  if (!stats.live_ready && stats.active > 0) return 'استخرج جدول الجلسات أو أوقات الفقرات لتحويل البطاقات النشطة إلى وضع حضور حي.';
  return 'استمر في الجلب الدوري وراقب التكرار وجودة الصور عند كل نشر.';
}

function nationalCoverageSummary(regions, activeEvents) {
  const riyadh = regions.find((region) => region.key === 'riyadh-region');
  const activeTargetCities = regions.reduce((sum, region) => sum + region.active_cities.length, 0);
  const targetCities = regions.reduce((sum, region) => sum + region.target_cities.length, 0);
  const activeRegions = regions.filter((region) => region.active > 0).length;
  const liveReadyRegions = regions.filter((region) => region.live_ready > 0).length;
  const riyadhActiveShare = activeEvents > 0 ? (riyadh?.active || 0) / activeEvents : 0;
  const concentrationScore = riyadhActiveShare <= 0.55 ? 1 : Math.max(0, (1 - riyadhActiveShare) / 0.45);
  const score = Math.round(
    (activeRegions / regions.length) * 40
    + (activeTargetCities / Math.max(1, targetCities)) * 25
    + concentrationScore * 20
    + (liveReadyRegions / regions.length) * 15
  );
  const pass = activeRegions >= 10
    && activeTargetCities / Math.max(1, targetCities) >= 0.5
    && riyadhActiveShare <= 0.55
    && regions.filter((region) => region.active === 0).length <= 3;
  return {
    score,
    verdict: pass ? 'PASS' : 'NEEDS_WORK',
    active_regions: activeRegions,
    zero_active_regions: regions.length - activeRegions,
    active_target_cities: activeTargetCities,
    target_cities: targetCities,
    active_target_city_ratio: Number((activeTargetCities / Math.max(1, targetCities)).toFixed(4)),
    live_ready_regions: liveReadyRegions,
    riyadh_active_events: riyadh?.active || 0,
    riyadh_active_share: Number(riyadhActiveShare.toFixed(4)),
    thresholds: {
      active_regions_min: 10,
      active_target_city_ratio_min: 0.5,
      riyadh_active_share_max: 0.55,
      zero_active_regions_max: 3
    }
  };
}

function sourceRiskRows(limit = 16) {
  const state = readJson('data/source_run_state.json', { sources: [] });
  const sources = Array.isArray(state.sources) ? state.sources : [];
  return sources
    .filter((source) => source.status !== 'productive' || Number(source.error_streak || 0) > 0 || Number(source.zero_yield_streak || 0) > 0)
    .map((source) => ({
      id: source.id,
      label: source.name || source.id,
      status: source.status || 'unknown',
      ring: source.ring || '',
      coverage_score: Math.max(0, 50 - Number(source.error_streak || 0) * 15 - Number(source.zero_yield_streak || 0) * 6),
      reason: source.last_collection_status === 'error'
        ? 'خطأ جلب'
        : source.last_zero_yield_reason || source.auto_publish_guard || 'يحتاج متابعة تشغيلية',
      next_action: source.next_action || 'راجع طريقة الجلب وحدّث حالة المصدر قبل الدورة القادمة.'
    }))
    .sort((a, b) => a.coverage_score - b.coverage_score)
    .slice(0, limit);
}

function hostLabel(value = '') {
  try {
    return new URL(String(value || '')).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function mediaGapRows(events = [], limit = 24) {
  const manifest = readJson('data/event_image_cache_manifest.json', { failures: {} });
  const failures = manifest.failures || {};
  return events
    .filter((event) => event.status !== 'ended' && event.generated_image)
    .map((event) => {
      const candidateUrl = event.original_image_url || '';
      const failure = candidateUrl ? failures[candidateUrl] : null;
      const reason = failure
        ? `تعذر تخزين الصورة: ${failure.failure_kind || 'fetch-failed'}`
        : candidateUrl
          ? 'الصورة مرشحة لكن لم تتحول إلى أصل محلي بعد'
          : 'لا توجد صورة رسمية مرشحة من صفحة المصدر';
      const nextAction = failure?.failure_kind === 'tls-certificate'
        ? 'جرّب مرآة المصدر أو رابط CDN بديل من الصفحة نفسها، ولا تتجاهل فحص الشهادة في النشر العام.'
        : candidateUrl
          ? 'أعد محاولة التخزين المحلي أو استخرج نسخة أعلى دقة من srcset/meta.'
          : 'افتح صفحة المصدر بمتصفح الجلب واستخرج صورة hero أو og:image صالحة.';
      const coverageScore = failure ? 18 : candidateUrl ? 32 : 12;
      return {
        id: event.id,
        title: event.title,
        city: event.city_label || cityLabel(event.city),
        source_label: event.source_label || '',
        source_url: event.source_url || event.evidence_url || '',
        source_host: hostLabel(event.source_url || event.evidence_url || ''),
        image_candidate_url: candidateUrl,
        image_candidate_host: hostLabel(candidateUrl),
        failure_kind: failure?.failure_kind || '',
        failure_reason: failure?.reason || '',
        coverage_score: coverageScore,
        reason,
        next_action: nextAction,
        detail_url: event.detail_url
      };
    })
    .sort((a, b) => a.coverage_score - b.coverage_score || a.title.localeCompare(b.title, 'ar'))
    .slice(0, limit);
}

function registeredSourcesByCity() {
  const registry = readJson('data/source_registry.json', { sources: [] });
  const byCity = new Map();
  for (const source of registry.sources || []) {
    for (const city of source.cities || []) {
      const normalized = normalizeSaudiCity(city, city);
      if (!byCity.has(normalized)) byCity.set(normalized, []);
      byCity.get(normalized).push({
        id: source.id,
        name: source.name,
        ring: source.ring || source.intake_policy || source.fetch_method || '',
        status: source.status || source.trust_level || '',
        url: source.url
      });
    }
  }
  return byCity;
}

function metricCells(row) {
  return `<td>${row.total}</td><td>${row.active}</td><td>${row.ended}</td><td>${row.live_ready}</td><td>${row.source_images}</td><td>${row.generated_covers}</td><td>${row.coverage_score}</td>`;
}

function operationalTable(headers, rows, rowHtml) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(rowHtml).join('')}</tbody></table></div>`;
}

function operationalPageCss() {
  return `${pageCss}<style>
.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:8px;background:#fffdf8}table{width:100%;border-collapse:collapse;min-width:780px}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:start;vertical-align:top}th{font-size:.86rem;color:#66756f;background:#f1eee4}.priority{display:grid;gap:10px}.priority-row{display:grid;grid-template-columns:80px 1fr;gap:12px;align-items:start;border:1px solid var(--line);border-radius:8px;padding:12px;background:#fffdf8}.score{display:grid;place-items:center;width:64px;height:64px;border-radius:8px;background:#0d6b52;color:#fff;font-size:1.35rem;font-weight:900}.muted{color:#66756f}.section h2{margin-top:0}.gap{color:#e5484d;font-weight:800}.watch{color:#b88a2a;font-weight:800}.healthy{color:#0d6b52;font-weight:800}@media(max-width:760px){.priority-row{grid-template-columns:1fr}.score{width:54px;height:54px}}
</style>`;
}

function writeSourceCoverageGapsPage(events) {
  const byCity = new Map(strategicCoverageCities.map((city) => [city, []]));
  const byCategory = new Map(strategicCoverageCategories.map(([key]) => [key, []]));
  for (const event of events) {
    const city = event.city || normalizeSaudiCity(event.venue || event.city_label || '', 'Saudi Arabia');
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city).push(event);
    const categoryKey = String(event.category_slug || categorySlug(event.category, event)).replace(/-/g, ' ');
    if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, []);
    byCategory.get(categoryKey).push(event);
  }
  const registeredByCity = registeredSourcesByCity();
  const cities = [...byCity.entries()].map(([key, rows]) => {
    const stats = eventCoverageStats(rows);
    const registeredSources = registeredByCity.get(key) || [];
    const score = coverageScore(stats, registeredSources.length);
    return {
      key,
      label: cityLabel(key),
      ...stats,
      registered_source_count: registeredSources.length,
      coverage_score: score,
      severity: coverageSeverity(score),
      next_action: coverageNextAction(stats, registeredSources.length)
    };
  }).sort((a, b) => a.coverage_score - b.coverage_score || a.active - b.active || a.label.localeCompare(b.label, 'ar'));
  const categoryLabelByKey = new Map(strategicCoverageCategories);
  const categories = [...byCategory.entries()].map(([key, rows]) => {
    const stats = eventCoverageStats(rows);
    const score = coverageScore(stats);
    return {
      key,
      label: categoryLabelByKey.get(key) || categoryLabel(key.replace(/\s+/g, '-'), key),
      ...stats,
      coverage_score: score,
      severity: coverageSeverity(score),
      next_action: coverageNextAction(stats)
    };
  }).sort((a, b) => a.coverage_score - b.coverage_score || a.active - b.active || a.label.localeCompare(b.label, 'ar'));
  const sourceRisks = sourceRiskRows();
  const mediaGaps = mediaGapRows(events);
  const priorityQueue = [
    ...sourceRisks.slice(0, 4).map((row) => ({ kind: 'source', kind_label: 'مصدر', key: row.id, label: row.label, coverage_score: row.coverage_score, reason: row.reason, next_action: row.next_action })),
    ...mediaGaps.slice(0, 5).map((row) => ({ kind: 'media', kind_label: 'صورة', key: row.id, label: row.title, coverage_score: row.coverage_score, reason: row.reason, next_action: row.next_action })),
    ...cities.slice(0, 8).map((row) => ({ kind: 'city', kind_label: 'مدينة', key: row.key, label: row.label, coverage_score: row.coverage_score, reason: row.active ? 'تغطية نشطة ضعيفة' : 'لا توجد فعاليات قادمة/جارية', next_action: row.next_action })),
    ...categories.slice(0, 6).map((row) => ({ kind: 'category', kind_label: 'فئة', key: row.key, label: row.label, coverage_score: row.coverage_score, reason: row.active ? 'تحتاج صورًا أو جداول حية أكثر' : 'لا توجد فعاليات قادمة/جارية', next_action: row.next_action }))
  ].sort((a, b) => a.coverage_score - b.coverage_score).slice(0, 16);
  const activeEvents = events.filter((event) => event.status !== 'ended').length;
  const activeGeneratedCovers = events.filter((event) => event.status !== 'ended' && event.generated_image).length;
  const activeSourceImages = events.filter((event) => event.status !== 'ended' && !event.generated_image && /\/assets\/event-images\//.test(event.image_url || '')).length;
  const report = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    intent: 'eventlive-source-coverage-gaps',
    totals: {
      events: events.length,
      cities: cities.length,
      weak_cities: cities.filter((row) => row.severity !== 'healthy').length,
      categories: categories.length,
      weak_categories: categories.filter((row) => row.severity !== 'healthy').length,
      source_risks: sourceRisks.length,
      active_events: activeEvents,
      ended_events: events.length - activeEvents,
      active_source_images: activeSourceImages,
      active_generated_covers: activeGeneratedCovers,
      media_gaps: mediaGaps.length
    },
    cities,
    categories,
    source_risks: sourceRisks,
    media_gaps: mediaGaps,
    priority_queue: priorityQueue,
    links: {
      events: absoluteUrl('events.json'),
      sources: absoluteUrl('sources.json'),
      source_health: absoluteUrl('source-health.json')
    },
    operating_rule: 'Coverage gaps are generated from the current public event catalog on every build.'
  };
  writeJson('source-coverage-gaps.json', report);
  const canonical = absoluteUrl('source-coverage-gaps.html');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `فجوات تغطية المصادر | ${platformName}`, description: 'لوحة تشغيلية تحدد أضعف المدن والفئات والمصادر في EventLive بناء على كتالوج الفعاليات المنشور حاليًا.', canonical })}
  ${operationalPageCss()}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'WebPage', inLanguage: 'ar-SA', name: 'فجوات تغطية المصادر', url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }, dateModified: buildAt })}
</head>
<body>
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>تشغيل المصادر</span><h1>فجوات تغطية المصادر</h1><p class="lead">هذه اللوحة تتجدد مع كل بناء وتكشف أين نحتاج جلبًا أعمق: مدينة بلا فعاليات قادمة، فئة بلا صور، أو مصدر يحتاج إصلاحًا قبل الدورة التالية.</p><div class="signal-strip"><div class="signal"><span>فعاليات محللة</span><b>${report.totals.events}</b></div><div class="signal"><span>مدن ضعيفة</span><b>${report.totals.weak_cities}</b></div><div class="signal"><span>صور نشطة</span><b>${report.totals.active_source_images}</b></div><div class="signal"><span>فجوات صور</span><b>${report.totals.active_generated_covers}</b></div></div></div></section>
  <section class="section"><div class="wrap"><h2>طابور الأولويات</h2><div class="priority">${priorityQueue.map((item) => `<article class="priority-row"><div class="score">${item.coverage_score}</div><div><b>${escapeHtml(item.kind_label)}: ${escapeHtml(item.label)}</b><p class="muted">${escapeHtml(item.reason)}</p><p>${escapeHtml(item.next_action)}</p></div></article>`).join('')}</div></div></section>
  <section class="section"><div class="wrap"><h2>فجوات الصور النشطة</h2>${operationalTable(['الفعالية', 'المدينة', 'المصدر', 'السبب', 'الإجراء'], mediaGaps, (row) => `<tr><th><a href="${escapeHtml(row.detail_url || './events.html')}">${escapeHtml(row.title)}</a></th><td>${escapeHtml(row.city)}</td><td>${escapeHtml(row.source_label)}<br><span class="muted">${escapeHtml(row.source_host)}</span></td><td>${escapeHtml(row.reason)}</td><td>${escapeHtml(row.next_action)}</td></tr>`)}</div></section>
  <section class="section"><div class="wrap"><h2>أضعف المدن</h2>${operationalTable(['المدينة', 'الكل', 'نشطة', 'منتهية', 'جداول حية', 'صور', 'أغلفة', 'الدرجة', 'الإجراء'], cities.slice(0, 24), (row) => `<tr><th>${escapeHtml(row.label)}<br><span class="${row.severity}">${row.severity}</span></th>${metricCells(row)}<td>${escapeHtml(row.next_action)}</td></tr>`)}</div></section>
  <section class="section"><div class="wrap"><h2>أضعف الفئات</h2>${operationalTable(['الفئة', 'الكل', 'نشطة', 'منتهية', 'جداول حية', 'صور', 'أغلفة', 'الدرجة', 'الإجراء'], categories.slice(0, 24), (row) => `<tr><th>${escapeHtml(row.label)}<br><span class="${row.severity}">${row.severity}</span></th>${metricCells(row)}<td>${escapeHtml(row.next_action)}</td></tr>`)}</div></section>
  <section class="section"><div class="wrap"><article class="readiness"><h2>ملف البيانات</h2><p>يمكن قراءة هذه اللوحة آليًا من <a href="./source-coverage-gaps.json">source-coverage-gaps.json</a>.</p></article></div></section>
</main>
${footer('./')}
</body>
</html>`;
  writeText(path.join(distDir, 'source-coverage-gaps.html'), html);
}

function readReport(relativePath, fallback = {}) {
  try {
    return readJson(relativePath, fallback);
  } catch {
    return fallback;
  }
}

function writeOwnerStatusPage(events) {
  const analytics = readReport('reports/analytics-status.json', {});
  const runState = readReport('reports/source-run-state-report.json', {});
  const autoPublish = readReport('reports/source-auto-publish-report.json', {});
  const secondary = readReport('reports/source-secondary-verification-report.json', {});
  const sourceOps = readReport('reports/source-ops-report.json', {});
  const sourceCollection = readReport('reports/source-collection-report.json', {});
  const blockedReasons = (autoPublish.blocked || []).reduce((totals, candidate) => {
    const reason = candidate.reason || 'unknown';
    totals[reason] = (totals[reason] || 0) + 1;
    return totals;
  }, {});
  const collectorErrorSources = (sourceCollection.sources || [])
    .filter((source) => source.status === 'error')
    .map((source) => ({ id: source.id, note: source.note || 'collector error' }));
  const status = {
    generated_at: buildAt,
    platform: platformName,
    domain: platformDomain,
    intent: 'eventlive-owner-status',
    analytics: {
      provider: analytics.provider || 'plausible',
      domain: analytics.domain || platformDomain,
      status: analytics.status || 'INSTRUMENTED',
      instrumentation_status: analytics.instrumentation_status || analytics.status || 'INSTRUMENTED',
      dashboard_url: analytics.dashboard_url || `https://plausible.io/${analytics.domain || platformDomain}`,
      dashboard_login_url: analytics.dashboard_login_url || `https://plausible.io/login?return_to=%2F${encodeURIComponent(analytics.domain || platformDomain)}`,
      dashboard_status: analytics.dashboard_status || 'NEEDS_PROVIDER_SETUP',
      dashboard_setup_required: analytics.dashboard_setup_required !== false,
      dashboard_note: analytics.dashboard_note || 'إذا ظهرت صفحة 404 في Plausible فهذا يعني أن لوحة الدومين تحتاج إنشاء أو تسجيل دخول بحساب المالك.',
      tracked_events: analytics.tracked_events || [],
      privacy: analytics.privacy || { cookies: false, pii: false },
      note: 'هذه الصفحة تثبت أن التتبع مزروع في الصفحات العامة. أرقام الزوار الحقيقية تظهر بعد تفعيل لوحة مزود التحليلات للدومين.'
    },
    source_sync: {
      last_run_at: runState.generated_at || sourceOps.generated_at || '',
      registered_sources: runState.totals?.sources || sourceOps.sources?.length || 0,
      attempted_sources: runState.totals?.attempted || sourceOps.collection?.attempted_sources || 0,
      productive_sources: runState.totals?.productive || 0,
      collector_errors: runState.totals?.collector_errors || 0,
      zero_yield: runState.totals?.zero_yield || 0,
      candidates_seen: autoPublish.totals?.candidates_seen || sourceOps.queue?.total || 0,
      published_new: autoPublish.totals?.published || 0,
      linked_existing: autoPublish.totals?.linked_existing || 0,
      blocked_remaining: autoPublish.totals?.blocked || 0,
      secondary_promoted: secondary.totals?.promoted || 0,
      secondary_still_blocked: secondary.totals?.still_blocked || 0,
      blocked_reasons: blockedReasons,
      collector_error_sources: collectorErrorSources
    },
    catalog: {
      public_events: events.length,
      live_ready: events.filter((event) => event.live_schedule_ready).length,
      ended_events: events.filter((event) => event.status === 'ended').length,
      upcoming_or_ongoing: events.filter((event) => event.status !== 'ended').length
    },
    links: {
      analytics_dashboard: analytics.dashboard_url || `https://plausible.io/${analytics.domain || platformDomain}`,
      source_health: './source-health.html',
      source_coverage: './source-coverage-gaps.html',
      events_json: './events.json'
    }
  };
  const analyticsDashboardReady = status.analytics.dashboard_status === 'CONFIRMED';
  const analyticsDashboardHref = analyticsDashboardReady ? status.analytics.dashboard_url : status.analytics.dashboard_login_url;
  const analyticsDashboardLabel = analyticsDashboardReady ? 'فتح لوحة الزيارات' : 'تسجيل الدخول/إعداد Plausible';
  const analyticsStatusCopy = analyticsDashboardReady
    ? 'لوحة الزيارات مؤكدة ومربوطة بالدومين.'
    : 'التتبع مزروع في الصفحات العامة، لكن لوحة الأرقام لم تؤكد بعد. ظهور 404 في Plausible يعني إنشاء موقع eventme.live داخل Plausible أو الدخول بالحساب المالك.';
  writeJson('owner-status.json', status);
  const canonical = absoluteUrl('owner-status.html');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `حالة المالك | ${platformName}`, description: 'صفحة مخفية للمالك تعرض حالة الجلب الدوري والقياس التشغيلي في EventLive.', canonical, noindex: true })}
  ${operationalPageCss()}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'WebPage', inLanguage: 'ar-SA', name: 'حالة مالك EventLive', url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }, dateModified: buildAt })}
</head>
<body>
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>للمالك فقط</span><h1>حالة التشغيل والقياس</h1><p class="lead">افتح هذه الصفحة بعد النشر لمعرفة آخر جلب دوري، كم نشر، كم بقي محجوبًا، وهل القياس مزروع. أرقام الزوار التفصيلية لا تظهر إلا بعد تفعيل لوحة Plausible للدومين بحساب المالك.</p><div class="signal-strip"><div class="signal"><span>فعاليات منشورة</span><b>${status.catalog.public_events}</b></div><div class="signal"><span>نشر جديد آخر دورة</span><b>${status.source_sync.published_new}</b></div><div class="signal"><span>ترقية ثانوية</span><b>${status.source_sync.secondary_promoted}</b></div><div class="signal"><span>جداول حية</span><b>${status.catalog.live_ready}</b></div></div></div></section>
  <section class="section"><div class="wrap grid">
    <article class="activation-card"><h2>الزيارات والتحليلات</h2><p>حالة الزر: <strong>${escapeHtml(status.analytics.dashboard_status)}</strong></p><p>المزود: <strong>${escapeHtml(status.analytics.provider)}</strong></p><p>الدومين: <strong>${escapeHtml(status.analytics.domain)}</strong></p><p>الخصوصية: بدون كوكيز وبدون بيانات شخصية حسب إعدادات التقرير.</p><p><strong>${escapeHtml(analyticsStatusCopy)}</strong></p><div class="activation-actions"><a class="cta" href="${escapeHtml(analyticsDashboardHref)}" target="_blank" rel="noopener">${escapeHtml(analyticsDashboardLabel)}</a><a class="cta" href="./owner-status.json">بيانات الصفحة JSON</a></div></article>
    <article class="activation-card"><h2>آخر جلب دوري</h2><p>آخر تقرير: <strong>${escapeHtml(status.source_sync.last_run_at || 'غير متاح')}</strong></p><p>مصادر منتجة: <strong>${status.source_sync.productive_sources}</strong> · أخطاء: <strong>${status.source_sync.collector_errors}</strong> · صفرية: <strong>${status.source_sync.zero_yield}</strong></p><p>مرشحون: <strong>${status.source_sync.candidates_seen}</strong> · منشور جديد: <strong>${status.source_sync.published_new}</strong> · مربوط بموجود: <strong>${status.source_sync.linked_existing}</strong></p><div class="activation-actions"><a class="cta" href="./source-health.html">صحة المصادر</a><a class="cta" href="./source-coverage-gaps.html">فجوات التغطية</a></div></article>
  </div></section>
  <section class="section"><div class="wrap"><h2>ماذا أراقب؟</h2>${operationalTable(['المؤشر', 'القيمة', 'متى أقلق؟'], [
    ['blocked_remaining', status.source_sync.blocked_remaining, 'إذا بقي مرتفعًا لعدة دورات، نطوّر تحققًا ثانويًا أو مصادر رسمية بديلة.'],
    ['secondary_promoted', status.source_sync.secondary_promoted, 'إذا كان صفرًا دائمًا، فالمطابقة الرسمية لا تعمل أو لا توجد أدلة كافية.'],
    ['collector_errors', status.source_sync.collector_errors, 'إذا زادت الأخطاء، نصلح collectors أو نعيد تصنيف المصدر.'],
    ['tracked_events', status.analytics.tracked_events.length, 'إذا صارت صفرًا، فالقياس غير مزروع في الصفحات العامة.']
  ], (row) => `<tr><th>${escapeHtml(row[0])}</th><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>`)}</div></section>
  <section class="section"><div class="wrap"><h2>أسباب الحجب في آخر دورة</h2>${operationalTable(['السبب', 'العدد'], Object.entries(status.source_sync.blocked_reasons).sort((a, b) => b[1] - a[1]), (row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td></tr>`)}</div></section>
  <section class="section"><div class="wrap"><h2>مصادر تحتاج إصلاحًا</h2>${operationalTable(['المصدر', 'العلة'], status.source_sync.collector_error_sources, (row) => `<tr><td><code>${escapeHtml(row.id)}</code></td><td>${escapeHtml(row.note)}</td></tr>`)}</div></section>
</main>
${footer('./')}
</body>
</html>`;
  writeText(path.join(distDir, 'owner-status.html'), html);
}

function writeRegionsCoveragePage(events) {
  const registeredByCity = registeredSourcesByCity();
  const regions = saudiRegions.map(([key, label, targetCityKeys]) => {
    const targetCities = targetCityKeys.map((city) => ({ key: city, label: cityLabel(city) }));
    const citySet = new Set(targetCityKeys);
    const rows = events.filter((event) => citySet.has(event.city));
    const stats = eventCoverageStats(rows);
    const coveredCities = targetCities.filter((city) => rows.some((event) => event.city === city.key));
    const activeCities = targetCities.filter((city) => rows.some((event) => event.city === city.key && event.status !== 'ended'));
    const missingTargetCities = targetCities.filter((city) => !coveredCities.some((covered) => covered.key === city.key));
    const registeredSources = targetCityKeys.flatMap((city) => registeredByCity.get(city) || []);
    const uniqueRegistered = [...new Map(registeredSources.map((source) => [source.id, source])).values()];
    const score = regionCoverageScore(stats, targetCities.length, activeCities.length, uniqueRegistered.length);
    return {
      key,
      label,
      target_cities: targetCities,
      covered_cities: coveredCities,
      active_cities: activeCities,
      active_target_city_count: activeCities.length,
      active_target_city_ratio: Number((activeCities.length / targetCities.length).toFixed(4)),
      active_event_target: 10,
      missing_target_cities: missingTargetCities,
      ...stats,
      registered_source_count: uniqueRegistered.length,
      registered_sources: uniqueRegistered,
      coverage_score: score,
      severity: coverageSeverity(score),
      next_action: coverageNextAction(stats, uniqueRegistered.length)
    };
  }).sort((a, b) => a.coverage_score - b.coverage_score || a.label.localeCompare(b.label, 'ar'));
  const activeEvents = events.filter((event) => event.status !== 'ended').length;
  const nationalCoverage = nationalCoverageSummary(regions, activeEvents);
  const priorityQueue = regions.slice(0, 10).map((region) => ({
    key: region.key,
    label: region.label,
    coverage_score: region.coverage_score,
    reason: region.active ? 'تحتاج عمقًا أكبر في المدن المستهدفة' : 'لا توجد فعاليات قادمة/جارية في المنطقة',
    next_action: region.next_action
  }));
  const report = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    intent: 'eventlive-saudi-region-coverage',
    totals: {
      regions: regions.length,
      weak_regions: regions.filter((region) => region.severity !== 'healthy').length,
      active_regions: regions.filter((region) => region.active > 0).length,
      uncovered_regions: regions.filter((region) => region.total === 0).length,
      zero_active_regions: nationalCoverage.zero_active_regions,
      active_target_cities: nationalCoverage.active_target_cities,
      target_cities: nationalCoverage.target_cities,
      events: events.length,
      active_events: activeEvents,
      ended_events: events.length - activeEvents
    },
    national_coverage: nationalCoverage,
    regions,
    priority_queue: priorityQueue,
    links: {
      events: absoluteUrl('events.json'),
      source_coverage_gaps: absoluteUrl('source-coverage-gaps.json')
    },
    operating_rule: 'Region coverage is generated from the current public event catalog on every build.'
  };
  writeJson('regions.json', report);
  const canonical = absoluteUrl('regions.html');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `تغطية مناطق المملكة | ${platformName}`, description: 'لوحة EventLive لتغطية مناطق المملكة الثلاث عشرة بالفعاليات القادمة والمنتهية ومصادر الجلب.', canonical })}
  ${operationalPageCss()}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'WebPage', inLanguage: 'ar-SA', name: 'تغطية مناطق المملكة', url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }, dateModified: buildAt })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'Dataset', name: 'EventLive Saudi regions coverage', url: absoluteUrl('regions.json'), creator: { '@type': 'Organization', name: platformName }, dateModified: buildAt, variableMeasured: ['regions', 'events', 'active_events', 'ended_events'] })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: regions.length, itemListElement: regions.map((region, index) => ({ '@type': 'ListItem', position: index + 1, name: region.label, url: canonical, description: region.next_action })) })}
</head>
<body>
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>تغطية وطنية</span><h1>تغطية مناطق المملكة</h1><p class="lead">قياس عملي لتوزيع فعاليات EventLive على مناطق السعودية. الهدف أن لا يبقى الحضور محصورًا في المدن الكبرى فقط.</p><div class="signal-strip"><div class="signal"><span>درجة التغطية</span><b>${nationalCoverage.score}/100</b></div><div class="signal"><span>مناطق نشطة</span><b>${report.totals.active_regions}/13</b></div><div class="signal"><span>مدن مستهدفة نشطة</span><b>${nationalCoverage.active_target_cities}/${nationalCoverage.target_cities}</b></div><div class="signal"><span>حصة الرياض</span><b>${Math.round(nationalCoverage.riyadh_active_share * 100)}%</b></div></div></div></section>
  <section class="section"><div class="wrap"><h2>طابور المناطق</h2><div class="priority">${priorityQueue.map((item) => `<article class="priority-row"><div class="score">${item.coverage_score}</div><div><b>${escapeHtml(item.label)}</b><p class="muted">${escapeHtml(item.reason)}</p><p>${escapeHtml(item.next_action)}</p></div></article>`).join('')}</div></div></section>
  <section class="section"><div class="wrap"><h2>كل المناطق</h2>${operationalTable(['المنطقة', 'الكل', 'نشطة', 'منتهية', 'جداول حية', 'صور', 'أغلفة', 'الدرجة', 'الإجراء'], regions, (row) => `<tr><th>${escapeHtml(row.label)}<br><span class="${row.severity}">${row.severity}</span></th>${metricCells(row)}<td>${escapeHtml(row.next_action)}</td></tr>`)}</div></section>
  <section class="section"><div class="wrap"><article class="readiness"><h2>ملف البيانات</h2><p>يمكن قراءة تغطية المناطق آليًا من <a href="./regions.json">regions.json</a>.</p></article></div></section>
</main>
${footer('./')}
</body>
</html>`;
  writeText(path.join(distDir, 'regions.html'), html);
}

function daysSince(value = '') {
  const date = dateValue(value);
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function eventEvidenceGaps(event = {}) {
  const gaps = [];
  if (!event.source_url && !event.evidence_url) gaps.push('مصدر أو رابط دليل غير مكتمل');
  if (!/published|reviewed|approved/i.test(String(event.approval_status || ''))) gaps.push('الاعتماد النهائي غير مكتمل');
  if (!event.live_schedule_ready) gaps.push(event.attendance_window_ready ? 'الجدول التفصيلي لم يفعل بعد' : 'الجدول الحي لم يفعل بعد');
  if (!Number(event.sessions_count || 0) && !event.attendance_window_ready) gaps.push('لا توجد نافذة حضور أو جلسات مفصلة');
  if (!event.image_url) gaps.push('الصورة أو الغلاف غير جاهز');
  return gaps;
}

function eventFreshness(event = {}) {
  const days = daysSince(event.updated_at || event.starts_at);
  if (days === null) return { key: 'unknown', label: 'غير معروف', days: null, score: 0 };
  if (days <= 7) return { key: 'fresh', label: 'محدث خلال أسبوع', days, score: 15 };
  if (days <= 30) return { key: 'recent', label: 'محدث خلال شهر', days, score: 10 };
  if (days <= 120) return { key: 'aging', label: 'يحتاج متابعة', days, score: 5 };
  return { key: 'stale', label: 'قديم ويحتاج إعادة فحص', days, score: 0 };
}

function eventTrust(event = {}) {
  const freshness = eventFreshness(event);
  let score = 0;
  if (/approved|official|partner|venue/i.test(String(event.source_confidence || event.source_label || ''))) score += 30;
  if (event.source_url || event.evidence_url) score += 20;
  if (/published|reviewed|approved/i.test(String(event.approval_status || ''))) score += 15;
  if (event.live_schedule_ready) score += 15;
  if (Number(event.sessions_count || 0) > 0) score += 10;
  if (!event.generated_image && /\/assets\/event-images\//.test(event.image_url || '')) score += 5;
  score += freshness.score;
  score = Math.min(100, score);
  if (score >= 82) return { key: 'trusted', label: 'ثقة عالية', score, freshness };
  if (score >= 58) return { key: 'review', label: 'قابل للنشر مع مراجعة', score, freshness };
  return { key: 'evidence-needed', label: 'يحتاج دليلًا أقوى', score, freshness };
}

function eventReadiness(event = {}) {
  const gaps = eventEvidenceGaps(event);
  const missingSource = gaps.some((gap) => /مصدر|دليل/.test(gap));
  const missingApproval = gaps.some((gap) => /اعتماد/.test(gap));
  let stage = { key: 'needs-program', label: 'يحتاج برنامجًا أو جلسات', rank: 4 };
  if (event.live_schedule_ready) stage = { key: 'live-ready', label: 'جاهز للزوار', rank: 0 };
  else if (missingApproval) stage = { key: 'needs-approval', label: 'يحتاج اعتمادًا', rank: 1 };
  else if (missingSource) stage = { key: 'needs-source', label: 'يحتاج مصدرًا', rank: 2 };
  else if (event.attendance_window_ready) stage = { key: 'basic-window', label: 'نافذة حضور أساسية', rank: 3 };
  const trust = eventTrust(event);
  const readinessScore = Math.min(100, Math.round((trust.score * 0.55) + (event.live_schedule_ready ? 30 : 0) + (Number(event.sessions_count || 0) ? 10 : 0) + (!event.generated_image ? 5 : 0)));
  return {
    stage,
    trust,
    evidence_gaps: gaps,
    activation_blockers: gaps.filter((gap) => /مصدر|اعتماد|جدول|جلسات/.test(gap)),
    readiness_score: readinessScore,
    action: event.live_schedule_ready
      ? { label: 'فتح الجدول الحي', url: event.detail_url || './event.html' }
      : { label: 'فتح بطاقة الفعالية', url: event.detail_url || './events.html' }
  };
}

function operationsEventRow(event = {}) {
  const readiness = eventReadiness(event);
  return {
    id: event.id,
    title: event.title,
    organizer: event.organizer,
    city: event.city_label || cityLabel(event.city),
    venue: event.venue,
    category: event.category_label || event.category,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    updated_at: event.updated_at,
    status: event.status,
    status_label: event.status_label,
    live_schedule_ready: Boolean(event.live_schedule_ready),
    attendance_window_ready: Boolean(event.attendance_window_ready),
    attendance_window: event.attendance_window || null,
    schedule_quality: event.schedule_quality || 'missing',
    sessions_count: Number(event.sessions_count || 0),
    detail_url: event.detail_url,
    live_url: event.detail_url || './event.html',
    calendar_url: event.ics_url,
    source_label: event.source_label,
    source_url: event.source_url,
    evidence_url: event.evidence_url,
    source_confidence: event.source_confidence,
    source_confidence_label: /approved|official/i.test(String(event.source_confidence || '')) ? 'مصدر معتمد' : 'مصدر يحتاج متابعة',
    approval_status: event.approval_status,
    approval_status_label: event.approval_status_label,
    published_by: event.published_by,
    trust: readiness.trust,
    trust_score: readiness.trust.score,
    trust_label: readiness.trust.label,
    evidence_gaps: readiness.evidence_gaps,
    activation_blockers: readiness.activation_blockers,
    stage: readiness.stage,
    action: readiness.action,
    readiness_score: readiness.readiness_score
  };
}

function sourceNeedForEvent(event = {}, readiness = eventReadiness(event)) {
  if (!event.source_url && !event.evidence_url) {
    return {
      key: 'source-evidence',
      label: 'تثبيت رابط المصدر',
      required_source: 'رابط رسمي أو دليل مصدر محفوظ',
      automation_policy: 'لا ينشر آليًا حتى يوجد رابط دليل قابل للفحص.',
      gate: 'source-evidence'
    };
  }
  if (!/published|reviewed|approved/i.test(String(event.approval_status || ''))) {
    return {
      key: 'organizer-approval',
      label: 'اعتماد الجهة المنظمة',
      required_source: 'اعتماد منظم أو مصدر رسمي يؤكد البيانات',
      automation_policy: 'يبقى مرشحًا حتى يمر اعتماد النشر.',
      gate: 'approval-status'
    };
  }
  if (!Number(event.sessions_count || 0) && !event.attendance_window_ready) {
    return {
      key: 'program-file',
      label: 'جمع ملف البرنامج',
      required_source: 'جدول جلسات، ملف برنامج، أو رابط أجندة رسمي',
      automation_policy: 'استخرج الجلسات آليًا بعد حفظ المصدر الخام، ثم مررها على التحقق.',
      gate: 'schema-validation'
    };
  }
  if (!event.live_schedule_ready) {
    return {
      key: 'live-schedule',
      label: event.attendance_window_ready ? 'إضافة الجدول التفصيلي' : 'تفعيل الجدول الحي',
      required_source: event.attendance_window_ready ? 'قائمة الفقرات والجلسات فوق نافذة الحضور الأساسية' : 'قائمة فقرات أو جلسات بتوقيت ومكان واضح',
      automation_policy: event.attendance_window_ready ? 'تبقى الفعالية قابلة للاستخدام للزائر، وتُرقى تلقائيًا عند ظهور البرنامج التفصيلي.' : 'يمكن تفعيلها آليًا بعد اكتمال الجلسات والوقت.',
      gate: 'live-ready'
    };
  }
  return {
    key: 'monitor-official',
    label: 'مراقبة المصدر',
    required_source: 'المصدر الحالي كافٍ، وتستمر المزامنة الدورية.',
    automation_policy: 'راقب المصدر للتحديثات والصور وتغييرات الوقت.',
    gate: 'periodic-sync'
  };
}

function sourceRequestUrl(event = {}, sourceNeed = sourceNeedForEvent(event)) {
  const subject = `مصدر فعالية عبر EventLive: ${event.title || ''}`;
  const body = [
    'مرحباً EventLive،',
    '',
    `أرغب في تزويدكم بمصدر لهذه الفعالية: ${event.title || ''}`,
    `المدينة: ${event.city_label || cityLabel(event.city)}`,
    `المكان: ${event.venue || ''}`,
    `المطلوب: ${sourceNeed.required_source}`,
    '',
    'رابط المصدر أو المرفق:',
    'اسم الجهة المالكة للمصدر:',
    'هل المصدر رسمي أو قابل للتحقق؟',
    'ملاحظات:'
  ].join('\n');
  return `mailto:hello@eventme.live?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function sourceEventRow(event = {}) {
  const readiness = eventReadiness(event);
  const sourceNeed = sourceNeedForEvent(event, readiness);
  return {
    id: event.id,
    title: event.title,
    organizer: event.organizer,
    city: event.city_label || cityLabel(event.city),
    venue: event.venue,
    category: event.category_label || event.category,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    updated_at: event.updated_at,
    status: event.status,
    status_label: event.status_label,
    attendance_window_ready: Boolean(event.attendance_window_ready),
    attendance_window: event.attendance_window || null,
    schedule_quality: event.schedule_quality || 'missing',
    detail_url: event.detail_url,
    live_url: event.live_schedule_ready ? event.detail_url : '',
    source_label: event.source_label,
    source_url: event.source_url,
    evidence_url: event.evidence_url,
    source_confidence: event.source_confidence,
    source_confidence_label: /approved|official/i.test(String(event.source_confidence || event.source_label || '')) ? 'مصدر معتمد' : 'مصدر يحتاج متابعة',
    approval_status: event.approval_status,
    approval_status_label: event.approval_status_label,
    readiness_stage: readiness.stage,
    readiness_score: readiness.readiness_score,
    trust_score: readiness.trust.score,
    trust_label: readiness.trust.label,
    source_need: sourceNeed,
    evidence_gaps: readiness.evidence_gaps,
    automation_ready: readiness.stage.key === 'live-ready' && readiness.trust.key === 'trusted',
    request_url: sourceRequestUrl(event, sourceNeed)
  };
}

function writePublicSourcesPage(events) {
  const rows = events
    .map(sourceEventRow)
    .sort((a, b) => a.readiness_stage.rank - b.readiness_stage.rank || b.trust_score - a.trust_score);
  const report = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    intent: 'eventlive-source-acquisition-pipeline',
    automation_boundary: {
      discover: 'اكتشاف المصادر العامة أو المرسلة من المنظمين مسموح كمرحلة أولى.',
      preserve: 'يجب حفظ رابط أو وصف المصدر قبل أي استخراج.',
      extract: 'الاستخراج الآلي مسموح بعد حفظ المصدر الخام.',
      publish: 'النشر العام يتطلب تحقق المخطط ومصدرًا رسميًا أو دليلًا قابلًا للفحص.'
    },
    totals: {
      events: events.length,
      needs_source_evidence: rows.filter((row) => row.source_need.key === 'source-evidence').length,
      needs_program_file: rows.filter((row) => row.source_need.key === 'program-file').length,
      needs_detailed_schedule: rows.filter((row) => row.source_need.key === 'live-schedule').length,
      attendance_windows: rows.filter((row) => row.attendance_window_ready).length,
      needs_organizer_approval: rows.filter((row) => row.source_need.key === 'organizer-approval').length,
      activation_ready: rows.filter((row) => row.automation_ready).length,
      monitor_official: rows.filter((row) => row.source_need.key === 'monitor-official').length
    },
    events: rows
  };
  writeJson('sources.json', report);
  const canonical = absoluteUrl('sources.html');
  const html = `<!doctype html><html lang="ar" dir="rtl"><head>
  ${baseHead({
    title: `مصادر الفعاليات | ${platformName}`,
    description: 'لوحة مصادر EventLive العامة تعرض حالة المصدر والدليل والبرنامج لكل فعالية في الكتالوج، وتتجدد مع كل بناء من eventme.live.',
    canonical
  })}
  <link rel="alternate" type="application/json" href="./sources.json" />
  ${pageCss}
  ${operationalPageCss()}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'EventLive Source Acquisition Pipeline',
    description: 'مسار توريد مصادر EventLive يوضح المصدر المطلوب وسياسة الأتمتة وبوابة الاعتماد قبل تحويل الفعاليات إلى جداول حية.',
    inLanguage: 'ar-SA',
    url: absoluteUrl('sources.json'),
    dateModified: buildAt,
    creator: { '@type': 'Organization', name: platformName, url: siteUrl }
  })}
</head><body>
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>مصادر وثقة</span><h1>مصادر الفعاليات</h1><p class="lead">هذه اللوحة تقرأ الكتالوج الحالي مباشرة وتوضح أين نثق بالمصدر، وأين نحتاج برنامجًا أو اعتمادًا إضافيًا قبل الجدول الحي.</p><div class="signal-strip"><div class="signal"><span>الفعاليات</span><b>${report.totals.events}</b></div><div class="signal"><span>نوافذ حضور</span><b>${report.totals.attendance_windows}</b></div><div class="signal"><span>تحتاج تفاصيل</span><b>${report.totals.needs_detailed_schedule}</b></div><div class="signal"><span>مراقبة دورية</span><b>${report.totals.monitor_official}</b></div></div></div></section>
  <section class="section"><div class="wrap"><article class="activation-card"><h2>حدود النشر الآلي</h2><p>نكتشف ونحفظ ونستخرج، لكن لا ننشر بطاقة عامة بلا مصدر أو دليل قابل للفحص. عندما يكتمل البرنامج والجلسات يصبح الحدث أقرب إلى قيمة EventLive الأساسية: الحضور الحي في وقت الفعالية.</p><div class="activation-actions"><a class="cta" href="./sources.json">ملف المصادر JSON</a><a class="cta" href="./methodology.html">المنهجية</a></div></article></div></section>
  <section class="section"><div class="wrap"><h2>أولويات المصادر</h2>${operationalTable(['الفعالية', 'المدينة', 'المصدر', 'الحاجة', 'الثقة'], rows.slice(0, 80), (row) => `<tr><th><a href="${escapeHtml(row.detail_url)}">${escapeHtml(row.title)}</a><br><span class="muted">${escapeHtml(row.organizer || '')}</span></th><td>${escapeHtml(row.city)}</td><td>${escapeHtml(row.source_label || '')}</td><td>${escapeHtml(row.source_need.label)}</td><td>${row.trust_score}<br>${escapeHtml(row.trust_label)}</td></tr>`)}</div></section>
</main>
${footer('./')}
</body></html>`;
  writeText(path.join(distDir, 'sources.html'), html);
}

function liveUpdatePriority(level = '') {
  if (/room|change|cancel/i.test(level)) return { rank: 1, label: 'تغيير مهم' };
  if (/delay|time/i.test(level)) return { rank: 2, label: 'تنبيه وقت' };
  if (/traffic|arrival/i.test(level)) return { rank: 3, label: 'وصول' };
  return { rank: 4, label: 'معلومة' };
}

function liveUpdateLevelLabel(level = '') {
  if (/room|change/i.test(level)) return 'تغيير قاعة';
  if (/delay|time/i.test(level)) return 'تنبيه وقت';
  if (/traffic|arrival/i.test(level)) return 'وصول';
  if (/cancel/i.test(level)) return 'إلغاء أو تعديل';
  return 'تحديث';
}

function liveUpdateRows(events) {
  const rows = [];
  for (const event of events) {
    const updates = Array.isArray(event.live_updates) ? event.live_updates : [];
    for (const update of updates) {
      const session = update.session_id
        ? (event.sessions || []).find((item) => item.id === update.session_id)
        : null;
      rows.push({
        id: update.id || `${event.id}-update-${rows.length + 1}`,
        event_id: event.id,
        event_title: event.title,
        event_city: event.city_label || cityLabel(event.city),
        event_venue: event.venue,
        title: update.title || 'تحديث فعالية',
        message: update.message || '',
        level: update.level || 'info',
        level_label: liveUpdateLevelLabel(update.level),
        priority: liveUpdatePriority(update.level),
        priority_label: liveUpdatePriority(update.level).label,
        action: update.action || '',
        session_id: update.session_id || '',
        session_title: session?.title || session?.session_title || '',
        session_room: session?.room || session?.track || '',
        session_start_at: session?.starts_at || session?.start_at || '',
        effective_at: update.effective_at || update.updated_at || buildAt,
        updated_at: update.updated_at || buildAt,
        source_label: update.source_label || event.source_label || '',
        verified_by: update.verified_by || event.published_by || platformName,
        event_url: event.detail_url || './events.html',
        detail_url: event.detail_url || './events.html',
        directions_url: event.directions_url || ''
      });
    }
  }
  return rows.sort((a, b) => a.priority.rank - b.priority.rank || (dateValue(b.updated_at)?.getTime() || 0) - (dateValue(a.updated_at)?.getTime() || 0));
}

function liveUpdatesPayload(events) {
  const rows = liveUpdateRows(events);
  return {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    intent: 'eventlive-live-updates-center',
    totals: {
      updates: rows.length,
      linked_to_sessions: rows.filter((row) => row.session_id).length,
      urgent: rows.filter((row) => row.priority.rank <= 2).length,
      arrival: rows.filter((row) => row.action === 'arrival' || row.level === 'traffic').length,
      catalog_events_with_updates: events.filter((event) => Number(event.live_updates_count || 0) > 0 || (Array.isArray(event.live_updates) && event.live_updates.length > 0)).length
    },
    focus: rows[0] || null,
    updates: rows
  };
}

function writeLiveUpdatesPage(events) {
  const report = liveUpdatesPayload(events);
  const rows = report.updates;
  writeJson('updates.json', report);
  const canonical = absoluteUrl('updates.html');
  const empty = '<article class="activation-card"><h2>لا توجد تحديثات حية الآن</h2><p>عند وصول تحديث من منظم أو مصدر موثوق سيظهر هنا مع الفعالية والجلسة المرتبطة.</p></article>';
  const cards = rows.length ? rows.map((row) => `<article class="activation-card"><span class="chip">${escapeHtml(row.level_label)}</span><h2>${escapeHtml(row.title)}</h2><p>${escapeHtml(row.message)}</p><p class="muted">${escapeHtml(row.event_title)} · ${escapeHtml(row.event_city)} · ${formatDate(row.updated_at)}</p><div class="activation-actions"><a class="cta" href="${escapeHtml(row.detail_url)}">فتح الفعالية</a>${row.directions_url ? `<a class="cta" href="${escapeHtml(row.directions_url)}">الاتجاهات</a>` : ''}</div></article>`).join('') : empty;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head>
  ${baseHead({
    title: `التحديثات الحية | ${platformName}`,
    description: 'مركز تحديثات EventLive الحية للتغييرات المهمة أثناء الفعاليات: الوصول، تغيير القاعات، التنبيهات، والتحديثات المرتبطة بالجلسات.',
    canonical
  })}
  <link rel="alternate" type="application/json" href="./updates.json" />
  ${pageCss}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    inLanguage: 'ar-SA',
    name: `${platformName} | التحديثات الحية`,
    description: 'مركز تحديثات EventLive الحية للتغييرات المهمة أثناء الفعاليات.',
    url: canonical,
    dateModified: buildAt,
    isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }
  })}
</head><body>
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>يتغير الآن</span><h1>التحديثات الحية</h1><p class="lead">تنبيهات وصول وقاعات وتغييرات مهمة تظهر في وقت الفعالية أو قبلها، مرتبطة بالحدث والجلسة كلما توفرت البيانات.</p><div class="signal-strip"><div class="signal"><span>تحديثات</span><b>${report.totals.updates}</b></div><div class="signal"><span>مرتبطة بجلسات</span><b>${report.totals.linked_to_sessions}</b></div><div class="signal"><span>مهمة</span><b>${report.totals.urgent}</b></div><div class="signal"><span>فعاليات لديها تحديثات</span><b>${report.totals.catalog_events_with_updates}</b></div></div></div></section>
  <section class="section"><div class="wrap"><div class="grid">${cards}</div></div></section>
  <section class="section"><div class="wrap"><article class="activation-card"><h2>ملف التحديثات</h2><p>يُعاد توليد هذا الملف مع كل بناء حتى لا تبقى التحديثات منفصلة عن كتالوج الفعاليات.</p><div class="activation-actions"><a class="cta" href="./updates.json">ملف التحديثات JSON</a><a class="cta" href="./today.html">وضع الحضور</a></div></article></div></section>
</main>
${footer('./')}
</body></html>`;
  writeText(path.join(distDir, 'updates.html'), html);
}

function writeReadinessPage(events) {
  const rows = events.map(operationsEventRow).sort((a, b) => a.stage.rank - b.stage.rank || b.readiness_score - a.readiness_score);
  const stages = rows.reduce((acc, row) => {
    acc[row.stage.key] = (acc[row.stage.key] || 0) + 1;
    return acc;
  }, {});
  const report = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    intent: 'eventlive-operational-readiness',
    totals: {
      events: events.length,
      live_ready: rows.filter((row) => row.live_schedule_ready).length,
      attendance_windows: rows.filter((row) => row.attendance_window_ready).length,
      basic_windows: rows.filter((row) => row.schedule_quality === 'basic-window').length,
      ready_to_activate: rows.filter((row) => row.status !== 'ended' && row.live_schedule_ready).length,
      needs_source: rows.filter((row) => row.stage.key === 'needs-source').length,
      needs_approval: rows.filter((row) => row.stage.key === 'needs-approval').length,
      basic_window_stage: rows.filter((row) => row.stage.key === 'basic-window').length,
      needs_program: rows.filter((row) => row.stage.key === 'needs-program').length,
      needs_work: rows.filter((row) => row.stage.key !== 'live-ready').length
    },
    stages,
    events: rows,
    links: {
      events: absoluteUrl('events.json'),
      trust: absoluteUrl('trust.json'),
      source_coverage_gaps: absoluteUrl('source-coverage-gaps.json')
    }
  };
  writeJson('readiness.json', report);
  const canonical = absoluteUrl('readiness.html');
  const stageRows = [
    ['جاهزة للزوار', report.totals.live_ready],
    ['نوافذ حضور', report.totals.attendance_windows],
    ['نوافذ أساسية', report.totals.basic_windows],
    ['جاهزة للتفعيل الآن', report.totals.ready_to_activate],
    ['تحتاج مصدرًا', report.totals.needs_source],
    ['تحتاج اعتمادًا', report.totals.needs_approval],
    ['تحتاج برنامجًا', report.totals.needs_program]
  ];
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `جاهزية التشغيل | ${platformName}`, description: 'لوحة EventLive لقياس جاهزية الفعاليات للنشر الحي: المصدر، الاعتماد، الجلسات، الصور، ودرجة الثقة.', canonical })}
  ${operationalPageCss()}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'WebPage', inLanguage: 'ar-SA', name: 'جاهزية التشغيل', url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }, dateModified: buildAt })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'Dataset', name: 'EventLive operational readiness', url: absoluteUrl('readiness.json'), creator: { '@type': 'Organization', name: platformName }, dateModified: buildAt, variableMeasured: Object.keys(report.totals) })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: rows.length, itemListElement: rows.slice(0, 50).map((row, index) => ({ '@type': 'ListItem', position: index + 1, name: row.title, url: absoluteUrl(String(row.detail_url || 'events.html').replace(/^\.\//, '')), description: row.stage.label })) })}
</head>
<body>
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>بوابة تشغيل</span><h1>جاهزية التشغيل</h1><p class="lead">قياس محدث مع كل build يوضح أي فعاليات جاهزة للحضور الحي وأيها يحتاج مصدرًا أو اعتمادًا أو برنامج جلسات قبل أن يصبح مرجعًا كاملًا للزائر.</p><div class="signal-strip"><div class="signal"><span>فعاليات محللة</span><b>${report.totals.events}</b></div><div class="signal"><span>جداول حية</span><b>${report.totals.live_ready}</b></div><div class="signal"><span>نوافذ حضور</span><b>${report.totals.attendance_windows}</b></div><div class="signal"><span>تحتاج عملًا</span><b>${report.totals.needs_work}</b></div></div></div></section>
  <section class="section"><div class="wrap grid">${stageRows.map(([label, count]) => `<article class="activation-card"><h2>${escapeHtml(label)}</h2><p class="decision-score">${count}</p></article>`).join('')}</div></section>
  <section class="section"><div class="wrap"><h2>أولويات التشغيل</h2>${operationalTable(['الفعالية', 'الحالة', 'الثقة', 'الجلسات', 'الإجراء'], rows.slice(0, 40), (row) => `<tr><th>${escapeHtml(row.title)}<br><span class="muted">${escapeHtml(row.city)} · ${escapeHtml(row.source_label || '')}</span></th><td>${escapeHtml(row.stage.label)}</td><td>${row.trust_score}</td><td>${row.sessions_count}</td><td>${escapeHtml(row.activation_blockers[0] || row.action.label)}</td></tr>`)}</div></section>
  <section class="section"><div class="wrap"><article class="readiness"><h2>ملف البيانات</h2><p>يمكن قراءة جاهزية التشغيل آليًا من <a href="./readiness.json">readiness.json</a>.</p></article></div></section>
</main>
${footer('./')}
</body>
</html>`;
  writeText(path.join(distDir, 'readiness.html'), html);
}

function writeCompliancePolicyPages() {
  const pages = [
    {
      file: 'privacy.html',
      title: 'سياسة الخصوصية',
      description: 'سياسة EventLive لقياس الاستخدام وحماية بيانات الزوار والمنظمين على eventme.live.',
      sections: [
        ['ما الذي نجمعه؟', 'نجمع قياسات استخدام عامة تساعدنا على فهم الصفحات الأكثر فائدة، مثل فتح صفحة فعالية أو استخدام البحث أو الانتقال لوضع الحضور. لا نطلب من الزائر إنشاء حساب في النسخة الحالية.'],
        ['بيانات المنظم', 'عندما يتواصل منظم أو يطلب إضافة فعالية، نستخدم معلومات التواصل والفعالية لغرض التحقق والنشر والتواصل التشغيلي فقط.'],
        ['التحليلات', 'التحليلات يجب أن تستبعد صفحات المالك والملفات الخام، وتركز على الرحلات العامة للزائر والمنظم.'],
        ['الدومين', `الدومين الرسمي هو ${platformDomain}. أي إشارات كتابية للمنتج تستخدم EventLive بينما يبقى الدومين كما هو.`]
      ]
    },
    {
      file: 'terms.html',
      title: 'شروط الاستخدام',
      description: 'شروط استخدام EventLive كموقع مرجعي للفعاليات الحية في السعودية.',
      sections: [
        ['طبيعة الخدمة', 'EventLive مرجع تنظيمي ومعلوماتي للفعاليات، وليس بديلا عن شروط الجهة المنظمة أو منصة التذاكر أو المصدر الرسمي.'],
        ['دقة المعلومات', 'نربط الفعالية بمصدرها قدر الإمكان ونحدث البيانات دوريًا، لكن قد تتغير المواعيد والقاعات من الجهة المنظمة. يعتمد المستخدم على المصدر الرسمي عند الحضور أو الحجز.'],
        ['الاستخدام المقبول', 'لا يجوز إساءة استخدام البيانات، أو محاولة الوصول لصفحات المالك، أو إعادة نشر بيانات المصدر بشكل يخالف حقوق الجهة الأصلية.'],
        ['التحديثات', 'قد تتغير هذه الشروط مع تطور المنصة، ويعد تاريخ البناء الظاهر في التذييل مرجعًا لآخر نسخة منشورة.']
      ]
    },
    {
      file: 'source-rights.html',
      title: 'حقوق وسياسة المصادر',
      description: 'منهج EventLive في جلب الفعاليات من المصادر الرسمية وشبه الرسمية دون تجاوز الحماية أو النشر من مصادر اكتشافية.',
      sections: [
        ['مصادر موثوقة', 'ننشر من مصادر رسمية أو مصادر عامة موثوقة عندما تتوفر بيانات كافية: العنوان، التاريخ، المدينة أو المكان، ورابط المصدر.'],
        ['مصادر اكتشافية', 'منصات الاكتشاف أو المحتوى ذاتي النشر تستخدم كإشارة بحث فقط، ولا تنشر تلقائيًا كفعالية مؤكدة.'],
        ['المصادر المحمية', 'لا نتجاوز حماية bot أو الجدران الخاصة أو البيانات التي تتطلب شراكة. هذه المصادر تصنف للشراكة أو المراجعة التشغيلية.'],
        ['الصور والوسائط', 'نحاول استخدام صور المصدر عند توفرها بشكل عام ومناسب، وإلا نستخدم غلافًا مولدًا يحافظ على جودة البطاقة دون ادعاء ملكية صورة غير متاحة.'],
        ['التصحيح والإزالة', 'يمكن للجهة المنظمة طلب تصحيح، تحديث، أو إزالة صفحة فعالية عبر البريد hello@eventme.live.']
      ]
    }
  ];

  for (const page of pages) {
    const canonical = absoluteUrl(page.file);
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `${page.title} | ${platformName}`, description: page.description, canonical })}
  ${pageCss}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'WebPage', inLanguage: 'ar-SA', name: page.title, description: page.description, url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }, dateModified: buildAt })}
</head>
<body>
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>صفحة ثقة</span><h1>${escapeHtml(page.title)}</h1><p class="lead">${escapeHtml(page.description)}</p></div></section>
  <section class="section"><div class="wrap grid">${page.sections.map(([title, body]) => `<article class="activation-card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></article>`).join('')}</div></section>
</main>
${footer('./')}
</body>
</html>`;
    writeText(path.join(distDir, page.file), html);
  }
}

function writeTrustPage(events) {
  const rows = events.map(operationsEventRow).sort((a, b) => b.trust_score - a.trust_score || a.title.localeCompare(b.title, 'ar'));
  const sourceConfidence = rows.reduce((acc, row) => {
    const key = row.source_confidence || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const report = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    intent: 'public-trust-and-source-evidence',
    totals: {
      events: events.length,
      trusted: rows.filter((row) => row.trust.key === 'trusted').length,
      review: rows.filter((row) => row.trust.key === 'review').length,
      evidence_needed: rows.filter((row) => row.trust.key === 'evidence-needed').length,
      approved_or_published: rows.filter((row) => /published|reviewed|approved/i.test(String(row.approval_status || ''))).length,
      live_schedule_ready: rows.filter((row) => row.live_schedule_ready).length,
      attendance_windows: rows.filter((row) => row.attendance_window_ready).length,
      basic_windows: rows.filter((row) => row.schedule_quality === 'basic-window').length,
      stale_or_missing_update: rows.filter((row) => ['unknown', 'stale'].includes(row.trust.freshness.key)).length,
      with_evidence_gaps: rows.filter((row) => row.evidence_gaps.length > 0).length
    },
    source_confidence: sourceConfidence,
    events: rows,
    links: {
      events: absoluteUrl('events.json'),
      methodology: absoluteUrl('methodology.html'),
      readiness: absoluteUrl('readiness.json')
    }
  };
  writeJson('trust.json', report);
  const canonical = absoluteUrl('trust.html');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `مركز الثقة | ${platformName}`, description: 'مركز ثقة EventLive يوضح مصدر كل فعالية ودرجة الثقة وفجوات الدليل والاعتماد قبل النشر أو التفعيل الحي.', canonical })}
  ${operationalPageCss()}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'WebPage', inLanguage: 'ar-SA', name: 'مركز الثقة', url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }, dateModified: buildAt })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'Dataset', name: 'EventLive source trust evidence', url: absoluteUrl('trust.json'), creator: { '@type': 'Organization', name: platformName }, dateModified: buildAt, variableMeasured: Object.keys(report.totals) })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: rows.length, itemListElement: rows.slice(0, 50).map((row, index) => ({ '@type': 'ListItem', position: index + 1, name: row.title, url: absoluteUrl(String(row.detail_url || 'events.html').replace(/^\.\//, '')), description: row.trust_label })) })}
</head>
<body>
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>ثقة ومصدر</span><h1>مركز الثقة</h1><p class="lead">كل فعالية في EventLive يجب أن تحمل مصدرًا واضحًا، حالة اعتماد، وأثرًا يمكن فحصه. هذه اللوحة تتجدد مع الكتالوج العام ولا تعتمد على لقطة قديمة.</p><div class="signal-strip"><div class="signal"><span>فعاليات محللة</span><b>${report.totals.events}</b></div><div class="signal"><span>ثقة عالية</span><b>${report.totals.trusted}</b></div><div class="signal"><span>تحتاج مراجعة</span><b>${report.totals.review}</b></div><div class="signal"><span>تحتاج دليلًا</span><b>${report.totals.evidence_needed}</b></div></div></div></section>
  <section class="section"><div class="wrap grid"><article class="activation-card"><h2>منشورة أو مراجعة</h2><p class="decision-score">${report.totals.approved_or_published}</p></article><article class="activation-card"><h2>جداول حية</h2><p class="decision-score">${report.totals.live_schedule_ready}</p></article><article class="activation-card"><h2>نوافذ حضور</h2><p class="decision-score">${report.totals.attendance_windows}</p></article><article class="activation-card"><h2>فجوات دليل</h2><p class="decision-score">${report.totals.with_evidence_gaps}</p></article></div></section>
  <section class="section"><div class="wrap"><h2>أعلى الفعاليات ثقة</h2>${operationalTable(['الفعالية', 'الثقة', 'المصدر', 'الاعتماد', 'فجوات الدليل'], rows.slice(0, 40), (row) => `<tr><th>${escapeHtml(row.title)}<br><span class="muted">${escapeHtml(row.city)}</span></th><td>${row.trust_score}<br>${escapeHtml(row.trust_label)}</td><td>${escapeHtml(row.source_label || '')}</td><td>${escapeHtml(row.approval_status_label || '')}</td><td>${escapeHtml(row.evidence_gaps[0] || 'لا توجد فجوة حرجة')}</td></tr>`)}</div></section>
  <section class="section"><div class="wrap"><article class="readiness"><h2>ملف البيانات</h2><p>يمكن قراءة مركز الثقة آليًا من <a href="./trust.json">trust.json</a>.</p></article></div></section>
</main>
${footer('./')}
</body>
</html>`;
  writeText(path.join(distDir, 'trust.html'), html);
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row?.[key] || 'غير مصنف';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function writeMethodologyPage(events) {
  const registry = readJson('data/source_registry.json', { sources: [] });
  const candidates = readJson('data/source_candidates.json', { candidates: [] });
  const sources = Array.isArray(registry.sources) ? registry.sources : [];
  const candidateRows = Array.isArray(candidates.candidates) ? candidates.candidates : [];
  const publicEvents = events.length;
  const upcoming = events.filter((event) => event.status !== 'ended').length;
  const ended = events.filter((event) => event.status === 'ended').length;
  const liveReady = events.filter((event) => event.live_schedule_ready).length;
  const officialSources = sources.filter((source) => /official|government|national/i.test(`${source.trust_level} ${source.source_type}`)).length;
  const discoveryOnly = sources.filter((source) => /discovery|candidate|monitor/i.test(`${source.intake_policy} ${source.fetch_method} ${source.trust_level}`)).length;
  const partnershipNeeded = sources.filter((source) => /partnership|api/i.test(`${source.intake_policy} ${source.fetch_method}`)).length;
  const canonical = absoluteUrl('methodology.html');
  const methodology = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    public_events: publicEvents,
    upcoming_or_active: upcoming,
    ended_events: ended,
    live_ready_events: liveReady,
    registered_sources: sources.length,
    official_or_government_sources: officialSources,
    discovery_only_sources: discoveryOnly,
    partnership_needed_sources: partnershipNeeded,
    source_trust_levels: countBy(sources, 'trust_level'),
    intake_policies: countBy(sources, 'intake_policy'),
    candidate_publication_gates: countBy(candidateRows, 'publication_gate')
  };
  writeJson('methodology.json', methodology);

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({
    title: `منهجية جمع ونشر الفعاليات | ${platformName}`,
    description: 'منهجية EventLive العلنية لجمع فعاليات السعودية: مصادر موثوقة، نشر آلي مضبوط، فصل مصادر الاكتشاف، حفظ الفعاليات المنتهية، وإثراء الصور والجدول الحي.',
    canonical
  })}
  ${pageCss}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    inLanguage: 'ar-SA',
    name: 'منهجية جمع ونشر الفعاليات',
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }
  })}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    inLanguage: 'ar-SA',
    headline: 'منهجية EventLive لجمع ونشر فعاليات السعودية',
    description: 'شرح علني لآلية EventLive في اختيار المصادر، الجلب الدوري، النشر الآلي، الحجب، التكرار، الصور، وحفظ الفعاليات المنتهية.',
    dateModified: buildAt,
    mainEntityOfPage: canonical,
    author: { '@type': 'Organization', name: platformName, url: siteUrl },
    publisher: { '@type': 'Organization', name: platformName, url: siteUrl }
  })}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'EventLive methodology metrics',
    url: absoluteUrl('methodology.json'),
    creator: { '@type': 'Organization', name: platformName },
    dateModified: buildAt,
    variableMeasured: Object.keys(methodology).filter((key) => typeof methodology[key] === 'number')
  })}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'المنهجية', item: canonical }
    ]
  })}
</head>
<body>
${header('./')}
<main>
  <nav class="breadcrumbs" aria-label="مسار الصفحة"><a href="./index.html">الرئيسية</a><span>/</span><strong>المنهجية</strong></nav>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>ثقة قابلة للفحص</span><h1>منهجية جمع ونشر الفعاليات</h1><p class="lead">EventLive لا يريد أن يكون قائمة روابط. المنصة تبني مرجعًا حيًا لفعاليات السعودية عبر مصادر واضحة، جلب دوري، قواعد نشر آلي، وفصل صارم بين المصدر المعتمد ومصدر الاكتشاف.</p><div class="signal-strip"><div class="signal"><span>فعاليات منشورة</span><b>${publicEvents}</b></div><div class="signal"><span>قادمة/نشطة</span><b>${upcoming}</b></div><div class="signal"><span>مصادر مسجلة</span><b>${sources.length}</b></div><div class="signal"><span>جداول حية</span><b>${liveReady}</b></div></div></div></section>
  <section class="section"><div class="wrap grid">
    <article class="activation-card"><h2>ما ننشره تلقائيًا</h2><p>النشر الآلي يمر فقط عبر مصادر رسمية أو معتمدة في السجل، ويحتاج رابط مصدر أو دليل قابل للفحص. كل بطاقة فعالية يجب أن تحمل وقتًا، مدينة أو وضع حضور، ومصدرًا ظاهرًا للمستخدم.</p></article>
    <article class="activation-card"><h2>ما لا ننشره مباشرة</h2><p>منصات الاكتشاف العامة أو المجتمعية تستخدم كإشارات بحث فقط. إذا لم يكن المصدر رسميًا أو معتمدًا، يبقى المرشح خارج الكتالوج العام حتى تتوفر صفحة دليل موثوقة أو قناة شراكة.</p></article>
    <article class="activation-card"><h2>كيف تعمل الدورة الدورية</h2><p>الدورة تجمع المرشحين، تحفظ snapshot كدليل، تطبق dedupe، تتحقق من نوع الفعالية والمدينة والجمهور، ثم تنشر فقط ما يعبر بوابة الثقة. حالة التشغيل تبقى في ملفات تقارير قابلة للاستئناف.</p></article>
    <article class="activation-card"><h2>الفعاليات المنتهية</h2><p>الفعالية المنتهية تعامل كفعالية طبيعية اكتملت، وليست أرشيفًا منفصلًا. هذا يحفظ قيمة EventLive للمستخدم، للبحث، وللتحليلات المستقبلية من عام 2022 وما بعده متى توفرت مصادر موثوقة.</p></article>
    <article class="activation-card"><h2>الصور والإثراء</h2><p>نستخدم الصورة الرسمية عالية الدقة عندما يوفرها المصدر. إذا لم تتوفر صورة قابلة للاستخدام، يبني EventLive غلافًا منضبطًا بصريًا حتى لا تظهر بطاقة فقيرة أو مكسورة.</p></article>
    <article class="activation-card"><h2>التكرار وتعدد المصادر</h2><p>عند ظهور الفعالية نفسها في أكثر من مصدر، لا نعدها فعاليتين. نطابق العنوان والمدينة ونافذة التاريخ، وتعدد الأدلة يرفع الثقة بدل تضخيم الكتالوج.</p></article>
  </div></section>
  <section class="section"><div class="wrap"><article class="readiness"><h2>مؤشرات المنهجية الحالية</h2><div class="signals"><div class="signal-check good"><b>${officialSources}</b><span>مصادر رسمية/حكومية</span></div><div class="signal-check good"><b>${partnershipNeeded}</b><span>مصادر تحتاج شراكة أو API</span></div><div class="signal-check warn"><b>${discoveryOnly}</b><span>مصادر اكتشاف لا تنشر مباشرة</span></div><div class="signal-check good"><b>${ended}</b><span>فعاليات منتهية محفوظة كجزء طبيعي من المنصة</span></div></div><div class="activation-actions"><a class="cta" href="./today-events.html">انتقل للمنصة الحية</a><a class="cta" href="./sources.html">استعرض المصادر</a><a class="cta" href="./source-health.html">صحة المصادر</a></div></article></div></section>
</main>
${footer('./')}
</body>
</html>`;
  writeText(path.join(distDir, 'methodology.html'), html);
}

function organizerIntakeContract() {
  return {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    contact_email: 'hello@eventme.live',
    purpose: 'structured-organizer-live-schedule-intake',
    required_fields: [
      'event_title',
      'organizer_name',
      'city',
      'venue',
      'starts_at',
      'ends_at',
      'source_url_or_program_file',
      'contact_name',
      'contact_email_or_mobile'
    ],
    optional_fields: [
      'ticket_url',
      'image_url',
      'session_rows',
      'speaker_names',
      'notes'
    ],
    publication_boundaries: [
      'لا ننشر فعالية بلا مصدر اعتماد أو دليل رسمي قابل للفحص.',
      'مصادر الاكتشاف لا تنشر مباشرة.',
      'الجداول الحية تتطلب أوقات جلسات واضحة وقاعة أو مسار عند توفرها.',
      'eventme.live هو الدومين العام، والاسم الظاهر EventLive.'
    ],
    sample_session_row: {
      title: 'اسم الفقرة',
      starts_at: '2026-08-01T16:00:00+03:00',
      ends_at: '2026-08-01T16:45:00+03:00',
      room: 'القاعة الرئيسية',
      speaker: 'اسم المتحدث'
    }
  };
}

function organizerIntakeScript() {
  return `<script>
(function () {
  var form = document.querySelector('[data-organizer-intake-form]');
  var preview = document.querySelector('[data-intake-preview]');
  var emailLink = document.querySelector('[data-intake-mailto]');
  if (!form || !preview || !emailLink) return;
  var storageKey = 'eventlive-organizer-intake-draft';
  function field(name) {
    return form.elements[name] ? String(form.elements[name].value || '').trim() : '';
  }
  function sessionRows() {
    return field('session_rows')
      .split(/\\n+/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (line) {
        var parts = line.split('|').map(function (part) { return part.trim(); });
        return {
          title: parts[0] || '',
          starts_at: parts[1] || '',
          ends_at: parts[2] || '',
          room: parts[3] || '',
          speaker: parts[4] || ''
        };
      });
  }
  function payload() {
    return {
      event_title: field('event_title'),
      organizer_name: field('organizer_name'),
      city: field('city'),
      venue: field('venue'),
      starts_at: field('starts_at'),
      ends_at: field('ends_at'),
      source_url_or_program_file: field('source_url_or_program_file'),
      ticket_url: field('ticket_url'),
      image_url: field('image_url'),
      contact_name: field('contact_name'),
      contact_email_or_mobile: field('contact_email_or_mobile'),
      notes: field('notes'),
      sessions: sessionRows(),
      eventlive_publication_boundary: 'لا ينشر EventLive فعالية بلا مصدر اعتماد أو دليل رسمي قابل للفحص.'
    };
  }
  function update() {
    var data = payload();
    var text = JSON.stringify(data, null, 2);
    preview.textContent = text;
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
    emailLink.href = 'mailto:hello@eventme.live?subject=' + encodeURIComponent('طلب إضافة فعالية إلى EventLive: ' + (data.event_title || '')) + '&body=' + encodeURIComponent('مرحباً EventLive،\\n\\nأرغب في إضافة/تفعيل فعالية وفق البيانات التالية:\\n\\n' + text);
  }
  function restore() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      Object.keys(saved).forEach(function (key) {
        if (key === 'sessions' && Array.isArray(saved.sessions) && form.elements.session_rows) {
          form.elements.session_rows.value = saved.sessions.map(function (session) {
            return [session.title, session.starts_at, session.ends_at, session.room, session.speaker].filter(Boolean).join(' | ');
          }).join('\\n');
        } else if (form.elements[key] && typeof saved[key] === 'string') {
          form.elements[key].value = saved[key];
        }
      });
    } catch {}
  }
  restore();
  form.addEventListener('input', update);
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    update();
    emailLink.click();
  });
  update();
})();
</script>`;
}

function writeOrganizerIntakePage() {
  const contract = organizerIntakeContract();
  writeJson('organizer-intake.json', contract);
  const canonical = absoluteUrl('organizer-intake.html');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({
    title: `إضافة فعالية أو جدول حي | ${platformName}`,
    description: 'نموذج EventLive المنظم لإضافة فعالية أو جدول حي من جهة منظمة مع مصدر اعتماد واضح وبيانات وقت ومكان وجلسات قابلة للنشر على eventme.live.',
    canonical
  })}
  ${pageCss}
  <style>
    .intake-form{display:grid;gap:14px}
    .intake-form label{display:grid;gap:6px;font-weight:800}
    .intake-form input,.intake-form textarea{width:100%;border:1px solid var(--line);border-radius:8px;padding:11px 12px;background:#fff;color:var(--ink);font:inherit}
    .intake-form textarea{min-height:118px;resize:vertical}
    .intake-preview{direction:ltr;text-align:left;white-space:pre-wrap;overflow:auto;max-height:520px;background:#10231d;color:#f7f5ef;border-radius:8px;padding:16px;font-size:.88rem;line-height:1.55}
  </style>
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    inLanguage: 'ar-SA',
    name: 'إضافة فعالية أو جدول حي',
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl },
    about: { '@type': 'Service', name: 'EventLive live schedule intake', provider: { '@type': 'Organization', name: platformName, url: siteUrl } }
  })}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'EventLive organizer intake contract',
    url: absoluteUrl('organizer-intake.json'),
    creator: { '@type': 'Organization', name: platformName },
    dateModified: buildAt,
    variableMeasured: contract.required_fields
  })}
  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'للمنظمين', item: absoluteUrl('organizers.html') },
      { '@type': 'ListItem', position: 3, name: 'إضافة فعالية', item: canonical }
    ]
  })}
</head>
<body>
${header('./')}
<main>
  <nav class="breadcrumbs" aria-label="مسار الصفحة"><a href="./index.html">الرئيسية</a><span>/</span><a href="./organizers.html">للمنظمين</a><span>/</span><strong>إضافة فعالية</strong></nav>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>مدخل منظّم للفعاليات</span><h1>إضافة فعالية أو جدول حي</h1><p class="lead">هذا المسار يحوّل بيانات الجهة المنظمة إلى طلب واضح قابل للفحص: وقت، مكان، مصدر اعتماد، وصيغة جلسات تساعد EventLive على عرض الفعالية بشكل حي وموثوق.</p><div class="signal-strip"><div class="signal"><span>شرط النشر</span><b>مصدر موثوق</b></div><div class="signal"><span>أفضل قيمة</span><b>جلسات بوقت</b></div><div class="signal"><span>النشر</span><b>eventme.live</b></div></div></div></section>
  <section class="section"><div class="wrap grid">
    <article class="activation-card">
      <h2>بيانات الفعالية</h2>
      <form class="intake-form" data-organizer-intake-form>
        <label>اسم الفعالية<input name="event_title" required autocomplete="off" /></label>
        <label>الجهة المنظمة<input name="organizer_name" required autocomplete="organization" /></label>
        <label>المدينة<input name="city" required autocomplete="address-level2" /></label>
        <label>المكان أو رابط الحضور<input name="venue" required /></label>
        <label>وقت البداية<input name="starts_at" required placeholder="2026-08-01T16:00:00+03:00" /></label>
        <label>وقت النهاية<input name="ends_at" required placeholder="2026-08-01T22:00:00+03:00" /></label>
        <label>رابط المصدر الرسمي أو ملف البرنامج<input name="source_url_or_program_file" required inputmode="url" /></label>
        <label>رابط التذاكر أو التسجيل<input name="ticket_url" inputmode="url" /></label>
        <label>رابط صورة رسمية عالية الدقة<input name="image_url" inputmode="url" /></label>
        <label>اسم مسؤول التواصل<input name="contact_name" required autocomplete="name" /></label>
        <label>بريد أو جوال التواصل<input name="contact_email_or_mobile" required autocomplete="email" /></label>
        <label>الجلسات، كل سطر: العنوان | البداية | النهاية | القاعة | المتحدث<textarea name="session_rows" placeholder="الكلمة الافتتاحية | 2026-08-01T16:00:00+03:00 | 2026-08-01T16:20:00+03:00 | القاعة الرئيسية | اسم المتحدث"></textarea></label>
        <label>ملاحظات إضافية<textarea name="notes"></textarea></label>
        <div class="activation-actions"><button class="cta" type="submit">إرسال الطلب بالبريد</button><a class="cta" data-intake-mailto href="mailto:hello@eventme.live">فتح البريد</a><a class="cta" href="./methodology.html">منهجية النشر</a></div>
      </form>
    </article>
    <aside class="activation-card">
      <h2>المعاينة المنظمة</h2>
      <p>هذه الصيغة تحفظ محليًا في المتصفح وتُرسل عبر البريد، ولا تنشر أي شيء تلقائيًا قبل عبور بوابة المصدر والثقة.</p>
      <pre class="intake-preview" data-intake-preview>{}</pre>
    </aside>
  </div></section>
  <section class="section"><div class="wrap"><article class="readiness"><h2>معايير قبول الطلب</h2><div class="signals"><div class="signal-check good"><b>مصدر</b><span>رابط رسمي أو ملف برنامج قابل للفحص.</span></div><div class="signal-check good"><b>وقت</b><span>بداية ونهاية واضحة بتوقيت السعودية.</span></div><div class="signal-check good"><b>مكان</b><span>مدينة وموقع أو رابط حضور عن بعد.</span></div><div class="signal-check good"><b>جلسات</b><span>كلما زادت الجلسات المكتملة زادت فرصة الجدول الحي.</span></div></div></article></div></section>
</main>
${footer('./')}
${organizerIntakeScript()}
</body>
</html>`;
  writeText(path.join(distDir, 'organizer-intake.html'), html);
}

function compactEventUrl(event) {
  return event.detail_url || `./events/${event.file_slug}.html`;
}

function searchIntentPageConfigs(events) {
  const now = Date.now();
  const active = sortEventsByStart(events.filter((event) => event.status !== 'ended'));
  const today = eventsForWindow(events, now, 24);
  const tomorrow = eventsForWindow(events, now + (24 * 60 * 60 * 1000), 24);
  const thisMonth = eventsForWindow(events, now, 31 * 24);
  const weekend = active.filter((event) => {
    const date = dateValue(event.starts_at);
    if (!date) return false;
    const diffDays = Math.floor((date.getTime() - now) / 86400000);
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Riyadh' }).format(date);
    return diffDays >= 0 && diffDays <= 21 && ['Fri', 'Sat'].includes(weekday);
  });
  const cityMatches = (cityKey) => active.filter((event) => citySlug(event.city || '') === cityKey || event.city_slug === cityKey);
  const categoryMatches = (pattern) => active.filter((event) => pattern.test(`${event.category || ''} ${event.category_label || ''} ${event.title || ''} ${event.summary || ''}`));
  const ticketedMatches = active.filter((event) => event.ticket_url || event.registration_url || /تذاكر|احجز|سجل|ticket|register|registration/i.test(`${event.title || ''} ${event.summary || ''} ${event.price_label || ''}`));
  const freeMatches = active.filter((event) => /مجاني|مجاناً|بدون رسوم|free/i.test(`${event.title || ''} ${event.summary || ''} ${event.price_label || ''}`));
  return [
    {
      file: 'saudi-events-today.html',
      title: 'فعاليات السعودية اليوم',
      eyebrow: 'نية بحث مباشرة',
      h1: 'فعاليات السعودية اليوم',
      description: 'صفحة سريعة لمعرفة فعاليات السعودية التي تبدأ قريبًا أو تجري اليوم، مع وقت البداية والمكان ورابط التفاصيل من EventLive.',
      events: today.length ? today : active.slice(0, 24),
      faq: [
        ['كيف أعرف فعاليات السعودية اليوم؟', 'تعرض هذه الصفحة الفعاليات الجارية أو القريبة خلال اليوم، ثم تقترح أقرب الفعاليات القادمة عندما لا توجد فعالية اليوم.'],
        ['هل الأوقات بتوقيت السعودية؟', 'نعم، تعرض EventLive الأوقات بتوقيت Asia/Riyadh ما لم يذكر المصدر خلاف ذلك.'],
        ['هل يمكن إضافة الفعالية للتقويم؟', 'كل صفحة فعالية توفر رابط تقويم ICS عند توفر بيانات البداية والنهاية.']
      ],
      related: [['كل الفعاليات', './events.html'], ['هذا الأسبوع', './this-week.html'], ['فعاليات اليوم', './today-events.html']]
    },
    {
      file: 'saudi-events-tomorrow.html',
      title: 'فعاليات السعودية غدًا',
      eyebrow: 'غدًا',
      h1: 'فعاليات السعودية غدًا',
      description: 'صفحة مخصصة للباحثين عن فعاليات السعودية غدًا، تعرض أقرب المواعيد القادمة مع المدينة والموقع والمصدر ورابط التقويم.',
      events: tomorrow.length ? tomorrow : active.slice(0, 24),
      faq: [
        ['كيف تعرض EventLive فعاليات غدًا؟', 'تعتمد الصفحة على وقت البداية بتوقيت السعودية وتحدث نتائجها مع كل بناء جديد للكتالوج.'],
        ['ماذا لو لم توجد فعاليات غدًا؟', 'تعرض الصفحة أقرب الفعاليات القادمة بدل ترك الزائر في صفحة فارغة.'],
        ['هل يمكن حفظ فعالية الغد؟', 'نعم، صفحة كل فعالية توفر رابط تقويم عند توفر بداية ونهاية واضحتين.']
      ],
      related: [['فعاليات السعودية اليوم', './saudi-events-today.html'], ['هذا الأسبوع', './this-week.html'], ['كل الفعاليات', './events.html']]
    },
    {
      file: 'saudi-events-weekend.html',
      title: 'فعاليات السعودية نهاية الأسبوع',
      eyebrow: 'الويكند',
      h1: 'فعاليات السعودية نهاية الأسبوع',
      description: 'أقرب فعاليات نهاية الأسبوع في السعودية على EventLive، مناسبة لمن يبحث عن فعاليات الجمعة والسبت مع وقت حي ومصدر واضح.',
      events: weekend.length ? weekend.slice(0, 36) : active.slice(0, 24),
      faq: [
        ['ما المقصود بنهاية الأسبوع؟', 'تتعامل EventLive مع الجمعة والسبت كنافذة نهاية الأسبوع داخل السعودية.'],
        ['هل تشمل الصفحة الرياض وجدة والمدن الأخرى؟', 'نعم، تظهر أي فعالية منشورة تنطبق على نافذة نهاية الأسبوع من كل المدن المتوفرة.'],
        ['هل هذه صفحة تذاكر؟', 'لا، هي صفحة اكتشاف وحضور؛ روابط التذاكر أو التسجيل تظهر عندما يوفرها المصدر.']
      ],
      related: [['فعاليات الرياض اليوم', './riyadh-events-today.html'], ['فعاليات جدة', './jeddah-events.html'], ['هذا الشهر', './saudi-events-this-month.html']]
    },
    {
      file: 'saudi-events-this-month.html',
      title: 'فعاليات السعودية هذا الشهر',
      eyebrow: 'هذا الشهر',
      h1: 'فعاليات السعودية هذا الشهر',
      description: 'دليل فعاليات السعودية هذا الشهر، يجمع المؤتمرات والمعارض والدورات والفعاليات العامة مع تحديثات EventLive الدورية.',
      events: thisMonth.length ? thisMonth.slice(0, 48) : active.slice(0, 36),
      faq: [
        ['هل هذه الصفحة تتغير شهريًا؟', 'نعم، تعتمد على الكتالوج الحالي وتعرض أقرب فعاليات الشهر بناء على وقت البناء.'],
        ['هل تظهر الفعاليات المنتهية هنا؟', 'لا، هذه الصفحة تركز على الفعاليات النشطة والقادمة، بينما تبقى الفعاليات المنتهية في صفحاتها الطبيعية.'],
        ['هل يمكن تصفية النتائج حسب المدينة؟', 'يمكن الانتقال من البطاقة إلى صفحة الفعالية أو فتح صفحة المدن للوصول إلى كل مدينة.']
      ],
      related: [['كل الفعاليات', './events.html'], ['المدن', './cities.html'], ['التصنيفات', './categories.html']]
    },
    {
      file: 'riyadh-events-today.html',
      title: 'فعاليات الرياض اليوم والقادمة',
      eyebrow: 'الرياض',
      h1: 'فعاليات الرياض اليوم والقادمة',
      description: 'أقرب فعاليات الرياض على EventLive: مؤتمرات، معارض، ورش، دورات وفعاليات عامة مع المصدر والوقت الحي.',
      events: cityMatches('riyadh').slice(0, 36),
      faq: [
        ['ما أفضل صفحة لفعاليات الرياض؟', 'ابدأ بهذه الصفحة للفعاليات القريبة، أو افتح صفحة مدينة الرياض لرؤية كل السجل القادم والمنتهي.'],
        ['هل تشمل الصفحة المعارض والمؤتمرات؟', 'نعم، تظهر الفعاليات حسب ما يتوفر في الكتالوج من مصادر رسمية أو موثوقة.'],
        ['هل تعرض EventLive الاتجاهات؟', 'تعرض صفحة الفعالية رابط الاتجاهات عندما يتوفر موقع واضح أو رابط خرائط.']
      ],
      related: [['كل فعاليات الرياض', './cities/riyadh.html'], ['ماذا هذا الأسبوع؟', './this-week.html'], ['المؤتمرات والمعارض', './categories/conference-forum.html']]
    },
    {
      file: 'jeddah-events.html',
      title: 'فعاليات جدة القادمة',
      eyebrow: 'جدة',
      h1: 'فعاليات جدة القادمة',
      description: 'دليل فعاليات جدة القادمة على EventLive، مع التاريخ والموقع والتصنيف وروابط المصدر والتقويم.',
      events: cityMatches('jeddah').slice(0, 36),
      faq: [
        ['أين أجد فعاليات جدة القادمة؟', 'تعرض هذه الصفحة أقرب فعاليات جدة المنشورة في EventLive، وتربط بصفحة المدينة الكاملة.'],
        ['هل توجد فعاليات منتهية لجدة؟', 'نعم، تبقى الفعاليات المكتملة كسجل طبيعي عند توفر مصدر وتاريخ واضحين.'],
        ['هل تعرض الصفحة الدورات والملتقيات؟', 'نعم، تظهر الدورات والملتقيات إذا كانت ضمن مصادر EventLive المنشورة.']
      ],
      related: [['كل فعاليات جدة', './cities/jeddah.html'], ['فعاليات السعودية اليوم', './saudi-events-today.html'], ['كل المدن', './cities.html']]
    },
    {
      file: 'online-tech-courses.html',
      title: 'دورات تقنية أونلاين في السعودية',
      eyebrow: 'تقنية وتدريب',
      h1: 'دورات تقنية أونلاين في السعودية',
      description: 'صفحة مخصصة للدورات التقنية والبرامج التدريبية عن بعد أو القابلة للتسجيل في السعودية، من مصادر مثل طويق والمهارات المستقبلية وغيرها.',
      events: categoryMatches(/تقني|تدريب|دورة|bootcamp|course|program|academy|طويق|مهارات|برمجة|ذكاء/i).slice(0, 36),
      faq: [
        ['هل EventLive منصة تسجيل للدورات؟', 'لا، EventLive يعرض بيانات الدورة وروابط المصدر، ويتم التسجيل من خلال الجهة المنظمة أو المصدر الرسمي.'],
        ['هل تشمل الدورات الحضورية؟', 'نعم، قد تظهر الدورات الحضورية وعن بعد إذا كانت ضمن مصادر موثوقة وببيانات تاريخ واضحة.'],
        ['كيف أميز الدورة القادمة؟', 'تعرض البطاقة حالة الوقت وموعد البداية، وتعرض صفحة التفاصيل رابط التقويم والمصدر.']
      ],
      related: [['تصنيف التدريب التقني', './categories/technology-training.html'], ['للطلاب والخريجين', './for/students.html'], ['للتقنيين', './for/tech.html']]
    },
    {
      file: 'saudi-ticketed-events.html',
      title: 'فعاليات السعودية بتذاكر أو تسجيل',
      eyebrow: 'تذاكر وتسجيل',
      h1: 'فعاليات السعودية بتذاكر أو تسجيل',
      description: 'مسار مخصص للفعاليات التي يظهر لها رابط تذاكر أو تسجيل أو إشارة حجز، مع الحفاظ على المصدر الرسمي أو المعتمد لكل فعالية.',
      events: ticketedMatches.slice(0, 48),
      faq: [
        ['هل EventLive يبيع التذاكر؟', 'لا، EventLive يعرض رابط التذاكر أو التسجيل عند توفره ويترك عملية الشراء أو التسجيل للجهة المالكة.'],
        ['هل كل فعالية هنا مدفوعة؟', 'ليس بالضرورة؛ قد تكون الفعالية مجانية لكنها تتطلب تسجيلًا مسبقًا.'],
        ['كيف أتأكد من الرابط؟', 'افتح صفحة التفاصيل واقرأ المصدر والرابط الرسمي قبل التسجيل أو الشراء.']
      ],
      related: [['كل الفعاليات', './events.html'], ['مركز الثقة', './readiness.html'], ['للمنظمين', './organizers.html']]
    },
    {
      file: 'saudi-conferences-exhibitions.html',
      title: 'المعارض والمؤتمرات في السعودية',
      eyebrow: 'معارض ومؤتمرات',
      h1: 'المعارض والمؤتمرات في السعودية',
      description: 'صفحة تجمع المعارض والمؤتمرات والملتقيات والمنتديات في السعودية، وهي مستوحاة من قوة مصادر مثل SCEGA ووزارة التجارة وNEC.',
      events: categoryMatches(/مؤتمر|ملتقى|معرض|منتدى|conference|forum|expo|exhibition|summit|congress/i).slice(0, 48),
      faq: [
        ['هل تشمل الصفحة فعاليات الأعمال؟', 'نعم، تجمع الصفحة المعارض والمؤتمرات والملتقيات والمنتديات عندما تكون منشورة في كتالوج EventLive.'],
        ['هل تعتمد EventLive على مصدر رسمي؟', 'تعرض صفحة كل فعالية المصدر أو الدليل المستخدم، ولا تنشر إشارات اكتشافية وحدها كفعالية مؤكدة.'],
        ['هل يمكن للجهات المنظمة إضافة مؤتمر؟', 'نعم، يمكن استخدام صفحة إضافة فعالية لإرسال رابط المصدر أو برنامج الجلسات.']
      ],
      related: [['إضافة فعالية', './organizer-intake.html'], ['منهجية المصادر', './guide-event-sources-methodology.html'], ['كل التصنيفات', './categories.html']]
    },
    {
      file: 'saudi-sports-matches.html',
      title: 'المباريات والفعاليات الرياضية في السعودية',
      eyebrow: 'رياضة ومباريات',
      h1: 'المباريات والفعاليات الرياضية في السعودية',
      description: 'مسار للباحثين عن المباريات والبطولات والمناطق الجماهيرية والفعاليات الرياضية في السعودية مع الوقت والموقع والمصدر.',
      events: categoryMatches(/رياض|مباراة|كأس|بطولة|sport|match|football|basketball|fifa|fan zone/i).slice(0, 48),
      faq: [
        ['هل تعرض EventLive نتائج المباريات؟', 'EventLive يركز على وقت ومكان الفعالية وروابط الحضور، وليس نتائج المباريات المباشرة.'],
        ['هل تشمل الصفحة مناطق المشجعين؟', 'نعم، إذا كانت منشورة كمناسبة بوقت ومكان واضحين ضمن الكتالوج.'],
        ['هل يمكن إضافة المباراة للتقويم؟', 'نعم، عندما تتوفر بيانات وقت واضحة، توفر صفحة التفاصيل ملف تقويم.']
      ],
      related: [['فعاليات السعودية اليوم', './saudi-events-today.html'], ['كل الفعاليات', './events.html'], ['المدن', './cities.html']]
    },
    {
      file: 'free-saudi-events.html',
      title: 'فعاليات مجانية في السعودية',
      eyebrow: 'مجاني',
      h1: 'فعاليات مجانية في السعودية',
      description: 'صفحة للفعاليات والدورات والبرامج التي تظهر كمجانية أو بدون رسوم في بيانات EventLive، مع رابط المصدر والتوقيت.',
      events: freeMatches.length ? freeMatches.slice(0, 48) : active.slice(0, 24),
      faq: [
        ['هل كل الفعاليات هنا مجانية تمامًا؟', 'تعرض الصفحة الفعاليات التي تحتوي بياناتها على إشارة مجانية أو بدون رسوم، ويجب تأكيد التفاصيل من المصدر.'],
        ['هل تحتاج بعض الفعاليات المجانية إلى تسجيل؟', 'نعم، قد تكون مجانية لكنها تتطلب تسجيلًا مسبقًا لدى الجهة المنظمة.'],
        ['هل يمكن اقتراح فعالية مجانية؟', 'يمكن للجهة المنظمة إرسال رابط المصدر عبر صفحة إضافة فعالية.']
      ],
      related: [['دورات تقنية أونلاين', './online-tech-courses.html'], ['إضافة فعالية', './organizer-intake.html'], ['كل الفعاليات', './events.html']]
    },
    {
      file: 'saudi-events-faq.html',
      title: 'أسئلة شائعة عن فعاليات السعودية',
      eyebrow: 'دليل سريع',
      h1: 'أسئلة شائعة عن فعاليات السعودية وEventLive',
      description: 'إجابات مختصرة للباحثين والزوار والذكاءات عن طريقة العثور على فعاليات السعودية، التحقق من المصدر، الجداول الحية، والفعاليات المنتهية.',
      events: active.slice(0, 18),
      faq: [
        ['ما هي EventLive؟', 'EventLive مرجع حي لفعاليات السعودية يعرض الوقت، المدينة، المكان، المصدر، وروابط التقويم والاتجاهات عندما تتوفر.'],
        ['هل EventLive تنشر كل فعالية تجدها؟', 'لا، النشر العام يتطلب مصدرًا رسميًا أو دليلًا قابلًا للفحص، أما مصادر الاكتشاف فلا تنشر مباشرة.'],
        ['لماذا توجد فعاليات منتهية؟', 'الفعاليات المنتهية تحفظ كسجل طبيعي مثل أي فعالية كانت منشورة ثم اكتملت، وهذا يساعد المستخدمين والبحث والتحليلات.'],
        ['كيف تستفيد الذكاءات من EventLive؟', 'يمكن للذكاءات الاستشهاد بصفحات الفعاليات والمدينة والتصنيف مع الحفاظ على التاريخ والمصدر والرابط الرسمي.']
      ],
      related: [['منهجية المصادر', './guide-event-sources-methodology.html'], ['قيمة الفعاليات المنتهية', './guide-ended-events-value.html'], ['ملف الذكاءات', './llms.txt']]
    }
  ];
}

function renderIntentEventList(rows = []) {
  if (!rows.length) return '<p class="empty-state">لا توجد فعاليات كافية لهذا المسار حاليًا. ستتحدث الصفحة تلقائيًا مع كل جلب جديد.</p>';
  return rows.slice(0, 24).map((event) => eventCard(event, './')).join('\n');
}

function writeSearchIntentPages(events) {
  const pages = searchIntentPageConfigs(events);
  for (const page of pages) {
    const canonical = absoluteUrl(page.file);
    const faqs = page.faq.map(([question, answer]) => ({ question, answer }));
    const itemList = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: page.title,
      numberOfItems: page.events.length,
      itemListElement: page.events.slice(0, 24).map((event, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: event.title,
        url: absoluteUrl(compactEventUrl(event).replace(/^\.\//, ''))
      }))
    };
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `${page.title} | ${platformName}`, description: page.description, canonical })}
  ${pageCss}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'CollectionPage', inLanguage: 'ar-SA', name: page.title, description: page.description, url: canonical, isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }, dateModified: buildAt, mainEntityOfPage: canonical })}
  ${jsonLd(itemList)}
  ${jsonLd(faqJsonLd(faqs))}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: platformName, item: `${siteUrl}/` }, { '@type': 'ListItem', position: 2, name: 'الأدلة', item: absoluteUrl('guides.html') }, { '@type': 'ListItem', position: 3, name: page.title, item: canonical }] })}
</head>
<body>
${header('./')}
<main>
  <nav class="breadcrumbs wrap" aria-label="مسار التنقل"><a href="./index.html">EventLive</a><span>/</span><a href="./guides.html">الأدلة</a><span>/</span><strong>${escapeHtml(page.title)}</strong></nav>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>${escapeHtml(page.eyebrow)}</span><h1>${escapeHtml(page.h1)}</h1><p class="lead">${escapeHtml(page.description)}</p><div class="signal-strip"><div class="signal"><span>فعاليات مطابقة</span><b>${page.events.length}</b></div><div class="signal"><span>آخر تحديث</span><b>${escapeHtml(formatDate(buildAt))}</b></div><div class="signal"><span>المنطقة الزمنية</span><b>Asia/Riyadh</b></div></div></div></section>
  <section class="section"><div class="wrap"><h2>أقرب النتائج</h2><div class="grid">${renderIntentEventList(page.events)}</div></div></section>
  ${renderFaqSection(faqs, 'أسئلة شائعة')}
  <section class="section"><div class="wrap"><article class="readiness"><h2>روابط متابعة مفيدة</h2><div class="activation-actions"><a class="cta" href="./today.html">انتقل للمنصة الحية</a>${page.related.map(([label, href]) => `<a class="cta" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join('')}</div></article></div></section>
</main>
${footer('./')}
</body>
</html>`;
    writeText(path.join(distDir, page.file), html);
  }
  return pages;
}

function patchGuidesHubWithSearchIntentPages(pages = []) {
  const guidesPath = path.join(distDir, 'guides.html');
  if (!fs.existsSync(guidesPath) || !pages.length) return false;
  const html = fs.readFileSync(guidesPath, 'utf8');
  if (html.includes('seo-intent-pages')) return false;
  const section = `<section class="section" id="seo-intent-pages"><div class="wrap"><h2>مسارات بحث مباشرة</h2><p class="lead">صفحات محدثة من الكتالوج تساعد الزائر ومحركات البحث والذكاءات على الوصول لعبارات البحث الأكثر شيوعًا.</p><div class="grid">${pages.map((page) => `<article class="event-card"><div class="card-body"><h3><a href="./${escapeHtml(page.file)}">${escapeHtml(page.title)}</a></h3><p>${escapeHtml(page.description)}</p><div class="card-foot"><a class="btn-sm primary" href="./${escapeHtml(page.file)}">فتح الصفحة</a></div></div></article>`).join('')}</div></div></section>`;
  const next = html.replace(/<\/main>/i, `${section}\n</main>`);
  fs.writeFileSync(guidesPath, next, 'utf8');
  return true;
}

function formatShortDate(value) {
  const date = dateValue(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('ar-SA', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Riyadh'
  }).format(date);
}

function formatWeekday(value) {
  const date = dateValue(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    timeZone: 'Asia/Riyadh'
  }).format(date);
}

function formatHomeCardDate(value) {
  const date = dateValue(value);
  if (!date) return { day: '', month: '' };
  return {
    day: new Intl.DateTimeFormat('ar-SA', {
      day: 'numeric',
      timeZone: 'Asia/Riyadh'
    }).format(date),
    month: new Intl.DateTimeFormat('ar-SA', {
      month: 'long',
      timeZone: 'Asia/Riyadh'
    }).format(date)
  };
}

function homeTickerEvent(event) {
  return {
    id: event.id,
    t: event.title,
    c: event.city_label || cityLabel(event.city),
    s: event.starts_at,
    e: event.ends_at,
    u: compactEventUrl(event),
    k: event.event_kind,
    r: event.live_schedule_ready ? 1 : 0
  };
}

function homeSearchEvent(event) {
  return {
    t: event.title,
    c: event.city_label || cityLabel(event.city),
    d: formatShortDate(event.starts_at),
    u: compactEventUrl(event)
  };
}

function homeEventCard(event) {
  const image = rootAsset(event.image_url || event.image || './assets/eventlive-hero.png');
  const detail = compactEventUrl(event);
  const start = formatHomeCardDate(event.starts_at);
  const audience = event.audience_labels?.[0];
  const audienceName = audience?.label || audience?.label_ar || audience?.slug || event.audience_label || event.category_label || 'فعاليات';
  const trustSource = event.source_label || 'مصدر موثوق';
  const trustLabel = event.trust_label || 'مصدر موثوق';
  const isFree = /\bfree\b|مجاني|مجاناً|بدون رسوم/i.test(`${event.price_label || ''} ${event.summary || ''}`);
  const chips = isFree ? '<span class="chip chip-free">مجاني</span>' : '';
  const cityText = event.city_label || cityLabel(event.city);
  const eventDay = start.day || '—';
  const eventMonth = start.month || '—';

  return `<article class="card" data-event-start="${escapeHtml(event.starts_at || '')}" data-event-end="${escapeHtml(event.ends_at || event.starts_at || '')}" data-event-status="${escapeHtml(event.status || '')}">
        <a class="cover" href="${escapeHtml(detail)}" style="--c1:#4a1d4f;--c2:#7c3f84">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(event.image_alt || event.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.closest('.cover').classList.add('noimg');this.remove();" />
          <span class="cover-cat">${escapeHtml(audienceName)}</span>
          <span class="date-tab"><b>${escapeHtml(eventDay)}</b><span>${escapeHtml(eventMonth)}</span></span>
          <span class="chips">${chips}</span>
        </a>
        <div class="card-body">
          <div class="card-meta">${escapeHtml(cityText)} · ${escapeHtml(event.venue || cityText)} · ${escapeHtml(formatWeekday(event.starts_at))}</div>
          <h3><a dir="auto" href="${escapeHtml(detail)}">${escapeHtml(event.title)}</a></h3>
          <div class="card-when" data-live-time ${runtimeAttrs(event)}>جاري حساب الوقت...</div>
          <div class="card-foot">
            <a class="btn-sm primary" href="${escapeHtml(detail)}">التفاصيل</a>
            <a class="btn-sm" href="${escapeHtml(event.ics_url || (String(detail).endsWith('.html') ? `${detail.replace(/\\.html$/, '.ics')}` : `${detail}.ics`))}" aria-label="أضف للتقويم">التقويم</a>
            <span class="trust" title="المصدر: ${escapeHtml(trustSource)} · آخر تحقق: ${escapeHtml(formatDate(event.verified_at || event.updated_at))}">${escapeHtml(trustLabel)}</span>
          </div>
        </div>
      </article>`;
}

function scriptValue(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function rootAsset(value = '') {
  const text = String(value || '');
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return text.startsWith('/') ? `.${text}` : text.replace(/^\.\//, './');
}

function compactActivationEvent(event) {
  return {
    id: event.id,
    file_slug: event.file_slug,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    city_label: event.city_label || cityLabel(event.city),
    venue: event.venue,
    venue_address: event.venue_address,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    status: event.status,
    status_label: event.status_label,
    event_kind: event.event_kind,
    event_kind_label: event.event_kind_label,
    live_schedule_ready: event.live_schedule_ready,
    attendance_window_ready: Boolean(event.attendance_window_ready),
    attendance_window: event.attendance_window || null,
    schedule_quality: event.schedule_quality || 'missing',
    source_label: event.source_label,
    source_url: event.source_url,
    evidence_url: event.evidence_url,
    detail_url: event.detail_url,
    ics_url: event.ics_url,
    image_url: event.image_url,
    image_alt: event.image_alt,
    directions_url: event.directions_url,
    maps_url: event.maps_url,
    sessions: (event.sessions || []).slice(0, 40).map((session) => ({
      title: session.title || session.session_title || 'جلسة',
      starts_at: session.starts_at || session.start_at || '',
      ends_at: session.ends_at || session.end_at || '',
      room: session.room || session.track || ''
    }))
  };
}

function minutesBetween(referenceMs, value = '') {
  const date = dateValue(value);
  return date ? Math.round((date.getTime() - referenceMs) / 60000) : null;
}

function compactLiveEvent(event, referenceMs = Date.now()) {
  return {
    ...compactActivationEvent(event),
    organizer: event.organizer,
    city: event.city,
    category: event.category_label || event.category,
    registration_url: event.registration_url || '',
    ticket_url: event.ticket_url || '',
    attendance_mode: event.attendance_mode || '',
    price_label: event.price_label || '',
    language: event.language || '',
    richness_score: event.richness_score || 0,
    live_updates_count: event.live_updates_count || 0,
    category_url: event.category_url,
    city_url: event.city_url,
    canonical_url: absoluteUrl(String(event.detail_url || 'events.html').replace(/^\.\//, '')),
    minutes_to_start: minutesBetween(referenceMs, event.starts_at),
    minutes_to_end: minutesBetween(referenceMs, event.ends_at || event.starts_at)
  };
}

function attendancePriority(event, referenceMs = Date.now()) {
  const start = dateValue(event.starts_at)?.getTime() || Number.POSITIVE_INFINITY;
  const end = dateValue(event.ends_at || event.starts_at)?.getTime() || start;
  const minutesToStart = Math.round((start - referenceMs) / 60000);
  const minutesToEnd = Math.round((end - referenceMs) / 60000);
  let score = 0;
  if (event.status === 'live') score += 100000000;
  if (event.status === 'ongoing') score += 70000000;
  if (event.live_schedule_ready) score += 50000000;
  if (event.status === 'upcoming' && minutesToStart >= 0) score += Math.max(0, 30000000 - minutesToStart);
  if (event.status !== 'ended' && minutesToEnd >= 0) score += Math.max(0, 1000000 - Math.abs(minutesToStart));
  return score;
}

function activationPriority(event, referenceMs = Date.now()) {
  const start = dateValue(event.starts_at)?.getTime();
  const daysToStart = Number.isFinite(start) ? Math.round((start - referenceMs) / 86400000) : 999;
  if (event.status === 'live' || event.status === 'ongoing' || daysToStart <= 10) return { key: 'urgent', label: 'عاجل الآن', rank: 0 };
  if (daysToStart <= 30) return { key: 'high', label: 'أولوية عالية', rank: 1 };
  if (!Number.isFinite(start)) return { key: 'needs-date', label: 'يحتاج تاريخًا أوضح', rank: 3 };
  return { key: 'normal', label: 'متابعة دورية', rank: 2 };
}

function activationRequestUrl(event) {
  const subject = `تفعيل جدول حي عبر EventLive: ${event.title}`;
  const body = [
    'مرحباً EventLive،',
    '',
    `نرغب في تفعيل جدول حي لهذه الفعالية: ${event.title}`,
    `المدينة: ${event.city_label || cityLabel(event.city)}`,
    `المكان: ${event.venue || ''}`,
    `التاريخ: ${event.starts_at || ''}`,
    '',
    'المطلوب:',
    '- ملف البرنامج أو رابط المصدر الرسمي',
    '- القاعات والمسارات والمتحدثون إن وجدت',
    '- جهة الاعتماد وبيانات التواصل',
    '',
    `رابط التفاصيل: ${absoluteUrl(String(event.detail_url || 'events.html').replace(/^\.\//, ''))}`
  ].join('\n');
  return `mailto:hello@eventme.live?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function scheduleAcquisitionPlan(event = {}) {
  const text = `${event.source_label || ''} ${event.source_url || ''} ${event.evidence_url || ''}`.toLowerCase();
  if (/monshaat|منشآت/.test(text)) {
    return {
      route: 'monshaat-detail-parser',
      label: 'محلل تفاصيل منشآت',
      next_action: 'افتح صفحات node للفعاليات واجمع وقت كل لقاء/ورشة من محتوى الصفحة أو المرفقات المرتبطة.'
    };
  }
  if (/tuwaiq|futureskills|mcit|code\.mcit|misk|sdaia/.test(text)) {
    return {
      route: 'training-program-parser',
      label: 'محلل برامج ودورات',
      next_action: 'استخرج محاور البرنامج، مدة كل لقاء، ونمط الحضور من صفحة البرنامج أو تقويم التدريب.'
    };
  }
  if (/rfecc|expo|chamber|غرفة|معرض/.test(text)) {
    return {
      route: 'expo-agenda-probe',
      label: 'فحص أجندة المعارض',
      next_action: 'ابحث داخل صفحة المعرض عن agenda/program/opening hours وحوّل ساعات الزيارة والفعاليات المصاحبة إلى جلسات.'
    };
  }
  if (/visitsaudi|visit saudi|season|موسم/.test(text)) {
    return {
      route: 'official-calendar-probe',
      label: 'فحص التقويم الرسمي',
      next_action: 'افتح صفحة التقويم أو الموسم وابحث عن برنامج الأيام، المواقع الفرعية، وساعات التشغيل المعلنة.'
    };
  }
  if (/sfda|food and drug|الغذاء|الدواء/.test(text)) {
    return {
      route: 'workshop-detail-parser',
      label: 'محلل ورش العمل',
      next_action: 'استخرج وقت الورشة، محاور التدريب، ورابط التسجيل من صفحة التفاصيل أو نماذج الحضور.'
    };
  }
  if (/kaust|university|جامعة|college|كلية/.test(text)) {
    return {
      route: 'campus-calendar-parser',
      label: 'محلل تقويم جامعي',
      next_action: 'اجمع تفاصيل المكان داخل الحرم، الفقرات، ورابط التسجيل من صفحة التقويم الجامعي.'
    };
  }
  return {
    route: 'source-detail-probe',
    label: 'فحص صفحة المصدر',
    next_action: 'افتح صفحة المصدر بمتصفح الجلب وابحث عن agenda، schedule، speakers، أو ملف PDF رسمي.'
  };
}

function activationCandidate(event, referenceMs = Date.now()) {
  const priority = activationPriority(event, referenceMs);
  const acquisition = scheduleAcquisitionPlan(event);
  const blockers = [];
  if (!event.live_schedule_ready) blockers.push(event.attendance_window_ready ? 'نافذة الحضور موجودة وتحتاج جدولًا تفصيليًا' : 'لا يوجد رابط جدول حي معتمد');
  if (!Number(event.sessions_count || 0) && !event.attendance_window_ready) blockers.push('لا يوجد عدد جلسات أو نافذة حضور');
  if (!event.source_url && !event.evidence_url) blockers.push('لا يوجد مصدر قابل للفحص');
  return {
    id: event.id,
    title: event.title,
    city: event.city_label || cityLabel(event.city),
    venue: event.venue,
    organizer: event.organizer,
    category: event.category_label || event.category,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    detail_url: event.detail_url,
    calendar_url: event.ics_url,
    directions_url: event.directions_url,
    source_label: event.source_label,
    source_url: event.source_url,
    evidence_url: event.evidence_url,
    source_confidence: event.source_confidence,
    approval_status: event.approval_status,
    approval_status_label: event.approval_status_label,
    attendance_window_ready: Boolean(event.attendance_window_ready),
    attendance_window: event.attendance_window || null,
    schedule_quality: event.schedule_quality || 'missing',
    sessions_count: Number(event.sessions_count || 0),
    acquisition,
    priority,
    blockers,
    request_url: activationRequestUrl(event)
  };
}

function activationSourceGroups(activationEvents = []) {
  const groups = new Map();
  for (const event of activationEvents) {
    const key = event.source_label || event.source_url || 'مصدر غير محدد';
    const group = groups.get(key) || {
      key,
      source_label: event.source_label || key,
      source_url: event.source_url || '',
      source_host: hostLabel(event.source_url || ''),
      candidates: 0,
      urgent: 0,
      high: 0,
      basic_windows: 0,
      missing_windows: 0,
      route_counts: {},
      next_event_starts_at: '',
      example_events: []
    };
    group.candidates += 1;
    if (event.priority?.key === 'urgent') group.urgent += 1;
    if (event.priority?.key === 'high') group.high += 1;
    if (event.schedule_quality === 'basic-window') group.basic_windows += 1;
    if (!event.attendance_window_ready) group.missing_windows += 1;
    const route = event.acquisition?.route || 'source-detail-probe';
    group.route_counts[route] = (group.route_counts[route] || 0) + 1;
    if (!group.next_event_starts_at || String(event.starts_at || '') < group.next_event_starts_at) group.next_event_starts_at = event.starts_at || '';
    if (group.example_events.length < 5) {
      group.example_events.push({
        id: event.id,
        title: event.title,
        city: event.city,
        starts_at: event.starts_at,
        detail_url: event.detail_url,
        priority: event.priority
      });
    }
    const selectedRoute = Object.entries(group.route_counts).sort((a, b) => b[1] - a[1])[0]?.[0] || route;
    const representative = event.acquisition?.route === selectedRoute
      ? event.acquisition
      : { route: selectedRoute, label: selectedRoute, next_action: event.acquisition?.next_action || 'افحص صفحة المصدر واستخرج البرنامج التفصيلي.' };
    group.acquisition = representative;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      route_counts: Object.fromEntries(Object.entries(group.route_counts).sort((a, b) => b[1] - a[1])),
      impact_score: group.candidates * 10 + group.urgent * 8 + group.high * 4 + group.basic_windows
    }))
    .sort((a, b) => b.impact_score - a.impact_score || b.candidates - a.candidates || a.source_label.localeCompare(b.source_label, 'ar'));
}

function writeActivationPage(report) {
  const rows = Array.isArray(report.events) ? report.events : [];
  const groups = Array.isArray(report.source_groups) ? report.source_groups : [];
  const canonical = absoluteUrl('activation.html');
  const topItems = rows.slice(0, 40).map((row, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: row.title,
    url: absoluteUrl(String(row.detail_url || 'events.html').replace(/^\.\//, '')),
    description: row.blockers?.[0] || row.acquisition?.next_action || ''
  }));
  const groupCards = groups.length
    ? groups.slice(0, 12).map((group) => `<article class="activation-card">
        <span class="chip">${escapeHtml(group.acquisition?.label || 'فحص المصدر')}</span>
        <h2>${escapeHtml(group.source_label)}</h2>
        <div class="signal-strip">
          <div class="signal"><span>المرشحون</span><b>${group.candidates}</b></div>
          <div class="signal"><span>عاجل</span><b>${group.urgent}</b></div>
          <div class="signal"><span>نوافذ أساسية</span><b>${group.basic_windows}</b></div>
        </div>
        <p class="muted">${escapeHtml(group.acquisition?.next_action || 'افحص صفحة المصدر واستخرج البرنامج التفصيلي.')}</p>
        <div class="activation-actions">
          ${group.source_url ? `<a class="cta" href="${escapeHtml(group.source_url)}">فتح المصدر</a>` : ''}
          <a class="cta" href="./activation.json">JSON</a>
        </div>
      </article>`).join('')
    : '<article class="activation-card"><h2>لا توجد مصادر تحتاج تفعيلًا</h2><p>كل الفعاليات النشطة لديها جدول تفصيلي أو لا توجد مرشحات حالية.</p></article>';
  const candidateRows = rows.slice(0, 60);
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({
    title: `تفعيل الجداول الحية | ${platformName}`,
    description: 'لوحة EventLive التشغيلية لتحويل الفعاليات ذات نافذة الحضور إلى جداول حية تفصيلية حسب المصدر والأولوية ومسار الاستخراج التالي.',
    canonical
  })}
  <link rel="alternate" type="application/json" href="./activation.json" />
  ${operationalPageCss()}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'WebPage', name: `تفعيل الجداول الحية | ${platformName}`, description: 'قائمة تشغيلية للفعاليات التي تحتاج جدولًا حيًا تفصيليًا ومجموعات المصادر الأعلى أثرًا.', url: canonical, inLanguage: 'ar-SA', isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl }, dateModified: buildAt })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'Dataset', name: 'EventLive Live Schedule Activation Queue', description: 'مرشحو تفعيل الجداول الحية مجمعون حسب المصدر ومسار الاستخراج.', inLanguage: 'ar-SA', url: absoluteUrl('activation.json'), license: absoluteUrl('ai-policy.txt'), creator: { '@type': 'Organization', name: platformName, url: siteUrl }, variableMeasured: Object.keys(report.totals || {}) })}
  ${jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', name: 'مرشحو تفعيل الجداول الحية', numberOfItems: rows.length, itemListElement: topItems })}
</head>
<body>
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>تشغيل اللايف</span><h1>تفعيل الجداول الحية</h1><p class="lead">هذه اللوحة تقرأ طابور التفعيل مباشرة وتحوّله إلى خطة عمل: أي مصدر نبدأ به، كم فعالية سيفتح، وما مسار الاستخراج المناسب لتحويل نافذة الحضور إلى جدول تفصيلي.</p><div class="signal-strip"><div class="signal"><span>مرشحو التفعيل</span><b>${report.totals?.candidates || 0}</b></div><div class="signal"><span>مصادر مؤثرة</span><b>${report.totals?.source_groups || 0}</b></div><div class="signal"><span>عاجل</span><b>${report.totals?.urgent || 0}</b></div><div class="signal"><span>نوافذ أساسية</span><b>${report.totals?.basic_window_candidates || 0}</b></div></div></div></section>
  <section class="section"><div class="wrap"><h2>مصادر التفعيل الأعلى أثرًا</h2><div class="grid">${groupCards}</div></div></section>
  <section class="section"><div class="wrap"><h2>قائمة التفعيل</h2>${operationalTable(['الفعالية', 'الأولوية', 'المصدر', 'مسار الاستخراج', 'النقص'], candidateRows, (row) => `<tr><th><a href="${escapeHtml(row.detail_url)}">${escapeHtml(row.title)}</a><br><span class="muted">${escapeHtml(row.city)} · ${escapeHtml(row.starts_at || '')}</span></th><td>${escapeHtml(row.priority?.label || '')}</td><td>${escapeHtml(row.source_label || '')}</td><td>${escapeHtml(row.acquisition?.label || '')}<br><span class="muted">${escapeHtml(row.acquisition?.route || '')}</span></td><td>${escapeHtml(row.blockers?.[0] || row.acquisition?.next_action || '')}</td></tr>`)}</div></section>
  <section class="section"><div class="wrap"><article class="readiness"><h2>ملف التشغيل</h2><p>البيانات الكاملة متاحة آليًا من <a href="./activation.json">activation.json</a>، وتشمل المرشحين، مجموعات المصادر، مسار الاستخراج، وروابط الطلب.</p><div class="activation-actions"><a class="cta" href="./organizer-intake.html">استلام برنامج من منظم</a><a class="cta" href="./source-coverage-gaps.html">فجوات المصادر</a><a class="cta" href="./readiness.html">جاهزية التشغيل</a></div></article></div></section>
</main>
${footer('./')}
</body>
</html>`;
  writeText(path.join(distDir, 'activation.html'), html);
}

function writeLiveOperationalFeeds(events) {
  const referenceMs = Date.now();
  const activeEvents = events.filter((event) => event.status !== 'ended');
  const liveEvents = events.filter((event) => event.status === 'live');
  const ongoingPrograms = events.filter((event) => event.status === 'ongoing');
  const upcomingEvents = events.filter((event) => event.status === 'upcoming');
  const liveReady = events.filter((event) => event.live_schedule_ready);
  const attendanceWindowReady = events.filter((event) => event.attendance_window_ready);
  const signals = {
    events: events.length,
    actionable: activeEvents.length,
    live: liveEvents.length,
    upcoming: upcomingEvents.length,
    ongoing_programs: ongoingPrograms.length,
    live_schedule_ready: liveReady.length,
    attendance_window_ready: attendanceWindowReady.length,
    basic_attendance_windows: events.filter((event) => event.schedule_quality === 'basic-window').length,
    needs_activation: activeEvents.filter((event) => !event.live_schedule_ready).length
  };
  const updates = liveUpdatesPayload(events);
  const queue = activeEvents
    .map((event) => ({
      ...compactLiveEvent(event, referenceMs),
      action_url: event.live_schedule_ready ? (event.detail_url || './event.html') : (event.detail_url || './events.html'),
      action_label: event.live_schedule_ready ? 'فتح الجدول الحي' : 'فتح بطاقة الفعالية',
      priority_reason: event.live_schedule_ready ? 'أقرب جدول حي جاهز' : 'فعالية قادمة تحتاج متابعة',
      priority_score: attendancePriority(event, referenceMs)
    }))
    .sort((a, b) => b.priority_score - a.priority_score || (a.minutes_to_start ?? 999999) - (b.minutes_to_start ?? 999999));
  const focus = queue[0] || null;
  writeJson('live-status.json', {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    timezone: 'Asia/Riyadh',
    totals: {
      events: events.length,
      live: liveEvents.length,
      ongoing_programs: ongoingPrograms.length,
      upcoming: upcomingEvents.length,
      ended: events.filter((event) => event.status === 'ended').length,
      live_schedule_ready: liveReady.length,
      attendance_window_ready: attendanceWindowReady.length,
      basic_attendance_windows: events.filter((event) => event.schedule_quality === 'basic-window').length,
      needs_activation: activeEvents.filter((event) => !event.live_schedule_ready).length
    },
    focus: {
      next_event: upcomingEvents.sort((a, b) => (dateValue(a.starts_at)?.getTime() || 0) - (dateValue(b.starts_at)?.getTime() || 0)).map((event) => compactLiveEvent(event, referenceMs))[0] || null,
      ongoing_program: ongoingPrograms.map((event) => compactLiveEvent(event, referenceMs))[0] || null,
      next_ready_event: liveReady.filter((event) => event.status !== 'ended').sort((a, b) => (dateValue(a.starts_at)?.getTime() || 0) - (dateValue(b.starts_at)?.getTime() || 0)).map((event) => compactLiveEvent(event, referenceMs))[0] || null
    },
    events: queue
  });
  writeJson('today.json', {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    timezone: 'Asia/Riyadh',
    intent: 'now-attendance-priority',
    storage_key: 'eventlive-saved-events',
    focus,
    queue,
    live_updates: {
      focus: updates.focus,
      queue: updates.updates,
      totals: updates.totals,
      links: {
        page: './updates.html',
        feed: './updates.json'
      }
    },
    signals,
    links: {
      page: './today.html',
      saved_events: './my-events.html',
      platform_status: './live-status.json',
      catalog: './events.json'
    }
  });
  const activationEvents = activeEvents
    .filter((event) => !event.live_schedule_ready || !Number(event.sessions_count || 0))
    .map((event) => activationCandidate(event, referenceMs))
    .sort((a, b) => a.priority.rank - b.priority.rank || (dateValue(a.starts_at)?.getTime() || 0) - (dateValue(b.starts_at)?.getTime() || 0));
  const activationGroups = activationSourceGroups(activationEvents);
  const activationReport = {
    generated_at: buildAt,
    platform: platformName,
    canonical_domain: platformDomain,
    intent: 'live-schedule-activation',
    totals: {
      candidates: activationEvents.length,
      urgent: activationEvents.filter((event) => event.priority.key === 'urgent').length,
      high: activationEvents.filter((event) => event.priority.key === 'high').length,
      needs_date: activationEvents.filter((event) => event.priority.key === 'needs-date').length,
      source_groups: activationGroups.length,
      basic_window_candidates: activationEvents.filter((event) => event.schedule_quality === 'basic-window').length,
      missing_window_candidates: activationEvents.filter((event) => !event.attendance_window_ready).length
    },
    focus: activationEvents[0] || null,
    source_groups: activationGroups,
    events: activationEvents,
    links: {
      events: absoluteUrl('events.json'),
      today: absoluteUrl('today.json'),
      live_status: absoluteUrl('live-status.json'),
      organizer_intake: absoluteUrl('organizer-intake.html')
    }
  };
  writeJson('activation.json', activationReport);
  writeActivationPage(activationReport);
}

function activationRuntimeScript() {
  return `<script>
(function () {
  var events = window.EVENTLIVE_EVENTS || [];
  function qs(name) { return new URLSearchParams(location.search).get(name) || ''; }
  function localUrl(value) {
    if (!value) return './events.html';
    if (/^https?:\\/\\//i.test(value)) return value;
    return value.replace(/^\\.\\//, './');
  }
  function abs(value) { return new URL(localUrl(value), location.href).href; }
  function fmt(value) {
    var date = new Date(value || '');
    if (!Number.isFinite(date.getTime())) return 'لم يحدد الوقت';
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' }).format(date);
  }
  function remaining(ms) {
    var value = Math.max(0, ms || 0);
    var day = Math.floor(value / 86400000);
    var hour = Math.floor((value % 86400000) / 3600000);
    var minute = Math.floor((value % 3600000) / 60000);
    if (day > 0) return day + ' يوم ' + hour + ' ساعة';
    if (hour > 0) return hour + ' ساعة';
    if (minute > 0) return minute + ' دقيقة';
    return 'أقل من دقيقة';
  }
  function state(event) {
    var start = new Date(event.starts_at || '').getTime();
    var end = new Date(event.ends_at || event.starts_at || '').getTime();
    var now = Date.now();
    if (!Number.isFinite(start)) return { label: 'وقت غير مؤكد', note: 'وقت غير مؤكد' };
    if (now < start) return { label: 'قادمة', note: 'تبدأ بعد ' + remaining(start - now) };
    if (Number.isFinite(end) && now <= end) {
      return event.event_kind === 'program'
        ? { label: 'برنامج جارٍ', note: 'نافذة البرنامج مفتوحة، تنتهي بعد ' + remaining(end - now) }
        : { label: 'مباشرة الآن', note: 'تنتهي بعد ' + remaining(end - now) };
    }
    return { label: 'منتهية', note: 'انتهت منذ ' + remaining(now - (Number.isFinite(end) ? end : start)) };
  }
  function pickEvent() {
    var wanted = decodeURIComponent(qs('event') || qs('id') || '').trim();
    var selected = events.find(function (event) {
      return [event.file_slug, event.id, event.slug].filter(Boolean).includes(wanted);
    });
    if (selected) return selected;
    return events.find(function (event) { return event.status !== 'ended'; }) || events[0] || null;
  }
  function text(selector, value) {
    document.querySelectorAll(selector).forEach(function (el) { el.textContent = value || ''; });
  }
  function attr(selector, name, value) {
    document.querySelectorAll(selector).forEach(function (el) {
      if (value) el.setAttribute(name, value);
      else el.removeAttribute(name);
    });
  }
  function renderSessions(event) {
    var html = (event.sessions || []).length
      ? event.sessions.map(function (session) {
          return '<tr><td>' + fmt(session.starts_at) + '</td><td>' + (session.title || 'جلسة') + '</td><td>' + (session.room || '') + '</td></tr>';
        }).join('')
      : '<tr><td colspan="3">لا توجد جلسات تفصيلية منشورة لهذه الفعالية حتى الآن.</td></tr>';
    document.querySelectorAll('[data-event-sessions]').forEach(function (el) { el.innerHTML = html; });
  }
  function render() {
    var event = pickEvent();
    if (!event) return;
    var current = state(event);
    var detail = abs(event.detail_url);
    var share = abs('share.html?event=' + encodeURIComponent(event.file_slug || event.id || ''));
    text('[data-event-title]', event.title);
    text('[data-event-summary]', event.summary);
    text('[data-event-city]', event.city_label);
    text('[data-event-venue]', event.venue_address || event.venue || event.city_label);
    text('[data-event-start]', fmt(event.starts_at));
    text('[data-event-end]', fmt(event.ends_at || event.starts_at));
    text('[data-event-status]', current.label);
    text('[data-event-time]', current.note);
    text('[data-event-source]', event.source_label || 'مصدر موثوق');
    text('[data-event-kind]', event.event_kind_label || '');
    text('[data-event-url]', detail);
    attr('[data-event-link]', 'href', detail);
    attr('[data-event-share-link]', 'href', share);
    attr('[data-event-calendar]', 'href', localUrl(event.ics_url));
    attr('[data-event-source-link]', 'href', event.source_url || event.evidence_url || detail);
    attr('[data-event-directions]', 'href', event.directions_url || event.maps_url || detail);
    attr('[data-event-image]', 'src', localUrl(event.image_url));
    attr('[data-event-image]', 'alt', event.image_alt || event.title);
    attr('[data-whatsapp]', 'href', 'https://wa.me/?text=' + encodeURIComponent(event.title + ' - ' + detail));
    renderSessions(event);
  }
  render();
  setInterval(render, 60000);
})();
</script>`;
}

function activationPageShell({ fileName, title, description, body, extraCss = '' }) {
  const canonical = absoluteUrl(fileName);
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: `${title} | ${platformName}`, description, canonical })}
  ${pageCss}
  <style>
    .activation-card{background:#fff;border:1px solid var(--line);border-radius:8px;padding:18px}
    .activation-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
    .activation-hero{padding:38px 0;background:linear-gradient(135deg,var(--green-dark),var(--green));color:#fff}
    .activation-hero h1{font-size:clamp(1.9rem,4vw,3.4rem)}
    .activation-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line)}
    .activation-table th,.activation-table td{border:1px solid var(--line);padding:10px;text-align:right;vertical-align:top}
    .activation-table th{background:#eef5ef}
    .poster-qr{width:min(260px,100%);aspect-ratio:1;border:1px solid var(--line);border-radius:8px;background:#fff;padding:12px}
    .event-url{direction:ltr;text-align:left;word-break:break-all}
    @media print{.topbar,.footer,.activation-actions{display:none}.activation-hero{background:#fff;color:#10231d;padding:0 0 18px}.section{padding:14px 0}.activation-card{box-shadow:none}}
    ${extraCss}
  </style>
  <script>window.EVENTLIVE_EVENTS = ${scriptValue(eventsForActivationPages)};</script>
</head>
<body>
${header('./')}
${body}
${footer('./')}
${activationRuntimeScript()}
</body>
</html>`;
}

let eventsForActivationPages = [];

async function writeActivationUtilityPages(events) {
  eventsForActivationPages = events.map(compactActivationEvent);
  writeText(path.join(distDir, 'qr-event.svg'), await QRCode.toString(absoluteUrl('events.html'), { type: 'svg', color: { dark: '#10231d', light: '#ffffff' } }));
  writeText(path.join(distDir, 'qr-share.svg'), await QRCode.toString(absoluteUrl('share.html'), { type: 'svg', color: { dark: '#0d6b52', light: '#ffffff' } }));
  writeText(path.join(distDir, 'qr-today.svg'), await QRCode.toString(absoluteUrl('today-events.html'), { type: 'svg', color: { dark: '#e5484d', light: '#ffffff' } }));

  const hero = (eyebrow, headline) => `<section class="activation-hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>${eyebrow}</span><h1 data-event-title>${headline}</h1><p class="lead" data-event-summary>اختر فعالية من EventLive لعرض تفاصيلها الحية.</p><div class="signal-strip"><div class="signal"><span>الحالة</span><b data-event-status>...</b></div><div class="signal"><span>الوقت الحي</span><b data-event-time>...</b></div><div class="signal"><span>المدينة</span><b data-event-city>...</b></div><div class="signal"><span>النوع</span><b data-event-kind>...</b></div></div></div></section>`;

  writeText(path.join(distDir, 'print.html'), activationPageShell({
    fileName: 'print.html',
    title: 'نسخة طباعة الفعالية',
    description: 'نسخة طباعة عامة لأي فعالية في EventLive تعرض الوقت الحي، الموقع، المصدر، الجلسات وروابط الحضور بدون الاعتماد على ملفات تسليم قديمة.',
    body: `<main>${hero('نسخة طباعة جاهزة', 'نسخة طباعة الفعالية')}<section class="section"><div class="wrap"><article class="activation-card"><div class="grid"><div><h2>بيانات الحضور</h2><p><strong>الموقع:</strong> <span data-event-venue></span></p><p><strong>البداية:</strong> <span data-event-start></span></p><p><strong>النهاية:</strong> <span data-event-end></span></p><p><strong>المصدر:</strong> <span data-event-source></span></p></div><div><img class="cover" data-event-image src="./assets/eventlive-hero.png" alt="EventLive" /></div></div><div class="activation-actions"><a class="cta" data-event-link href="./events.html">افتح صفحة الفعالية</a><a class="cta" data-event-calendar href="./events.ics">أضف للتقويم</a><button class="cta" type="button" onclick="window.print()">طباعة</button></div></article><h2>الجدول الحي</h2><table class="activation-table"><thead><tr><th>الوقت</th><th>الفقرة</th><th>المكان</th></tr></thead><tbody data-event-sessions></tbody></table></div></section></main>`
  }));

  writeText(path.join(distDir, 'share.html'), activationPageShell({
    fileName: 'share.html',
    title: 'مشاركة الفعالية',
    description: 'صفحة مشاركة EventLive العامة لأي فعالية موثوقة مع رابط مباشر وواتساب وتقويم ومصدر، وتعمل تلقائيًا من معرف الفعالية في الرابط.',
    body: `<main>${hero('مشاركة سريعة', 'مشاركة الفعالية')}<section class="section"><div class="wrap grid"><article class="activation-card"><img class="cover" data-event-image src="./assets/eventlive-hero.png" alt="EventLive" /><h2 data-event-title>فعالية EventLive</h2><p data-event-summary></p><p class="event-url" data-event-url></p><div class="activation-actions"><a class="cta" data-event-link href="./events.html">افتح التفاصيل</a><a class="cta" data-whatsapp href="https://wa.me/">واتساب</a><a class="cta" data-event-calendar href="./events.ics">التقويم</a><a class="cta" data-event-source-link href="./sources.html">المصدر</a></div></article><aside class="activation-card"><img class="poster-qr" src="./qr-share.svg" alt="QR يفتح صفحة مشاركة EventLive" /><h2>QR المشاركة</h2><p>يمكّن الزائر من فتح صفحة مشاركة EventLive ثم الوصول إلى الفعالية المختارة من الرابط.</p><p><strong>المدينة:</strong> <span data-event-city></span></p><p><strong>الوقت:</strong> <span data-event-time></span></p></aside></div></section></main>`
  }));

  writeText(path.join(distDir, 'signage.html'), activationPageShell({
    fileName: 'signage.html',
    title: 'لافتة QR للفعالية',
    description: 'لافتة QR حديثة من EventLive للاستخدام في مداخل الفعاليات والشاشات، تعرض اسم الفعالية والوقت الحي ورابطها الرسمي.',
    extraCss: '.activation-hero{min-height:52vh;display:grid;align-items:center}.poster-title{font-size:clamp(2rem,5vw,4.8rem);line-height:1.15}.poster-qr{width:min(360px,100%)}',
    body: `<main>${hero('لافتة حضور مباشرة', 'لافتة QR للفعالية')}<section class="section"><div class="wrap grid"><article class="activation-card"><h2 class="poster-title" data-event-title>فعالية EventLive</h2><p class="lead" data-event-summary></p><div class="signal-strip"><div class="signal"><span>البداية</span><b data-event-start></b></div><div class="signal"><span>النهاية</span><b data-event-end></b></div><div class="signal"><span>الموقع</span><b data-event-venue></b></div></div><div class="activation-actions"><a class="cta" data-event-link href="./events.html">افتح التفاصيل</a><a class="cta" data-event-directions href="./events.html">الاتجاهات</a></div></article><aside class="activation-card"><img class="poster-qr" src="./qr-event.svg" alt="QR يفتح فعاليات EventLive" /><h2>امسح للوصول إلى EventLive</h2><p class="event-url" data-event-url></p></aside></div></section></main>`
  }));
}

function writeAttendancePage() {
  const canonical = absoluteUrl('attendance.html');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  ${baseHead({ title: 'محفوظاتي للحضور | EventLive', description: 'فعالياتك المحفوظة وجداولها واتجاهاتها على هذا الجهاز، متاحة عند ضعف الاتصال.', canonical, noindex: true })}
  ${pageCss}
  <style>
    .attendance-list{display:grid;gap:14px}.attendance-item{display:grid;grid-template-columns:160px 1fr;gap:16px;background:#fff;border:1px solid var(--line);border-radius:8px;overflow:hidden}.attendance-item img{width:100%;height:100%;min-height:150px;object-fit:cover}.attendance-body{padding:16px}.attendance-body h2{margin:0 0 6px}.attendance-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.attendance-remove{background:#fff;color:var(--live);border:1px solid rgba(229,72,77,.35)}.attendance-empty{background:#fff;border:1px solid var(--line);border-radius:8px;padding:24px;text-align:center}.network-state{display:inline-flex;align-items:center;gap:8px;margin-top:12px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.12)}@media(max-width:620px){.attendance-item{grid-template-columns:1fr}.attendance-item img{aspect-ratio:16/9;min-height:0}.attendance-body{padding:14px}}
  </style>
</head>
<body data-page-kind="attendance">
${header('./')}
<main>
  <section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>جاهزة وقت الفعالية</span><h1>محفوظاتي للحضور</h1><p class="lead">احفظ الفعالية التي تنوي حضورها لتجد هنا جدولها المباشر، موقعها واتجاهاتها، حتى عند ضعف الشبكة.</p><span class="network-state" data-network-state aria-live="polite">جاري فحص الاتصال...</span></div></section>
  <section class="section"><div class="wrap"><div class="attendance-list" data-attendance-list aria-live="polite"></div><div class="attendance-empty" data-attendance-empty hidden><h2>لم تحفظ فعالية بعد</h2><p>افتح أي فعالية قادمة واضغط «احفظ للحضور» لتظهر هنا.</p><a class="cta" href="./events.html">استكشف الفعاليات</a></div></div></section>
</main>
${footer('./')}
<script id="eventlive-attendance-dashboard">
(function () {
  var storageKey = 'eventlive-attendance-events';
  var list = document.querySelector('[data-attendance-list]');
  var empty = document.querySelector('[data-attendance-empty]');
  var network = document.querySelector('[data-network-state]');
  function savedEvents() { try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (error) { return {}; } }
  function updateNetwork() { network.textContent = navigator.onLine ? 'متصل، الجداول تتحدث عند توفر جديد' : 'دون اتصال، نعرض آخر نسخة محفوظة'; }
  function eventJsonPath(saved) { return String(saved.path || '').replace(/\\.html(?:[?#].*)?$/, '.json'); }
  function el(name, className, text) { var node = document.createElement(name); if (className) node.className = className; if (text) node.textContent = text; return node; }
  function removeEvent(eventId, card) {
    var saved = savedEvents(); delete saved[eventId]; localStorage.setItem(storageKey, JSON.stringify(saved)); card.remove();
    if (!list.children.length) empty.hidden = false;
    if (typeof window.eventLiveTrack === 'function') window.eventLiveTrack('attendance_mode_removed', { event_id: eventId });
  }
  function renderCard(eventId, saved, event) {
    var card = el('article', 'attendance-item');
    var image = el('img'); image.src = event.image_url || './assets/eventlive-hero.png'; image.alt = event.image_alt || event.title || 'فعالية محفوظة'; image.loading = 'lazy';
    var body = el('div', 'attendance-body'); body.append(el('h2', '', event.title || eventId));
    body.append(el('p', '', [event.city_label || event.city, event.venue].filter(Boolean).join(' · ')));
    body.append(el('p', '', event.status_label || 'محفوظة للحضور'));
    var actions = el('div', 'attendance-actions');
    var open = el('a', 'cta', 'افتح الجدول'); open.href = saved.path || './events.html';
    actions.append(open);
    if (event.directions_url) { var directions = el('a', 'cta', 'الاتجاهات'); directions.href = event.directions_url; actions.append(directions); }
    var remove = el('button', 'cta attendance-remove', 'إزالة'); remove.type = 'button'; remove.addEventListener('click', function () { removeEvent(eventId, card); }); actions.append(remove);
    body.append(actions); card.append(image, body); list.append(card);
  }
  async function render() {
    var saved = savedEvents(); var entries = Object.entries(saved).sort(function (a, b) { return String(b[1].savedAt || '').localeCompare(String(a[1].savedAt || '')); });
    list.innerHTML = ''; empty.hidden = entries.length > 0;
    for (const entry of entries) {
      var eventId = entry[0], savedItem = entry[1];
      try { var response = await fetch(eventJsonPath(savedItem)); if (!response.ok) throw new Error('unavailable'); renderCard(eventId, savedItem, await response.json()); }
      catch (error) { renderCard(eventId, savedItem, { title: eventId, status_label: 'النسخة التفصيلية غير متاحة بعد' }); }
    }
  }
  window.addEventListener('online', updateNetwork); window.addEventListener('offline', updateNetwork); updateNetwork(); render();
})();
</script>
</body>
</html>`;
  writeText(path.join(distDir, 'attendance.html'), html);
}

function normalizePublicHref(value = '') {
  return String(value || '')
    .replace(/^https?:\/\/eventme\.live\//, './')
    .replace(/^\//, './')
    .replace(/^(?!\.\/)/, './');
}

function enhanceHomeRuntime(html, events) {
  const byUrl = new Map();
  for (const event of events) {
    byUrl.set(normalizePublicHref(event.detail_url), event);
    byUrl.set(normalizePublicHref(`events/${event.file_slug}.html`), event);
  }
  let next = html.replace(/<article class="card">[\s\S]*?<\/article>/g, (block) => {
    const href = block.match(/href="([^"]+)"/)?.[1] || '';
    const event = byUrl.get(normalizePublicHref(href));
    if (!event) return block;
    const liveTime = `<div class="card-when" data-live-time ${runtimeAttrs(event)}>جاري حساب الوقت...</div>`;
    if (/<div class="card-when"[\s\S]*?<\/div>/.test(block)) {
      return block.replace(/<div class="card-when"[\s\S]*?<\/div>/, liveTime);
    }
    return block.replace(/(<div class="card-foot">)/, `${liveTime}\n          $1`);
  });
  next = next.replace(/<script id="eventlive-runtime-clock">[\s\S]*?<\/script>/g, '');
  return next.replace(/<\/body>/i, `<script id="eventlive-runtime-clock">${liveRuntimeScript().replace(/^<script>|<\/script>$/g, '')}</script>\n</body>`);
}

function patchHomePage(events) {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) return false;
  const html = fs.readFileSync(indexPath, 'utf8');
  const now = Date.now();
  const upcoming = sortEventsByStart(events.filter((event) => event.status !== 'ended'));
  const upcomingIn72Hours = eventsForWindow(events, now, 72);
  const nextEvent = upcoming.find((event) => dateValue(event.starts_at)?.getTime() > now) || upcoming[0] || events[0];
  const soonCards = upcomingIn72Hours
    .slice(0, 12)
    .map((event) => homeEventCard(event))
    .join('\n');
  const comingSection = upcomingIn72Hours.length
    ? `<section class=\"h-section\" id=\"soon\" data-temporal-window-hours=\"72\">
      <div class=\"h-section-head\">
        <div>
          <h2>يبدأ قريبًا</h2>
          <p>خلال الساعات الاثنتين والسبعين القادمة</p>
        </div>
        <a class=\"more-link\" href=\"./today-events.html\">فعاليات اليوم</a>
      </div>
      <div class=\"card-row\" role=\"region\" aria-label=\"فعاليات تبدأ قريبًا\" tabindex=\"0\">
${soonCards}
      </div>
    </section>\n`
      : `<section class=\"h-section\" id=\"soon\" data-temporal-window-hours=\"72\">
      <div class=\"h-section-head\">
        <div>
          <h2>يبدأ قريبًا</h2>
          <p>خلال الساعات الاثنتين والسبعين القادمة</p>
        </div>
        <a class=\"more-link\" href=\"./today-events.html\">فعاليات اليوم</a>
      </div>
      <div class=\"card-row\" role=\"region\" aria-label=\"فعاليات تبدأ قريبًا\" tabindex=\"0\">
        <p class=\"empty-state\">لا توجد فعاليات ضمن الساعات 72 القادمة. تصفح \"ماذا في هذا الأسبوع؟\".</p>
      </div>
    </section>\n`;
  const tenDaysFromNow = now + (10 * 24 * 60 * 60 * 1000);
  const withinTenDays = upcoming.filter((event) => {
    const start = dateValue(event.starts_at)?.getTime();
    return Number.isFinite(start) && start >= now && start <= tenDaysFromNow;
  }).length;
  const sourceCount = unique(events.map((event) => event.source_label)).length;
  const cityCount = unique(events.map((event) => event.city)).length;
  const liveReadyCount = events.filter((event) => event.live_schedule_ready).length;
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'فعاليات السعودية القادمة | EventLive',
    numberOfItems: upcoming.length,
    itemListElement: upcoming.slice(0, 24).map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(compactEventUrl(event)),
      name: event.title
    }))
  };
  const ticker = upcoming.slice(0, 120).map(homeTickerEvent);
  const searchData = events.map(homeSearchEvent);
  let next = html
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(itemList)}</script>`)
    .replace(/تصفح\s+\d+\s+فعالية/g, `تصفح ${events.length} فعالية`)
    .replace(/<div class="board-stats">[\s\S]*?<\/div>/, `<div class="board-stats">
          <span><b>${withinTenDays}</b>خلال ١٠ أيام</span>
          <span><b>${cityCount}</b>مدينة</span>
          <span><b>${liveReadyCount}</b>فعالية بوقت رسمي</span>
        </div>`)
    .replace(/<p>[\d,]+\s+فعالية من\s+[\d,]+\s+مصدرًا مسجلًا · آخر مزامنة:[^<]*<\/p>/, `<p>${events.length} فعالية من ${sourceCount} مصدرًا مسجلًا · آخر مزامنة: ${formatDate(buildAt)} بتوقيت الرياض</p>`)
    .replace(/var ticker = [\s\S]*?;\n\s*var cdD =/, `var ticker = ${scriptValue(ticker)};\n      var cdD =`)
    .replace(/var searchData = [\s\S]*?;\n\s*var input =/, `var searchData = ${scriptValue(searchData)};\n      var input =`)
    .replace(/<section class=\"h-section\" id=\"soon\"[^>]*>[\s\S]*?<\/section>/, comingSection.trim())
    .replace(/<h3><a href=/g, '<h3><a dir="auto" href=');
  if (nextEvent) {
    next = next
      .replace(/(<h2 id="boardTitle">)[\s\S]*?(<\/h2>)/, `$1${escapeHtml(nextEvent.title)}$2`)
      .replace(/(<div class="b-meta" id="boardMeta">)[\s\S]*?(<\/div>)/, `$1${escapeHtml(`${nextEvent.city_label || cityLabel(nextEvent.city)} · ${formatDate(nextEvent.starts_at)}`)}$2`)
      .replace(/(<a class="primary" id="boardCta" href=")[^"]*(")/, `$1${escapeHtml(compactEventUrl(nextEvent))}$2`);
  }
  next = hideOwnerOnlyPublicLinks(enhanceHomeRuntime(next, events));
  if (next !== html) fs.writeFileSync(indexPath, next, 'utf8');
  return next !== html;
}

function patchEventsBrowsePage(events) {
  const eventsPath = path.join(distDir, 'events.html');
  if (!fs.existsSync(eventsPath)) return false;
  const html = fs.readFileSync(eventsPath, 'utf8');
  const cityLinks = new Map();
  const categoryLinks = new Map();
  const cityMap = {};
  const categoryMap = {};
  let officialSessions = 0;

  for (const event of events) {
    const city = event.city || 'Saudi Arabia';
    const cLabel = event.city_label || cityLabel(city);
    const cSlug = citySlug(city);
    cityMap[city] = cLabel;
    cityLinks.set(cSlug, { label: cLabel, href: event.city_url || `./cities/${cSlug}.html` });

    const category = String(event.category || '').trim();
    const catSlug = event.category_slug || categorySlug(category, event);
    const catLabel = event.category_label || categoryLabel(catSlug, category);
    if (category) categoryMap[category.toLowerCase()] = catLabel;
    categoryMap[catSlug.toLowerCase()] = catLabel;
    categoryLinks.set(catSlug, { label: catLabel, href: event.category_url || `./categories/${catSlug}.html` });

    officialSessions += Number(event.official_sessions_count || 0);
  }

  const sortedLinks = (links) => [...links.values()]
    .filter((item) => item.label && item.href)
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'))
    .map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`)
    .join('');

  const cityRow = `<div class="facet-row">
        <strong>المدن</strong>
        ${sortedLinks(cityLinks)}
      </div>`;
  const categoryRow = `<div class="facet-row">
        <strong>التصنيفات</strong>
        ${sortedLinks(categoryLinks)}
      </div>`;

  let next = html
    .replace(/--live:#e5484d/g, '--live:#c4212b')
    .replace(/--live:\s*#e5484d/g, '--live:#c4212b')
    .replace(/"url":"https:\/\/eventme\.live\/events\.json"/g, `"url":"${absoluteUrl('events.html')}"`)
    .replace(/<div class="label">الجلسات المتاحة<\/div>/g, '<div class="label">الجلسات الرسمية</div>')
    .replace(/<div class="label">جداول حية جاهزة<\/div>/g, '<div class="label">أجندات متعددة الجلسات</div>')
    .replace(/<div class="label">الفعاليات المنشورة<\/div><div class="value">[^<]*<\/div>/, `<div class="label">الفعاليات المنشورة</div><div class="value">${events.length}</div>`)
    .replace(/<div class="label">(?:الجلسات المتاحة|الجلسات الرسمية)<\/div><div class="value">[^<]*<\/div>/, `<div class="label">الجلسات الرسمية</div><div class="value">${officialSessions}</div>`)
    .replace(/<div class="label">المدن<\/div><div class="value">[^<]*<\/div>/, `<div class="label">المدن</div><div class="value">${cityLinks.size}</div>`)
    .replace(/<div class="label">(?:جداول حية جاهزة|أجندات متعددة الجلسات)<\/div><div class="value">[^<]*<\/div>/, `<div class="label">أجندات متعددة الجلسات</div><div class="value">${events.filter((event) => event.agenda_ready).length}</div>`)
    .replace(
      /<div class="facet-row">\s*<strong>المدن<\/strong>[\s\S]*?<\/div>\s*<div class="facet-row">\s*<strong>التصنيفات<\/strong>[\s\S]*?<\/div>/,
      `${cityRow}\n      ${categoryRow}`
    )
    .replace(/const CITY_AR = \{[\s\S]*?\};/, `const CITY_AR = ${scriptValue(cityMap)};`)
    .replace(/const CATEGORY_AR = \{[\s\S]*?\};/, `const CATEGORY_AR = ${scriptValue(categoryMap)};`)
    .replace(
      /const sessionCount = events\.reduce\(\(total, event\) => total \+ \(Array\.isArray\(event\.sessions\) \? event\.sessions\.length : 0\), 0\);/,
      'const sessionCount = events.reduce((total, event) => total + Number(event.official_sessions_count || 0), 0);'
    )
    .replace(
      /const liveReadyCount = events\.filter\(\(event\) => event\.live_schedule_ready\)\.length;/,
      'const liveReadyCount = events.filter((event) => event.agenda_ready).length;'
    );

  next = next
    .replace('<input id="eventSearch" type="search"', '<input id="eventSearch" aria-label="بحث في الفعاليات" type="search"')
    .replace('<select id="cityFilter">', '<select id="cityFilter" aria-label="تصفية حسب المدينة">')
    .replace('<select id="categoryFilter">', '<select id="categoryFilter" aria-label="تصفية حسب التصنيف">')
    .replace('<select id="audienceFilter">', '<select id="audienceFilter" aria-label="تصفية حسب فئة الجمهور">')
    .replace('<select id="statusFilter">', '<select id="statusFilter" aria-label="تصفية حسب حالة الفعالية">')
    .replace(/target="_blank" rel="noopener"/g, 'target="_blank" rel="noopener noreferrer"');

  const initialSearchBlock = `
    function applyInitialSearchQuery() {
      const params = new URLSearchParams(window.location.search);
      const query = (params.get('q') || params.get('search') || params.get('query') || '').trim();
      if (!query || !controls.search) return;
      controls.search.value = query;
      controls.search.setAttribute('data-initial-query', query);
    }
`;
  next = next
    .replace(/\n    function applyInitialSearchQuery\(\) \{[\s\S]*?\n    \}\n(?=\s*loadEvents\(\)\.then)/, '\n')
    .replace(/setupFilters\(\);\n\s*applyInitialSearchQuery\(\);/g, 'setupFilters();')
    .replace(/\n    loadEvents\(\)\.then\(\(\) => \{/, `${initialSearchBlock}\n    loadEvents().then(() => {`)
    .replace(/setupFilters\(\);/, 'setupFilters();\n      applyInitialSearchQuery();');

  next = enhanceHomeRuntime(next, events);
  next = hideOwnerOnlyPublicLinks(next);
  if (next !== html) fs.writeFileSync(eventsPath, next, 'utf8');
  return next !== html;
}

function patchOrganizersPage() {
  const organizersPath = path.join(distDir, 'organizers.html');
  if (!fs.existsSync(organizersPath)) return false;
  const html = fs.readFileSync(organizersPath, 'utf8');
  let next = html;
  if (!/organizer-intake\.html/.test(next)) {
    const intakeCta = '<a class="cta" href="./organizer-intake.html">إضافة فعالية أو جدول حي</a>';
    if (/<a class="cta" href="mailto:hello@eventme\.live[\s\S]*?<\/a>/.test(next)) {
      next = next.replace(/(<a class="cta" href="mailto:hello@eventme\.live[\s\S]*?<\/a>)/, `$1${intakeCta}`);
    } else if (/<\/main>/.test(next)) {
      next = next.replace('</main>', `<section class="section"><div class="wrap"><article class="readiness"><h2>مدخل سريع للمنظمين</h2><p>أرسل بيانات الفعالية والجلسات بصيغة منظمة تساعد EventLive على تحويلها إلى صفحة حضور وجدول حي.</p><div class="activation-actions">${intakeCta}</div></article></div></section></main>`);
    }
  }
  if (next !== html) fs.writeFileSync(organizersPath, next, 'utf8');
  return next !== html;
}

function patchScreenPage() {
  const screenPath = path.join(distDir, 'screen.html');
  const todayPath = path.join(distDir, 'today.json');
  if (!fs.existsSync(screenPath) || !fs.existsSync(todayPath)) return false;
  const fallback = JSON.parse(fs.readFileSync(todayPath, 'utf8'));
  const screenFallback = {
    ...fallback,
    queue: Array.isArray(fallback.queue) ? fallback.queue.slice(0, 4) : [],
    live_updates: {
      ...(fallback.live_updates || {}),
      queue: Array.isArray(fallback.live_updates?.queue) ? fallback.live_updates.queue.slice(0, 3) : []
    }
  };
  const html = fs.readFileSync(screenPath, 'utf8');
  const screenFitCss = `<style id="eventlive-screen-fit">
html, body { width:100%; height:100%; overflow:hidden; }
body > .site-head { display:none !important; }
body { line-height:1.45; }
.screen {
  height:100vh;
  min-height:100vh;
  max-height:100vh;
  overflow:hidden;
  grid-template-rows:72px minmax(0,1fr) 38px;
}
.screen .topbar,
.screen .footer { padding:12px clamp(18px, 2.4vw, 36px); }
.screen .topbar .brand .mark { width:42px; height:42px; }
.screen .clock { font-size:clamp(28px, 3.2vw, 46px); }
.screen .stage {
  min-height:0;
  height:100%;
  overflow:hidden;
  grid-template-columns:minmax(0, 1.04fr) minmax(300px, .62fr);
  gap:14px;
  padding:0 clamp(18px, 2.4vw, 36px) 12px;
}
.screen .focus,
.screen .side { min-height:0; overflow:hidden; border-radius:14px; }
.screen .focus {
  padding:clamp(18px, 2.4vw, 34px);
  gap:clamp(8px, 1.1vw, 14px);
  align-content:center;
}
.screen .focus h1 {
  font-size:clamp(30px, 4.1vw, 64px);
  line-height:1.1;
  max-height:2.25em;
  overflow:hidden;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
}
.screen .focus-meta {
  font-size:clamp(17px, 1.55vw, 26px);
  line-height:1.45;
  max-height:2.9em;
  overflow:hidden;
}
.screen .countdown { font-size:clamp(38px, 6vw, 92px); line-height:1; }
.screen .live-alert { padding:10px 12px; gap:4px; }
.screen .live-alert strong {
  font-size:clamp(16px, 1.5vw, 24px);
  line-height:1.3;
  max-height:2.6em;
  overflow:hidden;
}
.screen .live-alert small {
  font-size:clamp(12px, 1vw, 16px);
  line-height:1.35;
  max-height:2.7em;
  overflow:hidden;
}
.screen .actions { gap:8px; }
.screen .actions a { min-height:38px; padding:8px 12px; }
.screen .side { padding:16px; display:grid; grid-template-rows:auto minmax(0, 1fr) auto; gap:10px; }
.screen .side h2 { font-size:clamp(20px, 1.8vw, 30px); margin:0 0 4px; }
.screen .status-line { font-size:clamp(13px, 1vw, 16px); line-height:1.45; }
.screen .queue { gap:8px; min-height:0; overflow:hidden; align-content:start; }
.screen .queue-item {
  padding:9px 12px;
  gap:3px;
  min-height:0;
  overflow:hidden;
  align-content:center;
}
.screen .queue-item:nth-child(n+4) { display:none; }
.screen .queue-item .chip {
  min-height:26px;
  padding:4px 10px;
  font-size:clamp(11px, .82vw, 13px);
  line-height:1;
  justify-self:start;
  white-space:nowrap;
}
.screen .queue-item strong {
  font-size:clamp(14px, 1.05vw, 19px);
  line-height:1.45;
  overflow:hidden;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
  text-wrap:balance;
}
.screen .queue-item span:not(.chip) {
  font-size:clamp(12px, .92vw, 15px);
  line-height:1.45;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.screen .qr-panel {
  grid-template-columns:82px minmax(0, 1fr);
  padding:10px;
  gap:10px;
}
.screen .qr-panel img { width:82px; height:82px; border-radius:10px; padding:6px; }
.screen .qr-panel strong { font-size:clamp(15px, 1.2vw, 20px); margin:0 0 2px; }
.screen .qr-panel span,
.screen .footer { font-size:clamp(11px, .95vw, 15px); }
@media (max-height: 820px) {
  .screen { grid-template-rows:64px minmax(0,1fr) 32px; }
  .screen .topbar,
  .screen .footer { padding:8px clamp(16px, 2vw, 28px); }
  .screen .stage { padding:0 clamp(16px, 2vw, 28px) 8px; }
  .screen .side { grid-template-rows:auto minmax(0, 1fr); }
  .screen .queue { align-content:stretch; }
  .screen .queue-item { min-height:0; }
  .screen .queue-item:nth-child(n+3) { display:none; }
  .screen .qr-panel { display:none; }
}
@media (max-width: 760px) {
  html, body { overflow:hidden; }
  .screen { grid-template-rows:62px minmax(0, 1fr) 34px; }
  .screen .topbar { flex-direction:row; align-items:center; }
  .screen .stage {
    grid-template-columns:1fr;
    grid-template-rows:minmax(0, 54%) minmax(0, 46%);
    height:calc(100vh - 96px);
    padding:0 12px 10px;
    gap:10px;
  }
  .screen .focus { padding:14px; height:100%; min-height:0; }
  .screen .side { padding:12px; height:100%; min-height:0; }
  .screen .focus h1 { min-height:2.2em; }
  .screen .focus-meta { min-height:2.9em; }
  .screen .countdown { font-size:42px; min-height:1em; }
  .screen .live-alert { min-height:78px; }
  .screen .queue { min-height:160px; }
  .screen .queue-item:nth-child(n+3) { display:none; }
  .screen .qr-panel { display:none; }
  .screen .actions a { min-height:34px; padding:7px 10px; font-size:12px; }
  .screen .footer { padding:7px 12px; }
}
body[data-screen-mode="event-screen"] .screen .side { grid-template-rows:auto minmax(0, 1fr); }
body[data-screen-mode="event-screen"] .screen .queue { align-content:start; }
body[data-screen-mode="event-screen"] .screen .queue-item { padding:8px 12px; }
body[data-screen-mode="event-screen"] .screen .queue-item:nth-child(n+3) { display:grid; }
body[data-screen-mode="event-screen"] .screen .queue-item:nth-child(n+5) { display:none; }
body[data-screen-mode="event-screen"] .screen .qr-panel { display:none !important; }
</style>`;
  const screenEventModeScript = String.raw`
    const screenParams = new URLSearchParams(window.location.search);
    const requestedEventKey = (screenParams.get('event') || screenParams.get('id') || screenParams.get('slug') || '').trim();

    function escapeHTML(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function formatClock(date) {
      return date.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });
    }

    function formatDate(iso) {
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? String(iso || '-') : date.toLocaleString('ar-SA', { dateStyle:'medium', timeStyle:'short' });
    }

    function formatRemaining(event) {
      const now = Date.now();
      const start = new Date(event.starts_at).getTime();
      const end = new Date(event.ends_at).getTime();
      if (!Number.isNaN(start) && now < start) {
        const totalMinutes = Math.max(0, Math.ceil((start - now) / 60000));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        if (days > 0) return days + ' يوم ' + hours + ' س';
        if (hours > 0) return hours + ' س ' + minutes + ' د';
        return minutes + ' د';
      }
      if (!Number.isNaN(end) && now <= end) return event.status === 'ongoing' ? 'برنامج جارٍ' : 'مباشر الآن';
      return event.status_label || 'غير محدد';
    }

    function normalizeKey(value) {
      return String(value || '').trim().toLowerCase().replace(/^\.\/events\//, '').replace(/\.html$/, '');
    }

    function findRequestedEvent(events, key) {
      const needle = normalizeKey(key);
      if (!needle) return null;
      return events.find((event) => [
        event.id,
        event.slug,
        event.file_slug,
        event.detail_url,
        event.url,
        event.canonical_url
      ].some((value) => normalizeKey(value) === needle || normalizeKey(value).endsWith('/' + needle)));
    }

    function windowStatus(startsAt, endsAt) {
      const now = Date.now();
      const start = new Date(startsAt).getTime();
      const end = new Date(endsAt || startsAt).getTime();
      if (!Number.isNaN(start) && now < start) return { status:'upcoming', label:'قادمة', reason:'الجلسة القادمة' };
      if (!Number.isNaN(end) && now <= end) return { status:'live', label:'تحدث الآن', reason:'يعرض الآن' };
      return { status:'ended', label:'انتهت', reason:'آخر ما انتهى' };
    }

    function sessionToScreenItem(session, event, index) {
      const status = windowStatus(session.starts_at || event.starts_at, session.ends_at || event.ends_at || session.starts_at);
      const room = session.room || event.venue || event.venue_address || '';
      return {
        id: session.id || event.id + '-session-' + index,
        title: session.title || event.title,
        starts_at: session.starts_at || event.starts_at,
        ends_at: session.ends_at || event.ends_at || session.starts_at || event.starts_at,
        status: status.status,
        status_label: status.label,
        priority_reason: status.reason,
        action_label: 'فتح بطاقة الفعالية',
        action_url: event.detail_url || './events.html',
        city_label: event.city_label || event.city || '',
        city: event.city || '',
        venue: room,
        room,
        track: session.track || '',
        speaker: session.speaker || '',
        kind: 'session'
      };
    }

    function fallbackEventItem(event) {
      const status = windowStatus(event.starts_at, event.ends_at);
      return {
        id: event.id,
        title: event.title,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        status: status.status,
        status_label: status.label,
        priority_reason: status.reason,
        action_label: event.live_schedule_ready ? 'فتح الجدول الحي' : 'فتح بطاقة الفعالية',
        action_url: event.detail_url || './events.html',
        city_label: event.city_label || event.city || '',
        city: event.city || '',
        venue: event.venue || '',
        room: event.venue || '',
        track: event.category_label || event.category || '',
        kind: 'event'
      };
    }

    function normalizeUpdateForScreen(update, event) {
      if (!update) return null;
      const linkedSession = (event.sessions || []).find((session) => session.id && session.id === update.session_id);
      return {
        priority_label: update.priority_label || (update.level === 'room_change' ? 'تغيير مهم' : 'تحديث حي'),
        level_label: update.level_label || update.level || 'تحديث',
        title: update.title || 'تحديث حي',
        message: update.message || '',
        session_room: update.session_room || linkedSession?.room || '',
      };
    }

    function eventToScreenData(event) {
      const rawSessions = Array.isArray(event.sessions) && event.sessions.length
        ? event.sessions
        : [event.attendance_window || fallbackEventItem(event)];
      const sessions = rawSessions.map((session, index) => sessionToScreenItem(session, event, index));
      const current = sessions.find((session) => session.status === 'live');
      const upcoming = sessions.filter((session) => session.status === 'upcoming');
      const ended = sessions.filter((session) => session.status === 'ended');
      const focus = current || upcoming[0] || ended.at(-1) || fallbackEventItem(event);
      const queue = (current ? [current, ...upcoming] : upcoming.length ? upcoming : ended.slice(-3)).slice(0, 4);
      const liveUpdates = Array.isArray(event.live_updates) ? event.live_updates : [];
      return {
        mode: 'event-screen',
        generated_at: new Date().toISOString(),
        platform: 'EventLive',
        focus,
        queue,
        screen_title: event.title || 'فعالية EventLive',
        screen_summary: [
          (event.city_label || event.city || '').trim(),
          (event.venue || '').trim(),
          sessions.length ? sessions.length + ' فقرات' : '',
          current ? 'جلسة مباشرة الآن' : upcoming.length ? upcoming.length + ' قادمة' : 'انتهى الجدول'
        ].filter(Boolean).join(' | '),
        live_updates: {
          focus: normalizeUpdateForScreen(liveUpdates[0], event),
          totals: {
            updates: liveUpdates.length,
            urgent: liveUpdates.filter((update) => ['room_change', 'delay'].includes(update.level)).length
          }
        },
        signals: {
          events: 1,
          upcoming: upcoming.length,
          ongoing_programs: current ? 1 : 0,
          live_schedule_ready: sessions.length
        }
      };
    }`;
  const screenQueueRendererScript = String.raw`function renderQueueItem(event) {
      const meta = event.kind === 'session'
        ? [formatDate(event.starts_at), event.room || event.venue, event.track].filter(Boolean).join(' | ')
        : [event.city_label || event.city, event.venue, formatDate(event.starts_at)].filter(Boolean).join(' | ');
      return '<article class="queue-item">' +
        '<span class="chip ' + escapeHTML(event.status || '') + '">' + escapeHTML(event.status_label || event.action_label || 'أولوية') + '</span>' +
        '<strong>' + escapeHTML(event.title) + '</strong>' +
        '<span>' + escapeHTML(meta) + '</span>' +
      '</article>';
    }`;
  const screenRefreshScript = String.raw`async function refresh() {
      try {
        if (requestedEventKey) {
          const response = await fetch('./events.json', { cache:'no-store' });
          if (response.ok) {
            const catalog = await response.json();
            const event = findRequestedEvent(catalog.events || [], requestedEventKey);
            screenData = event
              ? eventToScreenData(event)
              : {
                mode: 'event-missing',
                focus: null,
                queue: [],
                live_updates: { focus: null, totals: { updates: 0, urgent: 0 } },
                signals: { events: 0, upcoming: 0, ongoing_programs: 0, live_schedule_ready: 0 },
                screen_summary: 'لم يتم العثور على الفعالية المطلوبة: ' + requestedEventKey
              };
          }
        } else {
          const response = await fetch('./today.json', { cache:'no-store' });
          if (response.ok) screenData = await response.json();
        }
      } catch {}
      render(screenData);
    }`;
  let next = html
    .replace(/const fallbackToday = \{[\s\S]*?\};\n\s*const controls =/, `const fallbackToday = ${scriptValue(screenFallback)};\n    const controls =`)
    .replace(/"dateModified":"[^"]+"/g, `"dateModified":"${buildAt}"`)
    .replace(/<style id="eventlive-screen-fit">[\s\S]*?<\/style>/g, '')
    .replace(/<\/head>/i, `  ${screenFitCss}\n</head>`)
    .replace(/\n\s*const screenParams = new URLSearchParams\(window\.location\.search\);[\s\S]*?\n\s*function renderQueueItem\(event\) \{/, '\n    function renderQueueItem(event) {')
    .replace(/\n\s*document\.body\.dataset\.screenMode = data\.mode \|\| 'platform';[\s\S]*?if \(screenQrPanel\) screenQrPanel\.hidden = data\.mode === 'event-screen';/g, '')
    .replace(/<span><strong>\s*<span class="brand-word"[\s\S]*?<\/span>\s*<\/strong><span>شاشة الحضور الحية<\/span><\/span>/, '<span><strong>شاشة الحضور الحية</strong><span>EventLive</span></span>')
    .replace(/<a href="\.\/today\.json">ملف الآن JSON<\/a>/g, '')
    .replace(/<a href="\.\/events\.json">[^<]*<\/a>/g, '')
    .replace(/\[event\.city, event\.venue, formatDate\(event\.starts_at\)\]\.filter\(Boolean\)\.join\(' \| '\)/g, "[event.city_label || event.city, event.venue, formatDate(event.starts_at)].filter(Boolean).join(' | ')")
    .replace(/\[focus\.city, focus\.venue, focus\.action_label\]\.filter\(Boolean\)\.join\(' \| '\)/g, "[focus.city_label || focus.city, focus.venue, focus.action_label].filter(Boolean).join(' | ')")
    .replace(/\(signals\.actionable \|\| 0\) \+ ' أولوية قابلة للتصرف \| ' \+ \(signals\.live_schedule_ready \|\| 0\) \+ ' جدول حي جاهز \| ' \+ \(liveUpdates\.urgent \|\| 0\) \+ ' تحديث مهم'/g, "(signals.events || 0) + ' فعالية في المنصة | ' + (signals.upcoming || 0) + ' قادمة | ' + (signals.ongoing_programs || 0) + ' برامج جارية | ' + (signals.live_schedule_ready || 0) + ' جدول حي جاهز'")
    .replace(/let screenData = fallbackToday;\n/, `let screenData = fallbackToday;\n${screenEventModeScript}\n`)
    .replace(/function renderQueueItem\(event\) \{[\s\S]*?\n    \}\n\n    function render\(data\) \{/, `${screenQueueRendererScript}\n\n    function render(data) {`)
    .replace(/controls\.clock\.textContent = formatClock\(now\);/, `controls.clock.textContent = formatClock(now);
      document.body.dataset.screenMode = data.mode || 'platform';
      const screenSideTitle = document.querySelector('.screen .side h2');
      const screenBrandTitle = document.querySelector('.screen .brand strong');
      const screenQrPanel = document.querySelector('.screen .qr-panel');
      if (screenSideTitle) screenSideTitle.textContent = data.mode === 'event-screen' ? 'جدول الفعالية الآن' : 'القادم على EventLive';
      if (screenBrandTitle) screenBrandTitle.textContent = data.mode === 'event-screen' ? 'شاشة تشغيل الفعالية' : 'شاشة الحضور الحية';
      if (screenQrPanel) screenQrPanel.hidden = data.mode === 'event-screen';`)
    .replace(/controls\.signals\.textContent = \(signals\.events \|\| 0\) \+ ' فعالية في المنصة \| ' \+ \(signals\.upcoming \|\| 0\) \+ ' قادمة \| ' \+ \(signals\.ongoing_programs \|\| 0\) \+ ' برامج جارية \| ' \+ \(signals\.live_schedule_ready \|\| 0\) \+ ' جدول حي جاهز';/, `controls.signals.textContent = data.mode === 'event-screen'
        ? (data.screen_summary || ((signals.live_schedule_ready || 0) + ' فقرات | ' + (signals.upcoming || 0) + ' قادمة'))
        : (signals.events || 0) + ' فعالية في المنصة | ' + (signals.upcoming || 0) + ' قادمة | ' + (signals.ongoing_programs || 0) + ' برامج جارية | ' + (signals.live_schedule_ready || 0) + ' جدول حي جاهز';`)
    .replace(/async function refresh\(\) \{[\s\S]*?\n    \}\n\n    refresh\(\);/, `${screenRefreshScript}\n\n    refresh();`);
  if (next !== html) fs.writeFileSync(screenPath, next, 'utf8');
  return next !== html;
}

function writeServiceWorker() {
  const swPath = path.join(distDir, 'sw.js');
  const coreAssets = [
    './',
    './index.html',
    './events.html',
    './llms.txt',
    './ai-policy.txt',
    './robots.txt',
    './sitemap.xml',
    './cities.html',
    './cities.json',
    './categories.html',
    './categories.json',
    './audiences.html',
    './manifest.webmanifest',
    './search-index.json',
    './audiences.json',
    './today-events.html',
    './attendance.html',
    './today.html',
    './today.json',
    './live-status.json',
    './updates.html',
    './updates.json',
    './this-month.html',
    './this-month.json',
    './regions.html',
    './regions.json',
    './source-coverage-gaps.html',
    './source-coverage-gaps.json',
    './source-health.html',
    './source-health.json',
    './organizer-intake.html',
    './organizer-intake.json',
    './activation.json',
    './readiness.html',
    './readiness.json',
    './events.ics',
    './feeds/all.ics',
    './feeds/all.xml',
    './feeds/all.json',
    './feeds/index.json'
  ];
  const precache = coreAssets.filter((asset) => {
    if (asset === './') return true;
    return fs.existsSync(path.join(distDir, asset.replace(/^\.\//, '')));
  });
  writeText(swPath, `const CACHE_NAME = 'eventlive-static-${Date.now()}';\nconst PRECACHE = ${JSON.stringify(precache, null, 2)};\n\nself.addEventListener('install', (event) => {\n  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));\n});\n\nself.addEventListener('activate', (event) => {\n  event.waitUntil((async () => {\n    const keys = await caches.keys();\n    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));\n    await self.clients.claim();\n  })());\n});\n\nself.addEventListener('message', (event) => {\n  if (event.data?.type !== 'CACHE_EVENT_ASSETS') return;\n  const assets = Array.isArray(event.data.assets) ? event.data.assets : [];\n  event.waitUntil((async () => {\n    const cache = await caches.open(CACHE_NAME);\n    let cached = 0;\n    for (const asset of assets) {\n      try {\n        const url = new URL(asset, self.location.href);\n        if (url.origin !== self.location.origin) continue;\n        const response = await fetch(url.href, { credentials: 'same-origin' });\n        if (!response.ok) continue;\n        await cache.put(url.href, response.clone());\n        cached += 1;\n      } catch (error) {}\n    }\n    event.ports?.[0]?.postMessage({ type: 'CACHE_EVENT_ASSETS_RESULT', cached });\n  })());\n});\n\nself.addEventListener('fetch', (event) => {\n  if (event.request.method !== 'GET') return;\n  const isNavigationRequest = event.request.mode === 'navigate' || event.request.headers.get('Accept')?.includes('text/html');\n  if (isNavigationRequest) {\n    event.respondWith(\n      fetch(event.request).then((response) => {\n        return caches.open(CACHE_NAME).then((cache) => {\n          cache.put(event.request, response.clone()).catch(() => {});\n          return response;\n        });\n      }).catch(async () => (await caches.match(event.request)) || caches.match('./index.html'))\n    );\n    return;\n  }\n\n  const url = new URL(event.request.url);\n  const isEventAsset = url.origin === self.location.origin && (\n    /\\/events\\/.+\\.(?:json|ics)$/.test(url.pathname)\n    || ['image', 'style', 'script', 'font'].includes(event.request.destination)\n  );\n  if (!isEventAsset) {\n    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));\n    return;\n  }\n  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {\n    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone())).catch(() => {});\n    return response;\n  })));\n});\n`);
}

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(fullPath);
    return entry.name.endsWith('.html') ? [path.relative(distDir, fullPath)] : [];
  });
}

function sitemapImageXml(event = {}) {
  if (!event.image_url) return '';
  const imageUrl = publicAssetUrl(event.image_url);
  if (!imageUrl) return '';
  if (String(event.image_url).startsWith('/') && !localImagePathExists(event.image_url)) return '';
  const caption = unique([
    event.title,
    event.city_label || cityLabel(event.city),
    event.source_label
  ]).join(' - ');
  return `\n    <image:image><image:loc>${xmlText(imageUrl)}</image:loc><image:title>${xmlText(event.title)}</image:title><image:caption>${xmlText(caption)}</image:caption></image:image>`;
}

function writeSitemap(events = []) {
  const eventByPage = new Map(events.map((event) => [`events/${event.file_slug}.html`.normalize('NFC'), event]));
  const ownerOnlyPages = new Set(['sources.html', 'methodology.html', 'trust.html', 'candidates.html', 'resolver.html', 'source-health.html', 'owner-status.html', 'attendance.html']);
  const sitemapPaths = [...new Set(htmlFiles(distDir)
    .map((file) => file.replace(/\\/g, '/').normalize('NFC'))
    .filter((file) => !ownerOnlyPages.has(file))
    .map((file) => file === 'index.html' ? '' : file))];
  const urls = sitemapPaths
    .sort()
    .map((file) => {
      const event = eventByPage.get(file);
      const lastmod = dateValue(event?.updated_at || event?.ends_at || event?.starts_at)?.toISOString().slice(0, 10) || buildAt.slice(0, 10);
      return `  <url><loc>${xmlText(`${siteUrl}/${file}`)}</loc><lastmod>${lastmod}</lastmod>${event ? sitemapImageXml(event) : ''}</url>`;
    });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;
  writeText(path.join(distDir, 'sitemap.xml'), sitemap);
}

function writeAiSearchFiles(events) {
  const cities = new Set(events.map((event) => event.city_slug || citySlug(event.city || '')).filter(Boolean));
  const categories = new Set(events.map((event) => event.category_slug || slugify(event.category || '')).filter(Boolean));
  const activeOrUpcoming = events.filter((event) => event.status === 'ongoing' || event.status === 'upcoming').length;
  const ended = events.filter((event) => event.status === 'ended').length;
  const liveReady = events.filter((event) => event.live_schedule_ready).length;
  const sourceImageEvents = events.filter((event) => !event.generated_image && /\/assets\/event-images\//.test(event.image_url || '')).length;

writeText(path.join(distDir, 'robots.txt'), stripTrailingWhitespace(`User-agent: *
Allow: /
Disallow: /events.json
Disallow: /events-catalog.json
Disallow: /sources.html
Disallow: /methodology.html
Disallow: /trust.html
Disallow: /source-health.html
Disallow: /owner-status.html
Disallow: /owner-status.json
Host: ${platformDomain}
Sitemap: ${siteUrl}/sitemap.xml
`));

  writeText(path.join(distDir, 'llms.txt'), stripTrailingWhitespace(`# ${platformName}

${platformName} is an Arabic-first live reference for events, seasons, exhibitions, workshops, and technical programs in Saudi Arabia.
Primary domain: ${siteUrl}/
Canonical brand: ${platformName}
Timezone: Asia/Riyadh
Generated at: ${buildAt}

Current public dataset:
- Events: ${events.length}
- Active or upcoming events: ${activeOrUpcoming}
- Ended events preserved as normal event pages: ${ended}
- Live-ready schedules: ${liveReady}
- Cities: ${cities.size}
- Categories: ${categories.size}
- Events with source images: ${sourceImageEvents}

Core user value:
- Know what is happening now at an event.
- See what starts next, what has ended, and how much time remains.
- Confirm the city, venue, attendance mode, source evidence, and canonical event page.
- Save event sessions and attendance windows from official or approved public evidence.

Important public pages:
- Home: ${siteUrl}/
- All events: ${siteUrl}/events.html
- Today attendance mode: ${siteUrl}/today.html
- This week: ${siteUrl}/this-week.html
- Cities: ${siteUrl}/cities.html
- Categories: ${siteUrl}/categories.html
- Guides: ${siteUrl}/guides.html
- Saudi events today: ${siteUrl}/saudi-events-today.html
- Saudi events tomorrow: ${siteUrl}/saudi-events-tomorrow.html
- Saudi weekend events: ${siteUrl}/saudi-events-weekend.html
- Saudi events this month: ${siteUrl}/saudi-events-this-month.html
- Riyadh events today: ${siteUrl}/riyadh-events-today.html
- Jeddah events: ${siteUrl}/jeddah-events.html
- Online tech courses: ${siteUrl}/online-tech-courses.html
- Ticketed and registration events: ${siteUrl}/saudi-ticketed-events.html
- Conferences and exhibitions: ${siteUrl}/saudi-conferences-exhibitions.html
- Sports and matches: ${siteUrl}/saudi-sports-matches.html
- Free Saudi events: ${siteUrl}/free-saudi-events.html
- Saudi events FAQ: ${siteUrl}/saudi-events-faq.html
- Organizers: ${siteUrl}/organizers.html
- Readiness: ${siteUrl}/readiness.html

Machine-readable feeds:
- Live status JSON: ${siteUrl}/live-status.json
- Sources JSON: ${siteUrl}/sources.json
- Readiness JSON: ${siteUrl}/readiness.json
- Activation JSON: ${siteUrl}/activation.json
- Methodology JSON: ${siteUrl}/methodology.json
- ICS calendar: ${siteUrl}/events.ics
- Sitemap: ${siteUrl}/sitemap.xml

Citation guidance for AI/search systems:
- Prefer canonical event detail pages under ${siteUrl}/events/ when citing a specific event.
- Preserve event title, source label, source URL, date, city, venue, and canonical URL.
- Treat ended events as normal public event records, not a separate archive.
- Do not present candidates, discovery-only signals, or draft records as confirmed published events.
- Do not infer details that are absent from the public EventLive page or its cited official source.

Publication policy:
- Official and approved public sources can publish when date, place, and source evidence are complete.
- Discovery-only sources are used as evidence signals and are not published directly.
- Blocked or protected sources are not bypassed.
`));

  writeText(path.join(distDir, 'ai-policy.txt'), stripTrailingWhitespace(`# ${platformName} AI and Search Policy

${platformName} welcomes indexing, retrieval, summarization, and citation of public pages on ${siteUrl}/ when outputs preserve the event source, date, city, venue, and canonical URL.

Allowed public context:
- Event detail pages, city pages, category pages, guides, organizer pages, and public machine-readable feeds.
- Ended events may be summarized as normal public event records with their historical dates intact.
- Machine-readable feeds may be used to understand current counts, live readiness, and source transparency.

Required attribution:
- Cite the canonical EventLive URL for the page being summarized.
- Preserve the official source label and source URL when they are shown.
- Keep dates and times in Asia/Riyadh unless the page states otherwise.

Boundaries:
- Do not present source candidates, discovery-only records, backlog rows, or draft data as confirmed public events.
- Do not bypass protected sites, bot defenses, authentication walls, or partner-only APIs on EventLive's behalf.
- Do not remove source evidence or change the event city/date when summarizing.

Preferred files:
- ${siteUrl}/llms.txt
- ${siteUrl}/live-status.json
- ${siteUrl}/sources.json
- ${siteUrl}/readiness.json
- ${siteUrl}/methodology.json
- ${siteUrl}/sitemap.xml
`));
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(filePath);
    return [filePath];
  });
}

function normalizeBrandText(value) {
  return String(value)
    .replace(/EventMe/g, platformName)
    .replace(/Eventlive/g, platformName)
    .replace(/EventLive/g, platformName)
    .replace(/eventme-hero/g, 'eventlive-hero')
    .replace(/eventme-live/g, 'eventlive');
}

function normalizeSeoMetaDescription(html) {
  return html.replace(/<meta name="description" content="([^"]*)"\s*\/?>/i, (_match, description) => {
    return `<meta name="description" content="${escapeHtml(seoDescription(description))}" />`;
  }).replace(/<meta property="og:description" content="([^"]*)"\s*\/?>/i, (_match, description) => {
    return `<meta property="og:description" content="${escapeHtml(seoDescription(description))}" />`;
  });
}

function htmlText(value = '') {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function attrValue(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || '';
}

function injectFallbackJsonLd(html) {
  const hasPageLevelJsonLd = /"@type"\s*:\s*"(?:WebPage|CollectionPage|Event|ContactPage|Article)"/i.test(html);
  if (hasPageLevelJsonLd) return html;
  const canonical = attrValue(html, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    || attrValue(html, /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  if (!canonical || !canonical.startsWith(siteUrl)) return html;
  const title = htmlText(attrValue(html, /<title>([\s\S]*?)<\/title>/i)).replace(/\s*\|\s*EventLive\s*$/i, '') || platformName;
  const description = attrValue(html, /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
    || attrValue(html, /<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i)
    || seoDescription(title);
  const type = /organizer-intake\.html$/.test(canonical) ? 'ContactPage' : 'WebPage';
  return html.replace(/<\/head>/i, `  ${jsonLd({
    '@context': 'https://schema.org',
    '@type': type,
    inLanguage: 'ar-SA',
    name: title,
    description: seoDescription(description),
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: platformName, url: siteUrl },
    dateModified: buildAt
  })}\n</head>`);
}

function htmlRelativePrefix(filePath = '') {
  const relativeFile = path.relative(distDir, filePath).replace(/\\/g, '/');
  const depth = Math.max(0, relativeFile.split('/').length - 1);
  return depth ? '../'.repeat(depth) : './';
}

function injectPlatformWebSiteJsonLd(html) {
  if (/"@type"\s*:\s*"SearchAction"/.test(html)) return html;
  return html.replace(/<\/head>/i, `  ${platformWebSiteJsonLd()}\n</head>`);
}

function injectGlobalFeedAlternates(html, filePath) {
  if (/feeds\/all\.xml/.test(html) && /feeds\/all\.json/.test(html) && /events\.ics/.test(html)) return html;
  const prefix = htmlRelativePrefix(filePath);
  const links = [
    `<link rel="alternate" type="text/calendar" title="EventLive - تقويم الفعاليات" href="${prefix}events.ics" />`,
    `<link rel="alternate" type="application/rss+xml" title="EventLive - RSS" href="${prefix}feeds/all.xml" />`,
    `<link rel="alternate" type="application/feed+json" title="EventLive - JSON Feed" href="${prefix}feeds/all.json" />`
  ].filter((link) => !html.includes(link)).join('\n  ');
  if (!links) return html;
  return html.replace(/<\/head>/i, `  ${links}\n</head>`);
}

function enhanceSeoHead(html, filePath) {
  const canonical = attrValue(html, /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    || attrValue(html, /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  if (!canonical || !canonical.startsWith(siteUrl)) return html;

  let next = html;
  const ownerOnly = isOwnerOnlyPage(filePath);
  const hasRobots = /<meta\b[^>]*name=["']robots["'][^>]*>/i.test(next);
  if (!hasRobots) {
    const robots = ownerOnly
      ? '<meta name="robots" content="noindex,nofollow" />'
      : '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />';
    next = next.replace(/(<link\b[^>]*rel=["']canonical["'][^>]*>)/i, `$1\n  ${robots}`);
  } else {
    const robots = ownerOnly
      ? '<meta name="robots" content="noindex,nofollow" />'
      : '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />';
    next = next.replace(/<meta\b[^>]*name=["']robots["'][^>]*>/i, robots);
  }

  if (!/<link\b[^>]*hreflang=["']ar-SA["'][^>]*>/i.test(next)) {
    next = next.replace(/(<link\b[^>]*rel=["']canonical["'][^>]*>)/i, `$1\n  <link rel="alternate" hreflang="ar-SA" href="${escapeHtml(canonical)}" />`);
  }
  if (!/<link\b[^>]*hreflang=["']x-default["'][^>]*>/i.test(next)) {
    next = next.replace(/(<link\b[^>]*rel=["']canonical["'][^>]*>)/i, `$1\n  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}" />`);
  }
  if (!/<meta\b[^>]*property=["']og:updated_time["'][^>]*>/i.test(next)) {
    next = next.replace(/<\/head>/i, `  <meta property="og:updated_time" content="${escapeHtml(buildAt)}" />\n</head>`);
  }
  if (!/<meta\b[^>]*name=["']author["'][^>]*>/i.test(next)) {
    next = next.replace(/<\/head>/i, `  <meta name="author" content="${platformName}" />\n</head>`);
  }
  return next;
}

function protectTargetBlankLinks(html) {
  return html.replace(/<a\b([^>]*\btarget=["']_blank["'][^>]*)>/gi, (tag, attrs) => {
    const relMatch = attrs.match(/\brel=["']([^"']*)["']/i);
    if (!relMatch) return `<a${attrs} rel="noopener noreferrer">`;
    const relValues = new Set(relMatch[1].split(/\s+/).filter(Boolean));
    relValues.add('noopener');
    relValues.add('noreferrer');
    return tag.replace(/\brel=["'][^"']*["']/i, `rel="${[...relValues].join(' ')}"`);
  });
}

function containsExcludedSlug(value, excludedSlugs) {
  const text = String(value || '');
  return excludedSlugs.some((slug) => text.includes(slug));
}

function pruneExcludedJson(value, excludedSlugs) {
  if (Array.isArray(value)) {
    return value
      .map((item) => pruneExcludedJson(item, excludedSlugs))
      .filter((item) => item !== null);
  }
  if (value && typeof value === 'object') {
    const looksLikeEventRecord = Boolean(value.id || value.file_slug || value.detail_url || value.calendar_url || value.ics_url || value.url);
    if (looksLikeEventRecord && containsExcludedSlug(JSON.stringify(value), excludedSlugs)) return null;
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      if (/sample-record|needs-source-evidence|needs-organizer-confirmation/.test(key)) continue;
      const pruned = pruneExcludedJson(item, excludedSlugs);
      if (pruned !== null) next[key] = pruned;
    }
    return next;
  }
  return value;
}

function refreshInlineEventsPayload(html, events) {
  return html.replace(
    /const events = \[[\s\S]*?\];\s*const savedEventsKey/,
    `const events = ${scriptValue(events)};\n    const savedEventsKey`
  );
}

function pruneExcludedHtml(html, excludedSlugs) {
  let next = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (match, rawJson) => {
    try {
      return jsonLd(pruneExcludedJson(JSON.parse(rawJson), excludedSlugs));
    } catch {
      return match;
    }
  });
  for (const slug of excludedSlugs) {
    const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const slugPattern = `(?:events\\/${escaped}\\.(?:html|ics)|event-covers\\/${escaped}\\.svg)`;
    next = next
      .replace(new RegExp(`<article\\b[\\s\\S]*?${slugPattern}[\\s\\S]*?<\\/article>`, 'g'), '')
      .replace(new RegExp(`<a\\b[^>]+href=["'][^"']*${slugPattern}["'][\\s\\S]*?<\\/a>`, 'g'), '')
      .replace(new RegExp(`<img\\b[^>]+src=["'][^"']*${slugPattern}["'][^>]*>`, 'g'), '');
  }
  return next;
}

function pruneExcludedPublicArtifacts(events) {
  const excludedSlugs = events.excludedPublicSlugs || [];
  if (!excludedSlugs.length) return 0;
  let changed = 0;
  for (const filePath of walkFiles(distDir)) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.html', '.json'].includes(ext)) continue;
    const before = fs.readFileSync(filePath, 'utf8');
    let after = before;
    if (ext === '.html') {
      after = pruneExcludedHtml(refreshInlineEventsPayload(before, events), excludedSlugs);
    } else {
      try {
        after = `${JSON.stringify(pruneExcludedJson(JSON.parse(before), excludedSlugs), null, 2)}\n`;
      } catch {
        after = before;
      }
    }
    if (after !== before) {
      fs.writeFileSync(filePath, after, 'utf8');
      changed += 1;
    }
  }
  return changed;
}

function decorateBrandHtml(html, filePath) {
  let next = enhanceSeoHead(injectGlobalFeedAlternates(injectPlatformWebSiteJsonLd(injectFallbackJsonLd(normalizeSeoMetaDescription(normalizeBrandText(html)))), filePath), filePath);
  next = next.replace(/<style id="eventlive-brand-pulse">[\s\S]*?<\/style>/g, '');
  next = next.replace(/<script defer data-domain="eventme\.live" src="https:\/\/plausible\.io\/js\/script\.tagged-events\.js"><\/script>/g, '');
  next = next.replace(/<!-- Privacy-friendly analytics by Plausible -->\s*/g, '');
  next = next.replace(/<script async src="https:\/\/plausible\.io\/js\/pa-[^"]+\.js"><\/script>\s*/g, '');
  next = next.replace(/<script>\s*window\.plausible=window\.plausible\|\|function\(\)\{[\s\S]*?plausible\.init\(\)\s*<\/script>\s*/g, '');
  next = next.replace(/<script id="eventlive-analytics-runtime">[\s\S]*?<\/script>/g, '');
  next = next.replace(/<\/head>/i, `  ${brandCss}\n</head>`);
  if (!isOwnerOnlyPage(filePath)) {
    next = next.replace(/<\/head>/i, `  ${analyticsHeadSnippet()}\n</head>`);
    next = next.replace(/<\/body>/i, `${analyticsRuntimeScript()}\n</body>`);
  }
  next = next.replace(/<(b|strong)([^>]*)>EventLive<\/\1>/g, `<$1$2>${brandVisual}</$1>`);
  next = next.replace(/<div class="brand-name">EventLive<\/div>/g, `<div class="brand-name">${brandVisual}</div>`);
  next = next.replace(/<div class="brand">EventLive<\/div>/g, `<div class="brand brand-word-wrap">${brandVisual}</div>`);
  next = next.replace(/<a\b[^>]+href=["']\.\/current-release-bundle\.json["'][\s\S]*?<\/a>/g, '');
  next = protectTargetBlankLinks(next);
  if (!isOwnerOnlyPage(filePath) && !/privacy\.html/.test(next) && /<\/footer>/i.test(next)) {
    next = next.replace(/<\/footer>/i, `<nav class="footer-links" aria-label="روابط الثقة"><a href="./privacy.html">الخصوصية</a><a href="./terms.html">الشروط</a><a href="./source-rights.html">حقوق المصادر</a></nav></footer>`);
  }
  return next;
}

function patchFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.html', '.json', '.webmanifest', '.xml', '.txt', '.md', '.ics', '.svg', '.js', '.css'].includes(ext)) return false;
  const before = fs.readFileSync(filePath, 'utf8');
  const branded = ext === '.html' ? decorateBrandHtml(before, filePath) : normalizeBrandText(before);
  const ownerFiltered = ext === '.html' && !isOwnerOnlyPage(filePath) ? hideOwnerOnlyPublicLinks(branded) : branded;
  const after = ext === '.html' ? stripTrailingWhitespace(ownerFiltered) : ownerFiltered;
  if (after === before) return false;
  fs.writeFileSync(filePath, after, 'utf8');
  return true;
}

function hideOwnerOnlyManifestShortcuts() {
  const manifestPath = path.join(distDir, 'manifest.webmanifest');
  if (!fs.existsSync(manifestPath)) return false;
  const before = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(before);
  } catch {
    return false;
  }
  const ownerOnlyTargets = new Set([
    './sources.html',
    './methodology.html',
    './trust.html',
    './candidates.html',
    './resolver.html',
    './source-health.html',
    './owner-status.html'
  ]);
  if (Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts = manifest.shortcuts.filter((shortcut) => !ownerOnlyTargets.has(shortcut.url));
  }
  const after = `${JSON.stringify(manifest, null, 2)}\n`;
  if (after === before) return false;
  fs.writeFileSync(manifestPath, after, 'utf8');
  return true;
}

function removeForbiddenArtifacts() {
  const forbidden = [
    'archive-browser.html',
    'diff.html',
    'diffs',
    'delivery-package',
    'current-delivery-manifest.json',
    'current-delivery-manifest.md',
    'current-live-site.json',
    'current-release-bundle.json',
    'handoff-notes.md',
    'share-kit.json',
    'share-kit.md',
    'qr-placeholder.txt'
  ];
  for (const relativePath of forbidden) {
    const fullPath = path.join(distDir, relativePath);
    if (fs.existsSync(fullPath)) fs.rmSync(fullPath, { recursive: true, force: true });
  }
  const oldHero = path.join(distDir, 'assets', 'eventme-hero.png');
  if (fs.existsSync(oldHero)) fs.rmSync(oldHero, { force: true });
}

function writeBrandIcon() {
  writeText(path.join(distDir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="EventLive"><rect width="64" height="64" rx="12" fill="#07231c"/><text x="11" y="42" fill="#fff" font-family="Arial,sans-serif" font-size="28" font-weight="700">EL</text><circle cx="51" cy="14" r="5" fill="#e5484d"/></svg>`);
}

const events = buildEvents();
writeCatalogFiles(events);
writeMethodologyPage(events);
writeOrganizerIntakePage();
for (const event of events) renderEventDetail(event);
writeIcs(events);
writeSubscriptionFeeds(events);
writeFacetPages(events);
writeCitiesIndexPage(events);
writeCategoriesIndexPage(events);
writeAudiencePages(events);
writeAudiencesIndexPage(events);
writeTemporalPages(events);
writeLiveOperationalFeeds(events);
await writeActivationUtilityPages(events);
writeAttendancePage();
const homePatched = patchHomePage(events);
const browsePatched = patchEventsBrowsePage(events);
const organizersPatched = patchOrganizersPage();
const categoryFallback = writeLinkedCategoryFallbackPages(events);
writeSourceCoverageGapsPage(events);
writeOwnerStatusPage(events);
writeRegionsCoveragePage(events);
writeReadinessPage(events);
writeCompliancePolicyPages();
writeTrustPage(events);
writePublicSourcesPage(events);
writeLiveUpdatesPage(events);
const screenPatched = patchScreenPage();
reconcileStaleEventRefs(events);
const imageRefsPatched = reconcileStaleEventImages(events);
const missingImageRefsPatched = reconcileMissingLocalEventImages(events);
const excludedReferencePatched = pruneExcludedPublicArtifacts(events);
const searchIntentPages = writeSearchIntentPages(events);
const guidesIntentPatched = patchGuidesHubWithSearchIntentPages(searchIntentPages);
writeBrandIcon();
writeServiceWorker();
removeForbiddenArtifacts();
writeSitemap(events);
writeAiSearchFiles(events);

const patched = walkFiles(distDir).filter(patchFile);
hideOwnerOnlyManifestShortcuts();
const report = [
  `# ${platformName} Build Report`,
  `- Built at: ${buildAt}`,
  '- Mode: data-driven catalog + static brand refresh',
  `- Public domain: ${platformDomain}`,
  `- Events generated: ${events.length}`,
  `- Draft/sample records excluded: ${events.excludedDraftLikeRecords || 0}`,
  `- Event detail pages: ${events.length}`,
  `- Cities generated: ${new Set(events.map((event) => citySlug(event.city))).size}`,
  `- Stale event image references patched: ${imageRefsPatched}`,
  `- Missing local event image references patched: ${missingImageRefsPatched}`,
  `- Categories generated: ${new Set(events.map((event) => event.category_slug)).size}`,
  `- Live-ready events: ${events.filter((event) => event.live_schedule_ready).length}`,
  `- Multi-session agendas: ${events.filter((event) => event.agenda_ready).length}`,
  `- Official sessions: ${events.reduce((sum, event) => sum + Number(event.official_sessions_count || 0), 0)}`,
  `- Ended events: ${events.filter((event) => event.status === 'ended').length}`,
  `- Home page data refreshed: ${homePatched ? 'yes' : 'already current'}`,
  `- Browse page data refreshed: ${browsePatched ? 'yes' : 'already current'}`,
  `- Organizer intake linked: ${organizersPatched ? 'yes' : 'already current'}`,
  `- Screen fallback refreshed: ${screenPatched ? 'yes' : 'already current'}`,
  `- Category links normalized: ${categoryFallback.categoryLinksPatched}`,
  `- Category fallback pages created: ${categoryFallback.fallbackPages}`,
`- Excluded-record references patched: ${excludedReferencePatched}`,
  `- Search intent pages generated: ${searchIntentPages.length}`,
  `- Guides search-intent links patched: ${guidesIntentPatched ? 'yes' : 'already current'}`,
  `- Patched files: ${patched.length}`,
  '- Brand: EventLive',
  '- Live mark: red pulsing i-dot',
  '- Domain preserved: yes'
].join('\n');

fs.writeFileSync(path.join(reportsDir, 'build-report.md'), `${report}\n`, 'utf8');
console.log(report);
