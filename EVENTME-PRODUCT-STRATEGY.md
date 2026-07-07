# EventLive Product Strategy

## Executive Position
EventLive should not compete first as a ticketing marketplace. Its first durable wedge is becoming the trusted live agenda layer for Saudi and Arabic events: what is happening now, what is next, where to go, what to save, and what changed.

Canonical public domain: `https://eventme.live/`

## Live-First Thesis
EventLive's highest-value moment is not browsing days before the event. It is the live attendance moment: the visitor is on the way, entering the venue, moving between halls, or deciding which session to catch next. The product should optimize for that pressure: fast answers, clear countdowns, direct navigation, gate/check-in guidance, and trustworthy changes.

## Current Product Truth
- The repository already has a reliable static publishing pipeline: normalize, validate, preview, diff, approve, publish, archive, and handoff.
- The operator console is a strong internal foundation for organizer workflows.
- The visitor page was the weakest layer: it presented a schedule, but did not yet feel like a live event companion.
- The current MVP upgrade adds the first visitor-facing platform primitives: EventLive branding, live/current/next state, rich filtering, saved sessions, calendar export, share page, print page, and a visual event asset.
- The live-first upgrade adds the attendance command center: countdown to start, event progress, directions, map link, gate/check-in/parking notes, and operational updates.
- The timeline upgrade, inspired by a real single-event Movenpick timeline prototype, adds the product behavior EventLive needs at scale: live clock, automatic day focus, a jump-to-current action, current/next/ended visual states, and expandable session status details.
- The discovery upgrade changes the root experience from a single event page into a platform destination: searchable event cards, city/status filters, live status computation, event metadata in `events.json`, and a dedicated `event.html` live schedule page.
- The reliability upgrade adds event-day resilience: PWA manifest, service worker cache, offline reload for core pages, link copy, native share, and WhatsApp handoff.
- The trust upgrade makes operational changes visible and attributable: source label, approval status, publisher, verified live updates, session-linked badges, and update details inside affected session cards.
- The venue activation upgrade makes EventLive usable on the event floor: generated QR codes, a display/print-ready `signage.html`, and direct entry from signage to the live schedule on `eventme.live`.
- The catalog upgrade moves EventLive from a single generated event toward a real destination: `events.json` can merge the current live schedule with additional Saudi event records while marking which schedules are actually ready.
- The catalog quality gate protects discovery trust: catalog records now have a schema and validation checks for identity, timing, readiness, source confidence, and duplicate IDs before public output is generated.
- The organizer intake upgrade adds the first supply-side motion: non-ready catalog records and navigation can route organizers to a structured request path instead of leaving discovery as a dead end.
- The event detail page upgrade gives every catalog record a standalone destination with readiness, source trust, directions, and the correct next action.
- The public discovery metadata upgrade makes EventLive easier to index and share: canonical URLs, Open Graph/Twitter metadata, sitemap, robots, and Event JSON-LD for detail surfaces.
- The calendar distribution upgrade turns every catalog record into a practical handoff: a platform-wide `events.ics` feed and per-event calendar files that visitors can save before heading to the venue.
- The event-detail live card upgrade makes every event page useful at attendance time: countdown before start, live/ended state, progress through the event window, and context-aware guidance.
- The platform live status upgrade creates a single operational truth file and homepage center for what is live, next, ready, and still needs activation.
- The SEO discovery upgrade turns the catalog into focused city and category destinations, improving entry points such as Riyadh events, Jeddah events, and entrepreneurship events.
- The saved-events register upgrade gives visitors a lightweight personal record: save events locally, return from the homepage, and export the saved set to a calendar.
- The My Events page upgrade turns the personal record into a standalone surface that can later evolve into accounts, attendance history, reminders, and certificates.
- The Now attendance mode upgrade turns the saved record and platform status into one urgent surface: closest saved/live/upcoming event, countdown, live link, calendar, and directions for visitors on the way or onsite.
- The Today priority feed upgrade makes the same now logic machine-readable through `today.json`, so future apps, venue screens, and monitors can use the live priority without scraping the page.
- The venue screen upgrade turns the now priority feed into `screen.html`: a large-format display for entrances, registration desks, and halls with QR handoff back to the visitor's phone.
- The live updates center upgrade turns verified changes into a destination: `updates.html` and `updates.json` surface arrival guidance, room changes, delay notices, reminders, and session-linked updates without forcing the visitor to scan the full schedule.
- The urgent live-alert upgrade pushes the highest-priority update into `today.json`, `today.html`, and `screen.html`, so the visitor sees the change before browsing the schedule.
- The homepage live-alert upgrade makes the public landing page behave like a live destination: urgent changes appear before catalog browsing, and event cards show when a schedule has live updates.
- The activation queue upgrade turns non-ready catalog records into `activation.html` and `activation.json`: a prioritized list of schedule activation candidates, blockers, and organizer request links.
- The trust center upgrade turns source quality into a visible product surface: `trust.html` and `trust.json` show confidence, approval, freshness, readiness, trust score, and evidence gaps for every catalog event.
- The operational readiness upgrade turns live status, trust, and activation into one operating board: `readiness.html` and `readiness.json` classify each event as visitor-ready, activation-ready, or blocked by source, approval, or program gaps.
- The source acquisition upgrade creates the first semi-automation control surface: `sources.html` and `sources.json` define the needed source, automation policy, and approval gate before any event can become a public live schedule.
- The event-detail update upgrade makes direct event URLs safer for attendance time: verified changes linked to the event now appear on the event page itself, not only in the central updates feed.
- The source candidate intake upgrade creates the pre-publication buffer needed before real source research: discovered events go to `candidates.html` and `candidates.json` first, with evidence, duplicate risk, extraction state, review gate, and next action before they can enter the public catalog.
- The source registry upgrade defines the first acquisition map: official national calendars, government calendars, marketplaces, destination calendars, venue calendars, and aggregators are ranked with trust level, fetch method, intake policy, and evidence requirements before collection starts.

