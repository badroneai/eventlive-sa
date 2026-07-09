# EventLive Browser Source Probe

Generated at: 2026-07-09T11:10:25.873Z

## Summary

- Sources probed: 2
- Browser network API: 2
- Hydration payload: 0
- Rendered HTML candidates: 0
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 15 | platinumlist-jeddah | ok | 200 | browser-network-api | 6 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 70 | platinumlist-riyadh | ok | 200 | browser-network-api | 7 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- platinumlist-jeddah: POST https://api-iam.intercom.io/messenger/web/launcher_settings (200, json-object:alignment,color,color_dark,has_required_features,horizontal_padding,instant_boot_enabled,launcher_logo_url,launcher_logo_dark_url)
- platinumlist-jeddah: POST https://api-iam.intercom.io/messenger/web/ping (200, json-like-invalid)
- platinumlist-jeddah: GET https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnT6ZUvKq85TntPICdOl6TtzMtpHIpmEfWd2hMQM-ubRIp5bNjRocdSv0VzAU-yBd8-vHaLeDCXZihj3eIxCSlc2MJkNC_cfe2M0rYs2-CW_HJaBZxoSn8HNlCOp4O89uCodfDcHqzOjSWWyzMenQ4KzG16iI9P5cZyk-O2UtJ7qNw__RpX_vt5nGGcp7vBEvsj6wUtssJlQoKeuApJ9wVxUUmNjcKQk4l1qX7xf9KAm-wQ_Gg7cP_gYgKL-UtDuq2T-KFYdnA_ywUP9coFrJuaz5CdY798ysvW0Ta8QL_WcjTE1glo&lib=MMFla1dbty4E2kC_A4Ps0p1yV9uYVTecs (200, json-object:fire,reason)
- platinumlist-jeddah: POST https://firebaseremoteconfig.googleapis.com/v1/projects/platinumlist-1014/namespaces/fireperf:fetch?key=AIzaSyDaGP5AHnM-P1wNrGBR_2YR-7Mg_xGk09Y (200, json-object:entries,state,templateVersion)
- platinumlist-jeddah: POST https://bam.nr-data.net/1/b9f23f089a?a=7553806&v=1.317.0&to=MVNVZRMDCEJTAU0IDggZdEQSFglcHQdPBA8SGVRQDQcIVVMQFggPAlNP&rst=17388&ck=0&s=a7edfa2b8f4ae0a7&ref=https://jeddah.platinumlist.net/ar/calendar/this-weekend&ptid=e542fdd77537e3ac&ap=3121&be=12324&fe=4556&dc=1320&at=HRRCE1sZGx0QAxtbGhtL&fsh=1&perf=%7B%22timing%22:%7B%22of%22:1783595426599,%22n%22:0,%22f%22:3628,%22dn%22:3628,%22dne%22:3628,%22c%22:3628,%22s%22:3628,%22ce%22:3628,%22rq%22:3629,%22rp%22:12324,%22rpe%22:12328,%22di%22:13428,%22ds%22:13644,%22de%22:13644,%22dc%22:16841,%22l%22:16842,%22le%22:16880%7D,%22navigation%22:%7B%7D%7D&fp=13200&fcp=13200 (200, json-object:stn,err,ins,spa,sr,srs,st,sts)
- platinumlist-jeddah: GET https://jeddah.platinumlist.net/event/calendar/render-line-calendar?chunk=20&startDate=this-weekend&selectedDate=this-weekend (200, json-like-invalid)
- platinumlist-riyadh: POST https://api-iam.intercom.io/messenger/web/launcher_settings (200, json-object:alignment,color,color_dark,has_required_features,horizontal_padding,instant_boot_enabled,launcher_logo_url,launcher_logo_dark_url)
- platinumlist-riyadh: GET https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnSBXAkFLZp8QTxFdt4cj45fJQkmBKJPqr5o8XZTLqjp5iU0MEyO3BSf9tIWOLybjUmdpsf5QPCjeWAm9Y7kuts6kyW0E2e_rFEyduDiXfkRvivu5GHJ156YYtbjjPY8gMfqU3J0Pt5L9f-GEfCcPiblVbARznMTd03YQabx96SxcvuyoOLXE0zsPSUXlSUwsU42_7vHYrgibXXZLy_6Opo6wkmhoNZBg1DHqgDqj2SwPBAMEdu5N8JfWplCNdWsHMAhaRtjJv1Ya3UcgXUtssYJyoV7LRzUQZ5ojK9Mr_oqWHIvH0U&lib=MMFla1dbty4E2kC_A4Ps0p1yV9uYVTecs (200, json-object:fire,reason)
- platinumlist-riyadh: POST https://api-iam.intercom.io/messenger/web/ping (200, json-like-invalid)
- platinumlist-riyadh: POST https://firebaseremoteconfig.googleapis.com/v1/projects/platinumlist-1014/namespaces/fireperf:fetch?key=AIzaSyDaGP5AHnM-P1wNrGBR_2YR-7Mg_xGk09Y (200, json-object:entries,state,templateVersion)
- platinumlist-riyadh: POST https://bam.nr-data.net/1/b9f23f089a?a=7553806&v=1.317.0&to=MVNVZRMDCEJTAU0IDggZdEQSFglcHQdPBA8SGVRQDQcIVVMQFggPAlNP&rst=8140&ck=0&s=2c4df5bdaef9941c&ref=https://riyadh.platinumlist.net/ar/calendar/today&ptid=60e22a5816f1af58&ap=2292&be=3831&fe=3861&dc=1173&at=HRRCE1sZGx0QAxtbGhtL&fsh=1&perf=%7B%22timing%22:%7B%22of%22:1783595450152,%22n%22:0,%22f%22:977,%22dn%22:977,%22dne%22:977,%22c%22:977,%22s%22:977,%22ce%22:977,%22rq%22:978,%22rp%22:3832,%22rpe%22:3833,%22di%22:4762,%22ds%22:5004,%22de%22:5004,%22dc%22:7659,%22l%22:7659,%22le%22:7692%7D,%22navigation%22:%7B%7D%7D&fp=4700&fcp=4700 (200, json-object:stn,err,ins,spa,sr,srs,st,sts)
- platinumlist-riyadh: GET https://riyadh.platinumlist.net/event/calendar/render-line-calendar?chunk=20&startDate=today&selectedDate=today (200, json-like-invalid)
- platinumlist-riyadh: POST https://firebaselogging-pa.googleapis.com/v1/firelog/legacy/log?key=AIzaSyCx80ru6-RXeTi3GvqkFsMVyMf-vpgIoVw (200, json-object:nextRequestWaitMillis,logResponseDetails)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| platinumlist-jeddah | لة نهاية أسبوع جميلة في جدة خيارات أخرى يوليو 9 الخميس 10 الجمعة 11 السبت 12 الأحد 13 الاثنين 14 الثلاثاء 15 الأربعاء 16 الخم<br>الفعاليات الرياضية جميع الفئات الخميس 9 يوليو خصم 10% عمر الجمل - عرض كوميدي تفاعلي في جدة 200.00 SAR يُباع سريعًا الخميس 09<br>يوليو حصري BD House in Jeddah / 09 JUL 115.00 SAR تذاكر الحجز المسبق الخميس 09 يوليو | اليوم -> https://jeddah.platinumlist.net/ar/calendar/today<br>عطلة نهاية أسبوع جميلة -> https://jeddah.platinumlist.net/ar/calendar/this-weekend<br>خلال هذا الشهر -> https://jeddah.platinumlist.net/ar/calendar/july<br>كل الفعاليات -> https://jeddah.platinumlist.net/ar/event | POST https://api-iam.intercom.io/messenger/web/launcher_settings (200, json-object:alignment,color,color_dark,has_required_features,horizontal_padding,instant_boot_enabled,launcher_logo_url,launcher_logo_dark_url): {"alignment":"right","color":"#E139F7","color_dark":"#E139F7","has_required_features":true,"horizontal_padding":20,"ins…<br>POST https://api-iam.intercom.io/messenger/web/ping (200, json-like-invalid): {"app":{"name":"Platinumlist","audio_enabled":true,"show_powered_by":true,"team_intro":null,"team_greeting":"Hi there �… |
| platinumlist-riyadh | ة الفعاليات اليوم في الرياض خيارات أخرى يوليو 9 الخميس 10 الجمعة 11 السبت 12 الأحد 13 الاثنين 14 الثلاثاء 15 الأربعاء 16 الخم<br>العروض والمسرحيات جميع الفئات الخميس 9 يوليو الأعلى مبيعًا ذا باك يارد – عرض مباريات كأس العالم في الرياض 50.00 SAR يُباع سر<br>يعًا الخميس 09 يوليو - الأربعاء 15 يوليو جديد ميلوتيك تقدم موجي في الرياض 250.00 SAR 200.00 SAR الخميس 09 يوليو تذاكر ال | اليوم -> https://riyadh.platinumlist.net/ar/calendar/today<br>عطلة نهاية أسبوع جميلة -> https://riyadh.platinumlist.net/ar/calendar/this-weekend<br>خلال هذا الشهر -> https://riyadh.platinumlist.net/ar/calendar/july<br>فعاليات قطاع الأعمال -> https://riyadh.platinumlist.net/ar/business-events | POST https://api-iam.intercom.io/messenger/web/launcher_settings (200, json-object:alignment,color,color_dark,has_required_features,horizontal_padding,instant_boot_enabled,launcher_logo_url,launcher_logo_dark_url): {"alignment":"right","color":"#E139F7","color_dark":"#E139F7","has_required_features":true,"horizontal_padding":20,"ins…<br>GET https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnSBXAkFLZp8QTxFdt4cj45fJQkmBKJPqr5o8XZ… (200, json-object:fire,reason): {"fire":false,"reason":"Missing or invalid event_id"} |
