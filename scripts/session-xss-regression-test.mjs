import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const titlePayload = '<img src=x onerror=alert(1)>';
const roomPayload = '<strong>Hall X</strong>';
const fixture = [{
  id: 'session-xss-regression',
  file_slug: 'session-xss-regression',
  title: 'Session XSS regression fixture',
  summary: 'Security regression fixture',
  city_label: 'Riyadh',
  venue: 'Regression venue',
  starts_at: '2026-07-18T18:00:00+03:00',
  ends_at: '2026-07-18T19:00:00+03:00',
  status: 'upcoming',
  event_kind: 'moment',
  detail_url: 'https://eventme.live/events/session-xss-regression.html',
  ics_url: 'https://eventme.live/events/session-xss-regression.ics',
  sessions: [{
    starts_at: '2026-07-18T18:00:00+03:00',
    title: titlePayload,
    room: roomPayload
  }]
}];

const pagePath = path.join(process.cwd(), 'dist', 'print.html');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  const dialogs = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  await page.addInitScript((events) => {
    Object.defineProperty(window, 'EVENTLIVE_EVENTS', {
      configurable: false,
      enumerable: true,
      get: () => events,
      set: () => {}
    });
  }, fixture);

  const url = new URL(pathToFileURL(pagePath));
  url.searchParams.set('event', fixture[0].id);
  await page.goto(url.href);

  const sessions = page.locator('[data-event-sessions]');
  await sessions.locator('tr').waitFor();
  const injectedNodes = await sessions.locator('img, strong').count();
  const renderedText = await sessions.textContent();
  const rowCount = await sessions.locator('tr').count();
  const cellCount = await sessions.locator('tr').first().locator('td').count();

  console.log(
    `SESSION_XSS_EVIDENCE injected_nodes=${injectedNodes} dialogs=${dialogs.length}`
      + ` title_literal=${renderedText.includes(titlePayload)} room_literal=${renderedText.includes(roomPayload)}`
      + ` rows=${rowCount} cells=${cellCount}`
  );

  assert.equal(injectedNodes, 0, 'session title and room must not create HTML elements');
  assert.deepEqual(dialogs, [], 'session content must not execute alert handlers');
  assert.ok(renderedText.includes(titlePayload), 'malicious session title must render as literal text');
  assert.ok(renderedText.includes(roomPayload), 'session room markup must render as literal text');
  assert.equal(rowCount, 1, 'one session must keep one rendered table row');
  assert.equal(cellCount, 3, 'session table rows must keep time, title, and room cells');
} finally {
  await browser.close();
}

console.log('SESSION_XSS_OK');