## Market Benchmarks
- Saudi discovery and booking platforms such as webook.com, Hala Yalla, Enjoy Saudi, and GEA-backed calendars focus mainly on discovery, ticketing, broad event listings, and national entertainment visibility.
- International event platforms such as Whova, Cvent Attendee Hub, EventMobi, and Sched converge around interactive agendas, personal schedules, real-time updates, attendee engagement, maps, notifications, speakers, exhibitors, feedback, and organizer analytics.
- The open opportunity is a Saudi-first live agenda truth layer that can plug into organizers, venues, and discovery sources without needing to own ticketing on day one.

## Product Principles
- Live truth beats static listings: the visitor should quickly know the active session, the next session, and any changed room or time.
- Platform truth should be machine-readable: the homepage, venue screens, and future app surfaces should share one live status feed.
- Now truth should be machine-readable too: the visitor's urgent next action deserves a compact priority feed, separate from the broader catalog status.
- Urgent changes should interrupt the right surface: if a room or time changes, it must appear in the now page and venue screen, not only in a separate updates center.
- The homepage is also a live surface: visitors who start from `eventme.live` should see the current critical update before search and filters.
- Personal agenda is mandatory: saving sessions and exporting a calendar are table stakes.
- Personal event history starts locally: saving full events should work anonymously before accounts, check-ins, or attendance certificates exist.
- Personal records deserve their own destination: saved events should be reachable without scanning the full discovery homepage.
- The live moment deserves its own destination: users in motion should open `today.html` and immediately get the next action, not a broad catalog.
- Changes deserve their own destination: event-day updates should be readable as one prioritized feed and still point back to the affected event or session.
- Direct event links must carry the live truth: a visitor who opens a shared event detail page should see the relevant verified changes without having to discover the updates center first.
- Trust must be visible: every schedule should expose source, update time, approval status, and organizer contact.
- Trust must be operational: weak records should become a visible work queue with evidence gaps, not silent catalog entries.
- Readiness should drive execution: the team should always know the next best event to activate and the exact blocker preventing live value.
- Source acquisition must preserve evidence: every automated or manual intake needs a source record before extraction and publication.
- Discovery is not publication: researched events must enter a candidate queue before they become catalog records.
- Duplicate review is mandatory: the platform should assume the same Saudi event may appear across official sites, ticketing pages, calendars, and social posts.
- Source priority must be explicit: official national and government sources lead, marketplaces and venue calendars create candidates, and aggregators only discover leads.
- Discovery must not overclaim: events without approved live schedules should be listed as catalog records with clear readiness labels, not routed to the wrong schedule.
- Discovery should match how people search: city and category routes are first-class surfaces, not just filters inside one page.
- Changes must travel with the affected session: a room change or timing note should appear in the update feed, the live timeline, and the session card itself.
- Mobile first, venue friendly: the interface must work in crowded halls, low attention, and quick one-handed use.
- Venue screens are part of the product: organizers should be able to put EventLive on a display without needing a separate deck, TV app, or manual status board.
- QR first at the venue: the live schedule should be reachable from entrance signage, registration desks, hall screens, and shared organizer messages.
- Timeline first during the event: the page should answer where the visitor is in time before it asks them to browse or filter.
- Offline tolerant by default: crowded venues and weak cellular coverage should not make the schedule disappear after the first successful load.
- Organizer operations are part of the product: intake quality, validation, review, approval, and release evidence should remain first-class.
- Every non-ready event should have a next action: collect the source, validate it, and turn it into a live schedule.
- Supply gaps should be operational, not invisible: every non-ready catalog item should appear in an activation queue with blockers and a request path.
- Every event should be independently shareable: catalog cards should lead to a durable detail page even before the live schedule is ready.
- Every event detail page should answer the attendance-time question immediately: how long until it starts, whether it is live now, and what action to take next.
- Public URLs are product surfaces: every important page should carry canonical metadata and produce a clean crawler path.
- Calendar files are attendance surfaces: every event should be easy to save from discovery or detail pages, even before a full live schedule is activated.
- Automation must be gated: auto-collected events should pass through source evidence, normalization, validation, and approval before public publishing.
- Catalog growth must stay honest: readiness flags and validation gates are product controls, not just engineering details.

