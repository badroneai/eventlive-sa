# Strategic Platform Source Radar

Generated at: 2026-08-11T19:30:51.677Z

Policy: evidence refresh, API-surface mapping, and source strategy only. This radar does not auto-publish catalog events.

## Summary

| Platform | Role | Reachability | HTTP | Decision | Title |
| --- | --- | --- | --- | --- | --- |
| SCEGA ePortal | Regulatory-market analyst for exhibitions and conferences | reachable | 200 | official-monitor | الهيئه العامه للمعارض و المؤتمرات |
| National Events Center | Partnership and national-calendar access lead | protected | 200 | partnership-api | المركز الوطني للفعاليات \| المركز الوطني للفعاليات |
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
  - Asset 200 main-LHNYDPX6.js: http://www.w3.org/2000/svg, https://www.scega.gov.sa/ar/InformationCenter/Surveys/Pages/07102025.aspx, https://eservices.scega.gov.sa/login, https://raqmi.dga.gov.sa/platforms/DigitalStamp/ShowCertificate/672, http://https://sdaia.gov.sa/ar/default.aspx, https://eportal.scega.gov.sa/h-events-list
  - Asset 200 chunk-OBQDSNNY.js: no URL hints
  - Asset 200 chunk-MVLO2RCX.js: no URL hints
  - Asset 200 chunk-YDMFIYLQ.js: http://www.w3.org/2000/svg
  - Asset 200 chunk-ZXUGHW4U.js: no URL hints
  - Asset 200 chunk-AJKCJFIT.js: no URL hints

### National Events Center

- Role lens: Partnership and national-calendar access lead
- Decision: partnership-api
- Classification: protected (200, fetch)
- Project use: Keep as the top strategic feed target; public site is evidence, while national-calendar export/API access is the real integration ask.
- Title: المركز الوطني للفعاليات | المركز الوطني للفعاليات
- Hint URLs: https://nec.gov.sa/ar, https://nec.gov.sa/en, https://twitter.com/nec_saudi?s=21, https://www.instagram.com/nec.saudi/, https://www.linkedin.com/company/events-center-sa/, https://www.vision2030.gov.sa/ar/, https://sdaia.gov.sa/ar/MediaCenter/Pages/ai-year.aspx, http://www.w3.org/2000/svg

### Visit Saudi Calendar

- Role lens: Production source operator
- Decision: active-collector
- Classification: reachable (200, fetch)
- Project use: Keep in the 6-hour source ring; Arabic and English API payloads are reachable and useful for tourism-facing event discovery.
- Title: تقويم السعودية | تابع العطلات والفعاليات المميزة - الموقع الرسمي للسياحة السعودية
- Hint URLs: https://www.googletagmanager.com/gtm.js?id=, https://www.visitsaudi.com/images/SoundStorm-1.2e16d0ba.fill-1200x630.jpg, https://www.visitsaudi.com/ar/saudi-calendar, https://www.visitsaudi.com/ar, http://schema.org, https://www.visitsaudi.com/en/saudi-calendar, https://www.visitsaudi.com/images/ornament-h-m1-24-8290.original.png, https://www.visitsaudi.com/images/01-8291.original.png
  - API 200 https://www.visitsaudi.com/bin/api/v3/events?locale=ar: 28 items; معرض اللغة العربية للطفل, معرض اللغة العربية 28, كنوز غارقة, سمره, مهرجان صوت أبها SAF
  - API 200 https://www.visitsaudi.com/bin/api/v3/events?locale=en: 28 items; Arabic Language Exhibition for kids, Arabic Language Exhibition 28, Sunken Treasures, Sammrah, Sound of Abha Fest (SAF)

### webook Explore

