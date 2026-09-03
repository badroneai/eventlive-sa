import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = process.cwd();
const generatorPath = path.join(root, 'scripts', 'generate-site.mjs');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eventme-url-xss-'));
const fixtureDataDir = path.join(fixtureRoot, 'data');
const fixtureDistDir = path.join(fixtureRoot, 'dist');
const fixtureImageDir = path.join(fixtureDistDir, 'assets', 'event-images');
const javascriptPayload = 'javascript:alert(1)';
const imagePayload = 'x" onerror=alert(1)';
const reconcileImagePayload = 'assets/event-images/t04-existing.jpg?" onerror=alert(1)';
const fixtureEventId = 't04-url-attribute-xss';
const reconcileEventId = 't04-reconcile-image-xss';
const ticketEventId = 't04-ticket-url-xss';

function eventFixture(overrides = {}) {
  return {
    id: 't04-security-fixture',
    title: 'T0.4 security regression fixture',
    organizer: 'EventMe security regression',
    city: 'Riyadh',
    venue: 'T0.4 regression venue',
    category: 'technology',
    starts_at: '2027-07-18T18:00:00+03:00',
    ends_at: '2027-07-18T20:00:00+03:00',
    updated_at: '2026-07-18T18:00:00+03:00',
    sessions_count: 0,
    source_label: 'T0.4 regression source',
    source_url: 'https://example.com/events/t04-security-fixture',
    evidence_url: 'https://example.com/events/t04-security-fixture',
    source_confidence: 'approved-source',
    approval_status: 'published',
    live_schedule_ready: false,
    ...overrides
  };
}

const catalog = {
  events: [
    eventFixture({
      id: fixtureEventId,
      title: 'T0.4 registration and image fixture',
      city: 'Online',
      venue: 'Online',
      attendance_mode: 'online',
      registration_url: javascriptPayload,
      image_url: imagePayload,
      sessions_count: 1,
      sessions: [{
        title: 'T0.4 session URL fixture',
        starts_at: '2027-07-18T18:30:00+03:00',
        ends_at: '2027-07-18T19:00:00+03:00',
        source_url: javascriptPayload
      }]
    }),
    eventFixture({
      id: reconcileEventId,
      title: 'T0.4 reconciliation fixture',
      source_url: javascriptPayload,
      evidence_url: javascriptPayload,
      directions_url: javascriptPayload,
      image_url: reconcileImagePayload
    }),
    eventFixture({
      id: ticketEventId,
      title: 'T0.4 ticket URL fixture',
      city: 'Online',
      venue: 'Online',
      attendance_mode: 'online',
      source_url: 'https://example.com/events/t04-ticket-url-xss',
      evidence_url: 'https://example.com/events/t04-ticket-url-xss',
      ticket_url: javascriptPayload
    })
  ]
};

