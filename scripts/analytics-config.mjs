// Single source of truth for which analytics provider this site actually uses.
//
// It was split across three places that drifted apart:
//   * analyticsHeadSnippet() in generate-site.mjs hardcoded the Umami tag;
//   * owner-command-center.mjs defaulted to 'umami' when it wrote
//     reports/analytics-status.json;
//   * generate-site.mjs rendered owner-status.html from the COMMITTED copy of
//     that report, which still said 'plausible' and pointed at
//     https://plausible.io/eventme.live.
//
// Plausible was dropped on 2026-08-06 when its trial ended. The committed report
// predates the switch (2026-07-10) and nothing ever replaced it: the sync
// workflow regenerates it inside ci:publish-quality-gates, which runs AFTER the
// build that reads it, and does not persist the result. So the build read a
// July snapshot on every run, forever, and the owner page told its own owner to
// open a dashboard that returns 404 while tracking was working fine on Umami all
// along — GATES-GOVERNANCE.md §7, "a report committed in git is not current
// state", written down in this repo and then violated by it.
//
// Config belongs in code, not in a build artifact. The report is now downstream
// of this module instead of being its input.

export const ANALYTICS = {
  provider: process.env.EVENTLIVE_ANALYTICS_PROVIDER || 'umami',
  domain: process.env.EVENTLIVE_ANALYTICS_DOMAIN || 'eventme.live',
  scriptUrl: process.env.EVENTLIVE_ANALYTICS_SCRIPT_URL || 'https://umami-ten-orpin.vercel.app/script.js',
  websiteId: process.env.EVENTLIVE_ANALYTICS_WEBSITE_ID || 'f68b920a-155f-4134-a7b1-88bbede979df',
  dashboardUrl: process.env.EVENTLIVE_ANALYTICS_DASHBOARD_URL || 'https://umami-ten-orpin.vercel.app',
  get dashboardLoginUrl() {
    return process.env.EVENTLIVE_ANALYTICS_DASHBOARD_LOGIN_URL || `${this.dashboardUrl}/login`;
  },
  confirmed: process.env.EVENTLIVE_ANALYTICS_CONFIRMED === 'true'
};

/**
 * Every event name the site is capable of emitting. `page_view`, `search_used`
 * and `saved_event` are fired by name; the rest are dispatched by the delegated
 * click handler in analyticsRuntimeScript(), which infers the name from the
 * link being clicked. Both paths count — a name here that no path can produce is
 * what test:analytics now rejects.
 */
export const TRACKED_EVENTS = [
  'page_view',
  'search_used',
  'saved_event',
  'event_opened',
  'city_filter_used',
  'category_filter_used',
  'audience_filter_used',
  'calendar_downloaded',
  'directions_clicked',
  'source_clicked',
  'live_screen_opened',
  'share_clicked',
  'organizer_cta_clicked',
  'this_week_opened',
  'today_opened',
  'attendance_mode_saved',
  'attendance_mode_removed'
];

export function analyticsDashboardStatus() {
  return ANALYTICS.confirmed ? 'ACTIVE' : 'NEEDS_OWNER_LOGIN';
}