## MVP Definition
- Public event page with current/next/live state.
- Public discovery homepage and event index with search, city filter, status filter, and live schedule links.
- Generated city and category discovery pages with focused event cards, metadata, and sitemap coverage.
- Local saved-events register with event-level save/remove actions and calendar export.
- Standalone My Events page with upcoming/ended grouping, saved-event actions, and calendar export.
- Now attendance mode page with saved-first priority, platform fallback, countdown, live action, calendar, and directions.
- `today.json` priority feed with focus event, queue, signals, storage key, and action URLs.
- Live updates center and `updates.json` feed for urgent changes, arrival notices, room changes, reminders, source labels, and session links.
- Urgent live-update alert embedded in `today.json`, the now attendance page, and the venue screen.
- Homepage live-alert block and event-card update notes for schedules with current live changes.
- Venue screen page with automatic refresh, large-format focus state, queue, clock, and QR handoff to `today.html`.
- Activation queue page and feed for non-ready catalog events with priority, blockers, and mail-ready request links.
- Public trust center and `trust.json` source evidence feed for confidence, approval, freshness, readiness, and missing evidence.
- Operational readiness board and `readiness.json` feed combining live, trust, activation, blockers, and next actions.
- Source acquisition page and `sources.json` feed for required evidence, automation policy, approval gates, and organizer/source request links.
- Source candidate intake page and `candidates.json` feed for discovered leads, source evidence, duplicate risk, extraction status, review gates, and next action.
- Source registry data contract with ranked acquisition sources, source trust, fetch method, intake policy, and evidence requirement.
- Platform live status center and `live-status.json` feed for live, next, and needs-activation priorities.
- Optional multi-event catalog source with city, category, status, readiness, and source-confidence metadata.
- Generated event detail pages for each catalog record with trust metadata and ready/not-ready actions.
- Live timing cards on event detail pages with countdown, status, event-window progress, and context-aware guidance.
- Event-specific live-update blocks on event detail pages when verified updates exist for that event.
- Sitemap, robots, canonical, social preview metadata, and structured event data for discovery and sharing.
- Static organizer intake page with structured email handoff as the first step toward a future organizer portal.
- Platform-level and per-event calendar files linked from discovery and event detail pages.
- Live attendance command center with countdown, directions, arrival instructions, and operational updates.
- Live timeline with automatic day selection, current/next jump, active state markers, remaining-time chips, and expandable session details.
- Session-linked live updates with update type, effective time, source, verifier, timeline badge, and session-detail evidence.
- Offline-ready PWA shell with cached discovery, event, share, print, event data, manifest, icon, and hero asset.
- Venue-ready QR package with `signage.html`, live schedule QR, share QR, and PWA cache coverage.
- Fast handoff actions: copy link, native share, WhatsApp, print, event calendar files, and saved-agenda calendar export.
- Search by session, speaker, room, track, and tags.
- Filters by day, track, room, and session type.
- Saved agenda stored locally on the visitor device.
- Calendar export for saved sessions.
- Share and print pages.
- Build report that records source, sessions, tracks, rooms, minutes, and generated visitor features.

## Next Product Slices
1. Multi-event discovery index
   - Promote the generated `events.json` contract into a source-backed multi-event input.
   - Add categories, organizer profiles, cities, venue metadata, and source confidence.
   - Generate one live schedule page per event instead of a single `event.html`.

2. Source acquisition and trust workflow
   - Add source records for official website, organizer file, PDF, social post, manual entry, or partner feed.
   - Store evidence URL/file, fetched time, parser confidence, and human approval.
   - Keep scraped or imported content out of public output until validation passes.
   - Route newly discovered events through the source candidate queue before copying them into the public catalog.
   - Drive collectors from the source registry so every event lead carries its source policy.

3. Live update channel
   - Promote `updates.json` into a source-backed feed that can ingest organizer changes without a full rebuild.
   - Add a lightweight `data/live-updates.json` layer for delays, room changes, cancellations, and notes.
   - Later, support polling, push notifications, or server-sent events without changing the static fallback.

4. Organizer portal evolution
   - Convert the operator console from internal workflow into a tenant-aware organizer workspace.
   - Add role separation: owner, editor, reviewer, publisher.
   - Add release audit history and exportable approval evidence.

5. Attendee account layer
   - Preserve anonymous saved sessions locally first.
   - Later add optional accounts for cross-device agenda, attendance history, check-ins, and certificates.

6. Venue intelligence
   - Add room coordinates, floor labels, accessibility notes, and wayfinding links.
   - Later add venue maps and congestion-aware recommendations.

## Automation Boundary
EventLive can become semi-automatic, but the public layer should never publish untrusted event data directly. The safe path is:

`discover -> fetch/import -> preserve source -> extract -> normalize -> validate -> review -> approve -> publish -> monitor changes`

Each automated source needs:
- source type and ownership
- permission or public-availability note
- raw evidence snapshot
- extraction confidence
- required human approval level
- retry and takedown policy

## Competitive Wedge
EventLive should win by being the most useful page during the actual event:
- faster than a PDF
- clearer than a marketplace listing
- lighter than a full enterprise event app
- trustworthy enough for organizers
- simple enough for visitors to open from a QR code