let browser;
try {
  fs.cpSync(path.join(root, 'data'), fixtureDataDir, { recursive: true });
  fs.mkdirSync(fixtureImageDir, { recursive: true });
  fs.writeFileSync(path.join(fixtureImageDir, 't04-existing.jpg'), 'security fixture\n', 'utf8');
  fs.writeFileSync(
    path.join(fixtureDataDir, 'events_catalog.json'),
    `${JSON.stringify(catalog, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(fixtureDataDir, 'source_ended_events.json'),
    `${JSON.stringify({ ended_events: [] }, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(fixtureDistDir, 'h2-reconciliation-fixture.html'),
    `<!doctype html><article><a href="./events/${reconcileEventId}.html">fixture</a><img src="./assets/event-images/t04-missing.jpg" alt="fixture"></article>\n`,
    'utf8'
  );

  const build = spawnSync(process.execPath, [generatorPath], {
    cwd: fixtureRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      EVENTLIVE_INCREMENTAL_BUILD: 'false',
      EVENTLIVE_FORCE_SEO_REFRESH: 'true', EVENTLIVE_SEO_STATE_PATH: '.eventlive-cache/seo-state-test.json'
    }
  });
  if (build.status !== 0) {
    console.error(build.stdout || '');
    console.error(build.stderr || '');
    assert.fail(`security fixture build exited with ${build.status ?? 'unknown status'}`);
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const eventPagePath = path.join(fixtureDistDir, 'events', `${fixtureEventId}.html`);
  await page.goto(pathToFileURL(eventPagePath).href);

  const registration = page.locator('.event-quick-actions a').first();
  const registrationHref = await registration.getAttribute('href');
  const cover = page.locator('.event-detail img.cover').first();
  const coverSrc = await cover.getAttribute('src');
  const coverOnerror = await cover.evaluate((node) => node.hasAttribute('onerror'));
  const sessionSourceHref = await page.locator('.session-source').first().getAttribute('href');

  const directionsPage = await browser.newPage();
  await directionsPage.goto(pathToFileURL(path.join(fixtureDistDir, 'events', `${reconcileEventId}.html`)).href);
  const directionsHref = await directionsPage.locator('.event-quick-actions a').first().getAttribute('href');
  const sourceHref = await directionsPage.locator('.readiness .meta a', { hasText: 'المصدر' }).first().getAttribute('href');

  const ticketPage = await browser.newPage();
  await ticketPage.goto(pathToFileURL(path.join(fixtureDistDir, 'events', `${ticketEventId}.html`)).href);
  const ticketHref = await ticketPage.locator('.event-quick-actions a').first().getAttribute('href');

  const h2Page = await browser.newPage();
  const h2PagePath = path.join(fixtureDistDir, 'h2-reconciliation-fixture.html');
  await h2Page.goto(pathToFileURL(h2PagePath).href);
  const reconciledImage = h2Page.locator('article img').first();
  const reconciledSrc = await reconciledImage.getAttribute('src');
  const reconciledOnerror = await reconciledImage.evaluate((node) => node.hasAttribute('onerror'));

  const runtimeFixture = [{
    id: 't04-runtime-url-xss',
    file_slug: 't04-runtime-url-xss',
    title: 'T0.4 runtime URL fixture',
    summary: 'Runtime security fixture',
    city_label: 'Riyadh',
    venue: 'Runtime fixture venue',
    starts_at: '2027-07-18T18:00:00+03:00',
    ends_at: '2027-07-18T20:00:00+03:00',
    status: 'upcoming',
    event_kind: 'moment',
    detail_url: 'https://eventme.live/events/t04-runtime-url-xss.html',
    ics_url: './events/t04-runtime-url-xss.ics',
    source_url: javascriptPayload,
    directions_url: javascriptPayload,
    sessions: []
  }];
  const shareHtml = fs.readFileSync(path.join(fixtureDistDir, 'share.html'), 'utf8');
  const activationRuntime = shareHtml.match(/<script>\s*\(function \(\) \{\s*var events = window\.EVENTLIVE_EVENTS[\s\S]*?<\/script>/)?.[0];
  assert.ok(activationRuntime, 'generated dist must contain the activation runtime');
  const runtimeFixturePath = path.join(fixtureDistDir, 'url-runtime-fixture.html');
  fs.writeFileSync(
    runtimeFixturePath,
    `<!doctype html><a data-event-source-link href="./events.html">source</a><a data-event-directions href="./events.html">directions</a><script>window.EVENTLIVE_EVENTS=${JSON.stringify(runtimeFixture)};</script>${activationRuntime}`,
    'utf8'
  );
  const runtimePage = await browser.newPage();
  const runtimeUrl = new URL(pathToFileURL(runtimeFixturePath));
  runtimeUrl.searchParams.set('event', runtimeFixture[0].id);
  await runtimePage.goto(runtimeUrl.href);
  const runtimeSourceHref = await runtimePage.locator('[data-event-source-link]').first().getAttribute('href');
  const runtimeDirectionsHref = await runtimePage.locator('[data-event-directions]').first().getAttribute('href');

  const generatorSource = fs.readFileSync(generatorPath, 'utf8');
  const protectedSinkFragments = [
    // WO-6: the event detail page's online-entry CTA (formerly a standalone
    // eventDetailActions() branch keyed on event.source_url||evidence_url)
    // was consolidated into eventPrimaryActionHtml()'s single entry-link
    // resolver, which also covers registration/ticket links. The sanitizer
    // coverage is unchanged — every branch still runs through safeHref(),
    // verified below by the live registrationHref/ticketHref/directionsHref/
    // sourceHref assertions — only the literal source fragment moved.
    'escapeHtml(safeHref(event.directions_url))',
    'escapeHtml(safeHref(event.source_url))',
    'escapeHtml(safeHref(event.registration_url || event.ticket_url || event.source_url || event.evidence_url))',
    'escapeHtml(safeHref(event.registration_url || event.ticket_url))',
    'escapeHtml(safeHref(session.source_url))',
    'escapeHtml(safeHref(row.source_url))',
    'escapeHtml(safeHref(row.directions_url))',
    'escapeHtml(safeHref(group.source_url))',
    "sourceHref ? safeHref(sourceHref) : detail",
    "directionsHref ? safeHref(directionsHref) : detail",
    'directions.href = safeHref(event.directions_url)',
    'src="${escapeHtml(event.image_url)}"'
  ];
  const missingProtectedSinks = protectedSinkFragments.filter((fragment) => !generatorSource.includes(fragment));

  console.log(
    `URL_ATTRIBUTE_XSS_EVIDENCE registration_href=${JSON.stringify(registrationHref)}`
      + ` image_onerror=${Number(coverOnerror)} image_src=${JSON.stringify(coverSrc)}`
      + ` reconcile_onerror=${Number(reconciledOnerror)} reconcile_src=${JSON.stringify(reconciledSrc)}`
      + ` session_href=${JSON.stringify(sessionSourceHref)} directions_href=${JSON.stringify(directionsHref)}`
      + ` source_href=${JSON.stringify(sourceHref)} ticket_href=${JSON.stringify(ticketHref)}`
      + ` runtime_source_href=${JSON.stringify(runtimeSourceHref)}`
      + ` runtime_directions_href=${JSON.stringify(runtimeDirectionsHref)}`
      + ` protected_sinks=${protectedSinkFragments.length - missingProtectedSinks.length}/${protectedSinkFragments.length}`
  );

  assert.equal(registrationHref, '#', 'javascript registration_url must be replaced with #');
  assert.equal(coverOnerror, false, 'image_url must remain a single src attribute');
  assert.equal(coverSrc, imagePayload, 'image_url payload must remain inert literal src text');
  assert.equal(sessionSourceHref, '#', 'javascript session.source_url must be replaced with #');
  assert.equal(directionsHref, '#', 'javascript directions_url must be replaced with #');
  assert.equal(sourceHref, '#', 'javascript source_url must be replaced with #');
  assert.equal(ticketHref, '#', 'javascript ticket_url must be replaced with #');
  assert.equal(reconciledOnerror, false, 'reconciled image_url must not create an onerror attribute');
  assert.equal(reconciledSrc, reconcileImagePayload, 'reconciled image_url must remain one inert src value');
  assert.equal(runtimeSourceHref, '#', 'runtime source_url must be replaced with #');
  assert.equal(runtimeDirectionsHref, '#', 'runtime directions_url must be replaced with #');
  assert.deepEqual(missingProtectedSinks, [], 'every fetched-URL href sink and the reconciliation src sink must retain its sanitizer');
} finally {
  if (browser) await browser.close();
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log('URL_ATTRIBUTE_XSS_OK');
