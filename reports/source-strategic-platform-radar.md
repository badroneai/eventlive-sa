# Strategic Platform Source Radar

Generated at: 2026-10-28T08:42:31.739Z

Policy: evidence refresh, API-surface mapping, and source strategy only. This radar does not auto-publish catalog events.

## Summary

| Platform | Role | Reachability | HTTP | Decision | Title |
| --- | --- | --- | --- | --- | --- |
| SCEGA ePortal | Regulatory-market analyst for exhibitions and conferences | reachable | 200 | official-monitor | الهيئه العامه للمعارض و المؤتمرات |
| National Events Center | Partnership and national-calendar access lead | protected | 200 | partnership-api | المركز الوطني للفعاليات |
| Visit Saudi Calendar | Production source operator | reachable | 200 | active-collector | تقويم السعودية \| تابع العطلات والفعاليات المميزة - الموقع الرسمي للسياحة السعودية |
| webook Explore | Ticketing-marketplace intelligence analyst | protected | 200 | candidate-discovery | - |
| Enjoy Saudi | Entertainment public-interface reviewer | protected | 403 | official-evidence-protected | تعذر الوصول إلى الصفحة \| Access Unavailable |
| General Entertainment Authority Events | Authority-of-record verifier | protected | 403 | official-evidence-protected | تعذر الوصول إلى الصفحة \| Access Unavailable |
| Evento | Commercial app/API surface auditor | reachable | 200 | candidate-discovery | Evento \| إيفينتو |
| Ministry of Commerce Upcoming Events | Government freshness and yield auditor | fetch-error | 0 | low-yield-official-monitor | - |

## Platform Details

### SCEGA ePortal

- Role lens: Regulatory-market analyst for exhibitions and conferences
- Decision: official-monitor
- Classification: reachable (200, fetch)
- Project use: Track as a high-value official source for exhibitions and conferences; do not auto-publish until event-detail extraction is verified.
- Title: الهيئه العامه للمعارض و المؤتمرات
- Hint URLs: https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3MZRtWPQCuHme67tEYUIx3Kh0PHR9N6YNe7PKzeflA.woff2, https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3MZRtWPQCuHme67tEYUIx3Kh0PHR9N6YNe7PqzeflA.woff2, https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3MZRtWPQCuHme67tEYUIx3Kh0PHR9N6YNe7PmzeflA.woff2, https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3MZRtWPQCuHme67tEYUIx3Kh0PHR9N6YNe7PezeQ.woff2, https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPy_eCRXMR5Kw.woff2, https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPy_eCZXMR5Kw.woff2, https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPy_eCaXMR5Kw.woff2, https://fonts.gstatic.com/s/ibmplexsansarabic/v15/Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPy_eCUXMQ.woff2
  - Asset 200 main-ZP4O5XKW.js: http://www.w3.org/2000/svg, https://eservices.scega.gov.sa/login, https://raqmi.dga.gov.sa/platforms/DigitalStamp/ShowCertificate/672, http://https://sdaia.gov.sa/ar/default.aspx, https://eportal.scega.gov.sa/h-events-list
  - Asset 200 chunk-4G4A4TT5.js: no URL hints
  - Asset 200 chunk-FOF4BJ54.js: no URL hints
  - Asset 200 chunk-L5L4U5HC.js: no URL hints
  - Asset 200 chunk-I3NA5QEP.js: http://www.w3.org/2000/svg
  - Asset 200 chunk-RUT2MLWP.js: no URL hints

### National Events Center

- Role lens: Partnership and national-calendar access lead
- Decision: partnership-api
- Classification: protected (200, fetch)
- Project use: Keep as the top strategic feed target; public site is evidence, while national-calendar export/API access is the real integration ask.
- Title: المركز الوطني للفعاليات
- Hint URLs: https://nec.gov.sa/ar, https://nec.gov.sa/en, https://nec.gov.sa/media/2e5a88cf-8d48-43e2-9178-41c9e9ed8d4b/about-introduction.webp, http://www.w3.org/2000/svg, https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/e73fd7d3-e812-477b-8112-ad3f00d16fd9/1, https://www.hrsd.gov.sa/knowledge-centre/decisions-and-regulations/regulation-and-procedures/0211202310#, https://eparticipation.my.gov.sa/, https://ncar.gov.sa/

### Visit Saudi Calendar

