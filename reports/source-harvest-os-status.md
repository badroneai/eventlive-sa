# EventLive Harvest OS Status

- Generated at: 2026-08-23T02:41:15.656Z
- Status: NEEDS_WORK
- Operating rule: Probe before new sources; sample before full harvest; Raw collection is not publication; discovery-only never auto-publishes.

## Totals

- Sources: 88
- Candidates: 602
- Matched candidates: 574
- Auto-publish sources: 15
- Candidate-only sources: 12
- Partnership-required sources: 5
- Productive sources / attempted: 20/37
- Collector errors: 7 (chronic 7, transient 0)

## Publication Funnel

| Stage | Count |
| --- | --- |
| discovered_this_run | 305 |
| candidate_queue | 602 |
| evaluated_for_publish | 602 |
| linked_existing | 555 |
| published_new | 11 |
| blocked | 36 |
| secondary_promoted | 0 |
| secondary_still_blocked | 38 |

## Blocked Reasons

| Reason | Count |
| --- | --- |
| publication gate source-evidence is not auto-publishable | 10 |
| unknown category requires review | 10 |
| possible duplicate requires review: exact-title-city-source-conflict | 6 |
| linked catalog row event-aseer-season was superseded by dedupe | 2 |
| possible duplicate requires review: exact-title-city-venue-conflict | 2 |
| linked catalog row event-dakah was superseded by dedupe | 1 |
| possible duplicate already exists: event-hvac-r-saudi-arabia | 1 |
| possible duplicate already exists: event-saudi-industrial-series-2 | 1 |
| linked catalog row event-stand-up-comedy-and-interactive-show-with-salah-al-dali was superseded by dedupe | 1 |
| linked catalog row event-feena-nehke-stand-up-comedy-by-john-achkar was superseded by dedupe | 1 |
| linked catalog row event-music-festival-mdlbeast-soundstorm was superseded by dedupe | 1 |

## Collector Errors

| Source | Kind | Failed runs in a row | Attempted this run | Reason |
| --- | --- | --- | --- | --- |
| moc-cultural-calendar | chronic | 31 | yes | collector-error: fetch failed; fetch failed |
| mos-events | chronic | 31 | yes | collector-error: fetch failed |
| moc-cultural-subportals | chronic | 31 | yes | collector-error: fetch failed; fetch failed |
| monshaat-events | chronic | 14 | yes | collector-error: fetch failed; fetch failed |
| saudi-pro-league-fixtures | chronic | 11 | yes | collector-error: fetch failed |
| tuwaiq-academy-bootcamps | chronic | 8 | yes | collector-error: HTTP 403 |
| saudi-space-agency-events | chronic | 3 | yes | collector-error: fetch failed |

