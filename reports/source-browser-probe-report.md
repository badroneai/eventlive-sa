# EventLive Browser Source Probe

Generated at: 2026-11-24T12:48:17.350Z

## Summary

- Sources probed this run: 8
- Fresh results available: 13
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 2
- Blocked/protected: 2
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 3 | moc-cultural-calendar | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 4 | mos-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 10 | invest-saudi-events | ok | 200 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 12 | eye-of-riyadh-events | ok | 200 | rendered-html-candidates | 0 | 20 | 8 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 14 | eventbrite-saudi | ok | 200 | browser-network-api | 12 | 20 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 16 | tuwaiq-academy-bootcamps | ok | 200 | browser-structured-html | 0 | 0 | 8 | اكتب extractor من JSON-LD أو structured scripts مع fallback للبطاقات. |
| 17 | future-skills-catalog | ok | 200 | rendered-html-candidates | 0 | 20 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 21 | misk-hub-programs | ok | 403 | blocked-or-protected | 0 | 0 | 0 | لا تلتف على الحماية؛ صنف المصدر partnership/API أو ابحث عن مسار رسمي. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 32 | saudi-space-agency-events | ok | 405 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 60 | qassim-chamber-events | ok | 403 | blocked-or-protected | 0 | 0 | 0 | لا تلتف على الحماية؛ صنف المصدر partnership/API أو ابحث عن مسار رسمي. |

## Endpoint Candidates

- eventbrite-saudi: GET https://cdntranscend.eventbrite.com/cm/f2747157-cf59-4ef1-8703-018defe51764/translations/en.json (200, json-like-invalid)
- eventbrite-saudi: GET https://www.eventbrite.com/api/v3/system/rokt/ (200, json-object:api_key,jurisdiction)
- eventbrite-saudi: GET https://www.eventbrite.com/api/v3/geo/place_from_request/ (200, json-object:place)
- eventbrite-saudi: POST https://www.eventbrite.com/api/v3/destination/city-browse/ (200, json-object:buckets,description,search_id,place,city,excluded_buckets,more_buckets,branding)
- eventbrite-saudi: POST https://www.eventbrite.com/orion/v3/identity/settings (200, json-like-invalid)
- eventbrite-saudi: POST https://eventbrite.pxf.io/xur/21676 (200, json-object:tps,fpc)
- eventbrite-saudi: GET https://ct.pinterest.com/user/?event=pagevisit&ed=%7B%22np%22%3A%22gtm%22%2C%22gtm_version%22%3A%22legacy%22%7D&tid=2613548787240&cb=1795524549976&dep=5%2CEVENT_TAGS_ABSENT (200, json-object:aemEnabled,aemFnLnEnabled,aemPhEnabled,aemGeEnabled,aemDbEnabled,aemLocEnabled,aemExternalIdEnabled,aemProductMetadataEnabled)
- eventbrite-saudi: GET https://cta-service-cms2.hubspot.com/web-interactives/public/v1/embed/combinedConfigs?portalId=8020908&currentUrl=https%3A%2F%2Fwww.eventbrite.com%2Fd%2Fsaudi-arabia%2Fevents%2F (200, json-object:sortedAudienceConfigs,requestedConfigs,gates)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| eye-of-riyadh-events | 13 Jumada II 1448 - 24 November 2026 Sign In/Sign Up Advertise with us Sign-up for newsletter HOME NEWS EVENTS BUSIN<br>hatsApp X LinkedIn Facebook Email Share 25 - 27 Jan, 2027 Real Estate Future Forum Four Seasons Hotel , Riyadh / Forum The Real Est<br>must evolve, embracing... More Details 4 - 5 Apr, 2027 Global Proptech Summit 2027 Mandarin Oriental Al Faisaliah , Riyadh / Sum | EVENTS -> https://www.eyeofriyadh.com/events/<br>عربي -> https://www.eyeofriyadh.com/ar/events/<br>Award -> https://www.eyeofriyadh.com/events/?fcat=15<br>Ceremony -> https://www.eyeofriyadh.com/events/?fcat=21 | - |
| eventbrite-saudi | - | upgrade your browser -> https://www.eventbrite.com/support/articles/en_US/Troubleshooting/how-to-troubleshoot-internet-browser-issues<br>Eventbrite -> https://www.eventbrite.com/<br>Eventbrite -> https://www.eventbrite.com/<br>Updates -> https://www.eventbrite.com/product-updates | GET https://cdntranscend.eventbrite.com/cm/f2747157-cf59-4ef1-8703-018defe51764/translations/en.json (200, json-like-invalid): {"purpose.trackingType.Advertising.description":"Helps us and others serve ads relevant to you.","purpose.trackingType.…<br>GET https://www.eventbrite.com/api/v3/system/rokt/ (200, json-object:api_key,jurisdiction): {"api_key":"us2-56fd0de921078242b73ab7734aa778d2","jurisdiction":"ROW"} |
| tuwaiq-academy-bootcamps | ية الاحترافية لسحابة قوقل","startDate":"2026-12-06T17:00:00+03:00","endDate":"2026-12-31T21:00:00+03:00","autoCloseRegistration":f<br>nStartDate":null,"registrationEndDate":"2026-11-08T12:00:00+03:00","requireProfileCompletion":true,"isMergePublish":true,"isPaid":<br>عسكر حلول الأمن السيبراني","startDate":"2026-12-13T17:00:00+03:00","endDate":"2027-01-07T20:00:00+03:00","autoCloseRegistration":f | - | - |
| future-skills-catalog | - | تجاوز إلى المحتوى الرئيسي -> https://futureskills.mcit.gov.sa/ar/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>English -> https://futureskills.mcit.gov.sa/en/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>الفعاليات -> https://www.mcit.gov.sa/ar/events<br>البرنامج المتخصص في العمل الحر -> http://futureskills.mcit.gov.sa/ar/node/20481 | - |