- Role lens: Ticketing-marketplace intelligence analyst
- Decision: candidate-discovery
- Classification: protected (200, fetch)
- Project use: Use for lead discovery, ticket-link corroboration, and duplicate checks; require official organizer or authority confirmation before promotion.
- Title: -
- Hint URLs: https://apps.apple.com/sa/app/webook-com-fun-things-to-do/id6468667896, https://play.google.com/store/apps/details?id=com.webook.android, https://wbk-assets.webook.com/0.7.2/assets/index-BDz2FmFA.js, https://wbk-assets.webook.com/0.7.2/assets/vendor-CWjaaAIG.js, https://wbk-assets.webook.com/0.7.2/assets/@wbk/hooks-ClRGmLow.js, https://wbk-assets.webook.com/0.7.2/assets/@wbk/logger-DfNVpG3P.js, https://wbk-assets.webook.com/0.7.2/assets/@wbk/api-DQmxFk-o.js, https://wbk-assets.webook.com/0.7.2/assets/@wbk/config-CgNJtaT3.js
  - Asset 200 api-DQmxFk-o.js: https://github.com/nadude/webook-frontend/blob/main/packages/api/README.md, https://webook.com/shop, https://www.recaptcha.net/recaptcha/api.js?render=${f.config.grecaptcha.v3Key}, https://wbk-assets.webook.com/event-tickets-prerequisite?event_id=${t}, https://wbk-assets.webook.com/organizations/$%7Br%7D/event-group/details, https://wbk-assets.webook.com/event-marketing-fee?event_id=${t}&utm_wid=${r}&lang=${a}
  - Asset 200 ticketing-QbXJwexE.js: https://github.com/nadude/webook-frontend/blob/main/packages/ticketing/README.md, https://cdn-{region}.seatsio.net/chart.js, https://chart.seatcloud.com/v1.0/chart.js, https://wbk.zendesk.com/hc/${i}, https://wbk.zendesk.com/hc/${n}, https://wa.me/${c.replace(/\D/g,
  - Asset 200 config-CgNJtaT3.js: https://apps.apple.com/us/app/webook-com-fun-things-to-do/id6468667896, https://play.google.com/store/apps/details?id=com.webook.android, https://appgallery.huawei.com/app/C109536445, https://wbk.it/app

### Enjoy Saudi

- Role lens: Entertainment public-interface reviewer
- Decision: official-evidence-protected
- Classification: protected (403, fetch)
- Project use: Treat as official GEA-facing evidence and partnership target; terminal fetch may be protected, so scheduled failures are not catalog failures.
- Title: تعذر الوصول إلى الصفحة | Access Unavailable
- Hint URLs: https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/style.css, https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/data-rate-005-429.png, https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/shield-exclamation.svg, https://static.cloudflareinsights.com/beacon.min.js/v4513226cdae34746b4dedf0b4dfa099e1781791509496

### General Entertainment Authority Events

- Role lens: Authority-of-record verifier
- Decision: official-evidence-protected
- Classification: protected (403, fetch)
- Project use: Use as authority confirmation for entertainment windows and venue pages; keep separate from Enjoy and ticketing marketplaces.
- Title: تعذر الوصول إلى الصفحة | Access Unavailable
- Hint URLs: https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/style.css, https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/data-rate-005-429.png, https://cdn.gea.gov.sa/8JbVQI1IkdzFCZigAg5ApDSJBkXqZa084hcQN75c6BrshfyWJT1M6D9qXLhOZi5i/shield-exclamation.svg, https://static.cloudflareinsights.com/beacon.min.js/v4513226cdae34746b4dedf0b4dfa099e1781791509496

### Evento

- Role lens: Commercial app/API surface auditor
- Decision: candidate-discovery
- Classification: reachable (200, fetch)
- Project use: Use only as commercial marketplace intelligence until documented API permission exists; exposed app API hints are evidence, not a scraping license.
- Title: Evento | إيفينتو
- Hint URLs: https://api-dev.evento.sa, https://wsrv.nl/?, https://wsrv.nl, https://fonts.googleapis.com, https://fonts.gstatic.com, https://fonts.gstatic.com/s/tajawal/v12/Iura6YBj_oCad4k1nzSBC45I.woff2, https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800&display=optional, https://fonts.gstatic.com/s/materialicons/v145/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2
  - Asset 200 main.5ed70f1585c784c1.js: https://evento.sa, https://evento.sa/assets/images/og-image.webp, https://schema.org, https://schema.org/EventScheduled, https://schema.org/OfflineEventAttendanceMode, https://schema.org/InStock

### Ministry of Commerce Upcoming Events

- Role lens: Government freshness and yield auditor
- Decision: low-yield-official-monitor
- Classification: fetch-error (0, curl)
- Project use: Monitor as official evidence with low priority; page structure is SharePoint-style and may be stale or empty for upcoming events.
- Title: -
- Hint URLs: -