| Source | Policy | Trust | Gate |
| --- | --- | --- | --- |
| National Events Center / Saudi Events | partnership_required | official | human-review |
| Visit Saudi Calendar | auto_publish | official | human-review |
| Ministry of Culture Cultural Calendar | auto_publish | official | human-review |
| Ministry of Sport Events | auto_publish | official | human-review |
| webook Explore | candidate_only | official-marketplace | duplicate-review |
| Hala Yalla | candidate_only | official-marketplace | duplicate-review |
| Experience AlUla Events | auto_publish | official | human-review |
| MDLBEAST Events | auto_publish | official | human-review |
| Monsha'at All Events | auto_publish | official | human-review |
| Invest Saudi Events | auto_publish | official | human-review |
| RFECC What's On | manual_review | venue-official | duplicate-review |
| Eye of Riyadh Events | candidate_only | aggregator | duplicate-review |
| 10times Saudi Arabia | candidate_only | aggregator | duplicate-review |
| Eventbrite Saudi Arabia | candidate_only | community | source-evidence |
| Platinumlist Jeddah Calendar | candidate_only | official-marketplace | duplicate-review |
| Tuwaiq Academy Bootcamps and Programs | auto_publish | official | human-review |
| Future Skills MCIT Catalogue | auto_publish | official | human-review |
| Riyadh Season Official | manual_review | official | extraction |
| Visit Saudi Seasons | manual_review | official | extraction |
| CODE MCIT Programs | auto_publish | official | human-review |
| Misk Hub Programs | manual_review | official | source-evidence |
| Dhahran Expo Calendar | manual_review | venue-official | duplicate-review |
| Ithra Events | auto_publish | venue-official | human-review |
| Saudi Digital Academy | manual_review | official | extraction |
| SDAIA Academy Programs | manual_review | official | extraction |
| Saudi Events App | partnership_required | official | extraction |
| Enjoy Saudi Events | auto_publish | official | human-review |
| Misk Hub Events | manual_review | official | extraction |
| Jeddah Chamber Exhibitions and Events Center | manual_review | venue-official | duplicate-review |
| Saudi Pro League Fixtures | manual_review | official | extraction |
| NEOM Newsroom Events | manual_review | official | source-evidence |
| Saudi Space Agency Events | manual_review | official | extraction |
| CST Events and News | manual_review | official | source-evidence |
| Visit Saudi Summer Calendar PDF | manual_review | official | duplicate-review |
| Qiddiya Events | manual_review | official | source-evidence |
| Sela and Saudi Entertainment Expo | manual_review | partner | source-evidence |
| Ministry of Culture Commission Calendars | manual_review | official | extraction |
| Visit AlBalad / Historic Jeddah | manual_review | official | extraction |
| Discover Aseer Events | auto_publish | official | human-review |
| Diriyah Season | manual_review | official | source-evidence |
| Riyadh International Convention and Exhibition Center | manual_review | venue-official | duplicate-review |
| Aseer Season / Asir Development Authority | manual_review | official | source-evidence |
| Jeddah Season | manual_review | official | source-evidence |
| Saudi Water Authority Events | manual_review | official | extraction |
| Saudi Universities and Technical Colleges | manual_review | official | source-evidence |
| ExpoFP and Eventseye Saudi Trade Shows | candidate_only | aggregator | duplicate-review |
| Meetup and Facebook Events Saudi Arabia | candidate_only | community | source-evidence |
| Saudi Food and Drug Authority Events | manual_review | official | extraction |
| Saudi Contractors Authority Events | manual_review | official | extraction |
| Saudi Winter Events Calendar | manual_review | official | source-evidence |
| Riyadh City Events | manual_review | official | extraction |
| Monsha'at Academy Programs | partnership_required | official | extraction |
| General Entertainment Authority Events | manual_review | official | source-evidence |
| SDAIA Calendar and Events | manual_review | official | extraction |
| Makkah Chamber Events | manual_review | official | duplicate-review |
| SCEGA ePortal Events | manual_review | official | extraction |
| Ministry of Commerce Upcoming Events | manual_review | official | source-evidence |
| Evento | candidate_only | official-marketplace | duplicate-review |
| Asharqia Chamber Events | manual_review | official | duplicate-review |
| Qassim Chamber Events | manual_review | official | duplicate-review |
| Abha Chamber Events | manual_review | official | duplicate-review |
| Baha Municipality Events | manual_review | official | extraction |
| Baha Chamber Events | manual_review | official | source-evidence |
| Jouf Chamber Events | manual_review | official | extraction |
| Northern Borders Chamber Events | manual_review | official | extraction |
| Tabuk Chamber Events | manual_review | official | extraction |
| Jazan Chamber Events | manual_review | official | duplicate-review |
| Hail Chamber Events | manual_review | official | source-evidence |
| Najran Chamber Events | manual_review | official | source-evidence |
| Platinumlist Riyadh Calendar | candidate_only | official-marketplace | duplicate-review |
| Najran Municipality Summer Events | manual_review | official | duplicate-review |
| Platinumlist Saudi City Network | candidate_only | official-marketplace | source-evidence |
| GOV.SA National Platform Events | partnership_required | official | source-evidence |
| Middle East Banking AI & Analytics Summit Official | auto_publish | official | human-review |
| Middle East Enterprise AI & Analytics Summit Official | auto_publish | official | human-review |
| Umm Al-Qura University Events Center | manual_review | official | duplicate-review |
| LEAP Official Event and Agendas | manual_review | official | extraction |
| FII 10th Edition Official Program | manual_review | official | extraction |
| Cityscape Global Official Program | partnership_required | official | source-evidence |
| Qassim University Events | manual_review | official | duplicate-review |