- Role lens: Production source operator
- Decision: active-collector
- Classification: reachable (200, fetch)
- Project use: Keep in the 6-hour source ring; Arabic and English API payloads are reachable and useful for tourism-facing event discovery.
- Title: تقويم السعودية | تابع العطلات والفعاليات المميزة - الموقع الرسمي للسياحة السعودية
- Hint URLs: https://www.googletagmanager.com, https://cdn.consentmanager.net, https://delivery.consentmanager.net, https://www.googletagmanager.com/gtm.js?id=, https://www.clarity.ms/tag/, https://www.visitsaudi.com/images/SoundStorm-1.2e16d0ba.fill-1200x630.jpg, https://www.visitsaudi.com/ar/saudi-calendar, https://www.visitsaudi.com/ar
  - API 200 https://www.visitsaudi.com/bin/api/v3/events?locale=ar: 23 items; معرض اللغة العربية 28, تجربة شاطئ قالو, «استمرارية 26» برنامج الفنانين الناشئين في فنون الوسائط الجديدة بمركز الدرعية لفنون المستقبل, الأخطبوطية كيدز, مزاد نادي الصقور السعودي
  - API 200 https://www.visitsaudi.com/bin/api/v3/events?locale=en: 23 items; Arabic Language Exhibition 28, GALU Beach Experience, Continuum '26 Diriyah Art Futures Emerging New Media Artists Programme, Okhtabotiya Kids, Saudi Falcons Club Auction

### webook Explore

- Role lens: Ticketing-marketplace intelligence analyst
- Decision: candidate-discovery
- Classification: protected (200, fetch)
- Project use: Use for lead discovery, ticket-link corroboration, and duplicate checks; require official organizer or authority confirmation before promotion.
- Title: -
- Hint URLs: https://wbk-assets.webook.com, https://api.webook.com, https://webook.cmscloud.ai, https://geolocation.webook.com, https://images.cmscloud.ai, https://apps.apple.com/sa/app/webook-com-fun-things-to-do/id6468667896, https://play.google.com/store/apps/details?id=com.webook.android, https://wbk-assets.webook.com/8.1/assets/index-f2yR6I87.js

### Enjoy Saudi

- Role lens: Entertainment public-interface reviewer
- Decision: official-evidence-protected
- Classification: protected (403, fetch)
- Project use: Treat as official GEA-facing evidence and partnership target; terminal fetch may be protected, so scheduled failures are not catalog failures.
- Title: تعذر الوصول إلى الصفحة | Access Unavailable
- Hint URLs: https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/style.css, https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/data-rate-005-429.png, https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/shield-exclamation.svg, https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092

### General Entertainment Authority Events

- Role lens: Authority-of-record verifier
- Decision: official-evidence-protected
- Classification: protected (403, fetch)
- Project use: Use as authority confirmation for entertainment windows and venue pages; keep separate from Enjoy and ticketing marketplaces.
- Title: تعذر الوصول إلى الصفحة | Access Unavailable
- Hint URLs: https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/style.css, https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/data-rate-005-429.png, https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/shield-exclamation.svg

### Evento

- Role lens: Commercial app/API surface auditor
- Decision: candidate-discovery
- Classification: reachable (200, fetch)
- Project use: Use only as commercial marketplace intelligence until documented API permission exists; exposed app API hints are evidence, not a scraping license.
- Title: Evento | إيفينتو
- Hint URLs: https://api-dev.evento.sa, https://wsrv.nl/?, https://wsrv.nl, https://fonts.googleapis.com, https://fonts.gstatic.com, https://fonts.gstatic.com/s/tajawal/v12/Iura6YBj_oCad4k1nzSBC45I.woff2, https://fonts.gstatic.com/s/tajawal/v12/Iura6YBj_oCad4k1nzGBCw.woff2, https://fonts.gstatic.com/s/tajawal/v12/Iurf6YBj_oCad4k1l8KiHrRpiYlJ.woff2
  - Asset 200 main.b3bd54d7c5600ae4.js: https://evento.sa, https://evento.sa/assets/images/og-image.webp, https://schema.org, https://schema.org/EventScheduled, https://schema.org/OfflineEventAttendanceMode, https://schema.org/InStock

### Ministry of Commerce Upcoming Events

- Role lens: Government freshness and yield auditor
- Decision: low-yield-official-monitor
- Classification: fetch-error (0, curl)
- Project use: Monitor as official evidence with low priority; page structure is SharePoint-style and may be stale or empty for upcoming events.
- Title: -
- Hint URLs: -
