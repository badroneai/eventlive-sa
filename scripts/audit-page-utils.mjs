import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function publicEvents() {
  const eventsPath = path.join(root, 'dist', 'events.json');
  if (!fs.existsSync(eventsPath)) return [];
  const payload = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
  return Array.isArray(payload.events) ? payload.events : [];
}

export function representativeEvent() {
  const events = publicEvents();
  return events.find((event) => event.status !== 'ended'
      && event.live_schedule_ready
      && (event.sessions || []).some((session) => !['attendance-window', 'opening-hours'].includes(session.session_type)))
    || events.find((event) => event.status !== 'ended' && event.live_schedule_ready)
    || events.find((event) => event.status !== 'ended')
    || events[0]
    || null;
}

export function representativeEventPath() {
  const event = representativeEvent();
  if (!event?.detail_url) return '/event.html';
  return `/${String(event.detail_url).replace(/^\.\//, '').replace(/^\//, '')}`;
}

export function representativeEventId() {
  return representativeEvent()?.id || '';
}
