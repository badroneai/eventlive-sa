# EventLive Source Yield Report

Generated at: 2026-07-09T13:43:21.233Z
Sources attempted: 34

| Source | Status | Signals | Extracted raw | Future complete | Written last run | Drop reasons | Note |
|---|---|---:|---:|---:|---:|---|---|
| visit-saudi-calendar | ok | bytes 41996, rows 11, dates 0 | 11 | 11 | 10 | future-complete:11 |  |
| moc-cultural-calendar | error | bytes 0, rows 0, dates 0 | 0 | 0 | 0 | - | fetch failed |
| mos-events | error | bytes 0, rows 0, dates 0 | 0 | 0 | 0 | - | The operation was aborted due to timeout |
| experience-alula-events | ok | bytes 568668, rows 0, dates 1 | 1 | 0 | 0 | past-date:1 |  |
| mdlbeast-events | ok | bytes 395643, rows 0, dates 83 | 41 | 5 | 5 | future-complete:5, past-date:36 |  |
| monshaat-events | error | bytes 0, rows 0, dates 0 | 0 | 0 | 0 | - | The operation was aborted due to timeout |
| invest-saudi-events | ok | bytes 7022, rows 9, dates 0 | 8 | 3 | 3 | past-date:5, future-complete:3 |  |
| rfecc-whats-on | ok | bytes 144324, rows 0, dates 3 | 0 | 0 | 6 | - |  |
| eye-of-riyadh-events | error | bytes 0, rows 0, dates 0 | 0 | 0 | 0 | - | HTTP 403 |
| eventbrite-saudi | error | bytes 0, rows 0, dates 0 | 0 | 0 | 16 | - | HTTP 405 |
| tuwaiq-academy-bootcamps | ok | bytes 10788, rows 12, dates 0 | 12 | 12 | 12 | future-complete:12 |  |
| future-skills-catalog | ok | bytes 169748, rows 0, dates 2 | 12 | 4 | 4 | future-complete:4, past-date:8 |  |
| visit-saudi-seasons | ok | bytes 41996, rows 11, dates 0 | 4 | 4 | 4 | future-complete:4 |  |
| code-mcit-programs | ok | bytes 42936, rows 0, dates 0 | 0 | 0 | 0 | - |  |
| misk-hub-programs | ok | bytes 215761, rows 0, dates 0 | 5 | 5 | 5 | future-complete:5 |  |
| dhahran-expo-calendar | ok | bytes 490854, rows 0, dates 0 | 22 | 15 | 15 | past-date:7, future-complete:15 |  |
| ithra-events | ok | bytes 174254, rows 0, dates 7 | 0 | 0 | 0 | - |  |
| sdaia-academy-programs | error | bytes 0, rows 0, dates 0 | 0 | 0 | 0 | - | fetch failed |
| misk-hub-events | ok | bytes 229636, rows 0, dates 22 | 5 | 0 | 0 | past-date:5 |  |
| jcci-events-center | ok | bytes 1370249, rows 0, dates 0 | 13 | 0 | 0 | past-date:13 |  |
| saudi-pro-league-fixtures | ok | bytes 162264, rows 100, dates 200 | 100 | 0 | 0 | past-date:100 |  |
| saudi-space-agency-events | ok | bytes 146085, rows 0, dates 1 | 14 | 0 | 0 | past-date:14 |  |
| moc-cultural-subportals | error | bytes 0, rows 0, dates 0 | 0 | 0 | 0 | - | The operation was aborted due to timeout |
| discover-aseer-events | ok | bytes 137972, rows 0, dates 2 | 1 | 1 | 1 | future-complete:1 |  |
| saudi-water-authority-events | ok | bytes 176734, rows 0, dates 21 | 9 | 8 | 8 | future-complete:8, past-date:1 |  |
| saudi-university-events | error | bytes 85740, rows 0, dates 0 | 0 | 0 | 6 | - | ENOENT: no such file or directory, open '/home/runner/work/eventlive-sa/eventlive-sa/data/raw/source-snapshots/saudi-university-events-kaustcentral-event-list-2026-07-09T13-43-21-260Z.json' |
| sfda-events | ok | bytes 127189, rows 0, dates 18 | 9 | 7 | 5 | future-complete:7, past-date:2 |  |
| riyadh-city-events | ok | bytes 3129, rows 0, dates 0 | 94 | 94 | 40 | future-complete:94 |  |
| sdaia-calendar-events | error | bytes 0, rows 0, dates 0 | 0 | 0 | 0 | - | fetch failed |
| makkah-chamber-events | ok | bytes 67438, rows 0, dates 14 | 10 | 0 | 0 | past-date:10 |  |
| asharqia-chamber-events | ok | bytes 103207, rows 0, dates 3 | 15 | 2 | 2 | future-complete:2, past-date:13 |  |
| qassim-chamber-events | error | bytes 0, rows 0, dates 0 | 0 | 0 | 0 | - | HTTP 403 |
| abha-chamber-events | ok | bytes 38904, rows 0, dates 0 | 5 | 0 | 0 | past-date:5 |  |
| jazan-chamber-events | error | bytes 0, rows 0, dates 0 | 0 | 0 | 0 | - | The operation was aborted due to timeout |

## Zero Yield Sources

| Source | Diagnosis | Attempts |
|---|---|---|
| moc-cultural-calendar | collector-error: fetch failed | 0 |
| mos-events | collector-error: The operation was aborted due to timeout | 0 |
| experience-alula-events | past-date:1 | 0 |
| monshaat-events | collector-error: The operation was aborted due to timeout | 0 |
| rfecc-whats-on | date/content signals exist but extractor returned no complete future rows | 0 |
| eye-of-riyadh-events | collector-error: HTTP 403 | 0 |
| eventbrite-saudi | collector-error: HTTP 405 | 0 |
| code-mcit-programs | no rows detected by extractor | 0 |
| ithra-events | date/content signals exist but extractor returned no complete future rows | 2 |
| sdaia-academy-programs | collector-error: fetch failed | 0 |
| misk-hub-events | past-date:5 | 0 |
| jcci-events-center | past-date:13 | 0 |
| saudi-pro-league-fixtures | past-date:100 | 2 |
| saudi-space-agency-events | past-date:14 | 0 |
| moc-cultural-subportals | collector-error: The operation was aborted due to timeout | 0 |
| saudi-university-events | collector-error: ENOENT: no such file or directory, open '/home/runner/work/eventlive-sa/eventlive-sa/data/raw/source-snapshots/saudi-university-events-kaustcentral-event-list-2026-07-09T13-43-21-260Z.json' | 0 |
| sdaia-calendar-events | collector-error: fetch failed | 0 |
| makkah-chamber-events | past-date:10 | 0 |
| qassim-chamber-events | collector-error: HTTP 403 | 0 |
| abha-chamber-events | past-date:5 | 0 |
| jazan-chamber-events | collector-error: The operation was aborted due to timeout | 0 |

## Dropped Row Samples

| Source | Title | Reason | Raw date text | Converted date | City |
|---|---|---|---|---|---|
| experience-alula-events | AlFursan Endurance AlUla | past-date | 7 and 8 February 2026 | 2026-02-07T09:00:00+03:00 - 2026-02-08T18:00:00+03:00 | AlUla |
| mdlbeast-events | MDLBEAST Radio MixTape | past-date | 2026-06-18T21:00:00+00:00 - 2026-06-18T21:00:00+00:00 | 2026-06-19T00:00:00+03:00 - 2026-06-19T00:00:00+03:00 | Riyadh |
| mdlbeast-events | Balad Beast 2026 | past-date | 2026-02-04T21:00:00+00:00 - 2026-02-05T21:00:00+00:00 | 2026-02-05T00:00:00+03:00 - 2026-02-06T00:00:00+03:00 | Jeddah |
| mdlbeast-events | SOUNDSTORM 25 | past-date | 2025-12-10T21:00:00+00:00 - 2025-12-12T21:00:00+00:00 | 2025-12-11T00:00:00+03:00 - 2025-12-13T00:00:00+03:00 | Riyadh |
| mdlbeast-events | XP Music Futures 2025 | past-date | 2025-12-03T21:00:00+00:00 - 2025-12-05T21:00:00+00:00 | 2025-12-04T00:00:00+03:00 - 2025-12-06T00:00:00+03:00 | Riyadh |
| mdlbeast-events | Azimuth 2025 | past-date | 2025-09-24T21:00:00+00:00 - 2025-09-25T21:00:00+00:00 | 2025-09-25T00:00:00+03:00 - 2025-09-26T00:00:00+03:00 | AlUla |
| invest-saudi-events | INNOPROM. Saudi Arabia 2026 | past-date | 08/02/2026 - 10/02/2026 | 2026-02-08T09:00:00+03:00 - 2026-02-10T18:00:00+03:00 | Riyadh |
| invest-saudi-events | Viva Technology | past-date | 17/06/2026 - 20/06/2026 | 2026-06-17T09:00:00+03:00 - 2026-06-20T18:00:00+03:00 | Global |
| invest-saudi-events | Real Estate Future Forum | past-date | 26/01/2026 - 28/01/2026 | 2026-01-26T09:00:00+03:00 - 2026-01-28T18:00:00+03:00 | Riyadh |
| invest-saudi-events | PIF Private Sector Forum 2026 | past-date | 09/02/2026 - 10/02/2026 | 2026-02-09T09:00:00+03:00 - 2026-02-10T18:00:00+03:00 | Riyadh |
| invest-saudi-events | World Economic Forum 2026 (WEF) | past-date | 19/01/2026 - 23/01/2026 | 2026-01-19T09:00:00+03:00 - 2026-01-23T18:00:00+03:00 | Global |
| future-skills-catalog | أساسيات الحوسبة السحابية - Cloud Computing Fundamentals | past-date | تبدأ 08-12-2025 إلى 11-12-2025 لمدة 16 ساعات | 2025-12-08T09:00:00+03:00 - 2025-12-11T18:00:00+03:00 | Online |
| future-skills-catalog | لغة السي ++C | past-date | تبدأ 07-12-2025 إلى 11-12-2025 لمدة 20 ساعات | 2025-12-07T09:00:00+03:00 - 2025-12-11T18:00:00+03:00 | Online |
| future-skills-catalog | Web Development with HTML & CSS - تطوير الويب باستخدام HTML و CSS | past-date | تبدأ 01-12-2025 إلى 05-12-2025 لمدة 20 ساعات | 2025-12-01T09:00:00+03:00 - 2025-12-05T18:00:00+03:00 | Online |
| future-skills-catalog | Deep Learning - التعلم العميق | past-date | تبدأ 30-11-2025 إلى 04-12-2025 لمدة 20 ساعات | 2025-11-30T09:00:00+03:00 - 2025-12-04T18:00:00+03:00 | Online |
| future-skills-catalog | Artificial intelligence - الذكاء الاصطناعي | past-date | تبدأ 24-11-2025 إلى 27-11-2025 لمدة 16 ساعات | 2025-11-24T09:00:00+03:00 - 2025-11-27T18:00:00+03:00 | Online |
| dhahran-expo-calendar | Offer Home Expo | past-date | - | 2026-01-08T09:00:00+03:00 - 2026-01-11T18:00:00+03:00 | Dhahran |
| dhahran-expo-calendar | Heavy Equipment Connect | past-date | - | 2026-02-02T09:00:00+03:00 - 2026-02-04T18:00:00+03:00 | Dhahran |
| dhahran-expo-calendar | Real Estate Auction | past-date | - | 2026-02-02T09:00:00+03:00 - 2026-02-02T18:00:00+03:00 | Dhahran |
| dhahran-expo-calendar | Hala February Shopping Exhibition | past-date | - | 2026-02-06T09:00:00+03:00 - 2026-02-15T18:00:00+03:00 | Dhahran |
| dhahran-expo-calendar | Lamatna Expo | past-date | - | 2026-02-26T09:00:00+03:00 - 2026-03-04T18:00:00+03:00 | Dhahran |
| misk-hub-events | Cybersecurity in the Workplace | past-date | 01 Jul 2026 | 2026-07-01T19:00:00+03:00 - 2026-07-01T20:00:00+03:00 | Online |
| misk-hub-events | How to Choose Your Career Path and Keep Up with Labor Market Changes | past-date | 08 May 2026 | 2026-05-08T20:00:00+03:00 - 2026-05-08T21:00:00+03:00 | Saudi Arabia |
| misk-hub-events | Enhancing Efficiency and Productivity in the Workplace Using Artificial Intelligence | past-date | 08 May 2026 | 2026-05-08T21:00:00+03:00 - 2026-05-08T22:00:00+03:00 | Online |
| misk-hub-events | Misk Tour - Hail | past-date | 24 - 25 Dec 2024 | 2024-12-24T16:00:00+03:00 - 2024-12-25T22:00:00+03:00 | Saudi Arabia |
| misk-hub-events | Misk Tour - Jazan | past-date | 16 - 17 Dec 2025 | 2025-12-16T16:00:00+03:00 - 2025-12-17T22:00:00+03:00 | Saudi Arabia |
| jcci-events-center | Saudi Real Estate Development and Ownership Exhibition | past-date | 5/14/24 | 2024-05-14T09:00:00+03:00 - 2024-05-14T18:00:00+03:00 | Jeddah |
| jcci-events-center | Jeddah International Building Exhibition | past-date | 5/7/24 | 2024-05-07T09:00:00+03:00 - 2024-05-07T18:00:00+03:00 | Jeddah |
| jcci-events-center | Jeddah International Construction Exhibition | past-date | 5/7/24 | 2024-05-07T09:00:00+03:00 - 2024-05-07T18:00:00+03:00 | Jeddah |
| jcci-events-center | Ramadan Nights Events | past-date | 3/17/24 | 2024-03-17T09:00:00+03:00 - 2024-03-17T18:00:00+03:00 | Jeddah |
| jcci-events-center | National Consumer Industries Exhibition | past-date | 2/27/24 | 2024-02-27T09:00:00+03:00 - 2024-02-27T18:00:00+03:00 | Jeddah |
| saudi-pro-league-fixtures | Damac vs Al Hazem | past-date | Thu 28 Aug 2025, 17:05 BST | 2025-08-28T19:05:00+03:00 - 2025-08-28T21:05:00+03:00 | Khamis Mushait |
| saudi-pro-league-fixtures | Al Ahli vs Neom S.C. | past-date | Thu 28 Aug 2025, 19:00 BST | 2025-08-28T21:00:00+03:00 - 2025-08-28T23:00:00+03:00 | Jeddah |
| saudi-pro-league-fixtures | Al Ettifaq vs Al Kholood | past-date | Thu 28 Aug 2025, 19:00 BST | 2025-08-28T21:00:00+03:00 - 2025-08-28T23:00:00+03:00 | Dammam |
| saudi-pro-league-fixtures | Al Hilal vs Al Riyadh | past-date | Fri 29 Aug 2025, 16:50 BST | 2025-08-29T18:50:00+03:00 - 2025-08-29T20:50:00+03:00 | Riyadh |
| saudi-pro-league-fixtures | Al Shabab vs Al Khaleej | past-date | Fri 29 Aug 2025, 19:00 BST | 2025-08-29T21:00:00+03:00 - 2025-08-29T23:00:00+03:00 | Riyadh |
| saudi-space-agency-events | Participates in the 69th session of the United Nations Committee on the Peaceful Uses of Outer Space (COPUOS) | past-date | 2026-06-10T06:00:00Z - 2026-06-18T13:00:00Z - Vienna | 2026-06-10T09:00:00+03:00 - 2026-06-18T16:00:00+03:00 | Global |
| saudi-space-agency-events | Artemis II Mission Launch Side Exhibitions | past-date | 2026-03-28T06:00:00Z - 2026-03-31T14:00:00Z - USA | 2026-03-28T09:00:00+03:00 - 2026-03-31T17:00:00+03:00 | Global |
| saudi-space-agency-events | "Abaad" Competition Closing Ceremony | past-date | 2026-02-05T08:00:00Z - 2026-02-05T12:00:00Z - Riyadh | 2026-02-05T11:00:00+03:00 - 2026-02-05T15:00:00+03:00 | Riyadh |
| saudi-space-agency-events | Space Debris Conference 2026 | past-date | 2026-01-26T07:00:00Z - 2026-01-27T15:00:00Z - Riyadh, Saudi Arabia | 2026-01-26T10:00:00+03:00 - 2026-01-27T18:00:00+03:00 | Riyadh |
| saudi-space-agency-events | The Saudi Arabia participated in the 64th session of the Legal Subcommittee of the United Nations Committee on the Peaceful Uses of Outer Space (COPUOS) | past-date | 2025-06-15T09:00:00Z - 2025-06-15T14:00:00Z - Vienna International Centre | 2025-06-15T12:00:00+03:00 - 2025-06-15T17:00:00+03:00 | Global |
| saudi-water-authority-events | Saudi Water Week | past-date | - | 2026-06-28T09:00:00+03:00 - 2026-07-02T04:00:00+03:00 | Jeddah |
| sfda-events | نقل مبيدات آفات الصحة العامة | past-date | 2026-07-06 - 2026-07-06 نقل مبيدات آفات الصحة العامة | 2026-07-06T09:00:00+03:00 - 2026-07-06T18:00:00+03:00 | Online |
| sfda-events | آلية تقديم طلبات اذونات استيراد مواد التصوير الطبي في النظام الالكتروني ومتطلباتها | past-date | 2026-07-06 - 2026-07-06 آلية تقديم طلبات اذونات استيراد مواد التصوير الطبي في النظام الالكتروني ومتطلباتها | 2026-07-06T09:00:00+03:00 - 2026-07-06T18:00:00+03:00 | Online |
| makkah-chamber-events | التوسع الذكي: متى وكيف تكبر مشروعك؟ | past-date | 01/03/2026 إلى 02/03/2026 23:3 0:3 | 2026-03-01T23:03:00+03:00 - 2026-03-02T00:03:00+03:00 | Makkah |
| makkah-chamber-events | الذكاء العاطفي وبناء علاقات قوية في عالم الأعمال | past-date | 01/03/2026 إلى 01/03/2026 22:3 23:3 | 2026-03-01T22:03:00+03:00 - 2026-03-01T23:03:00+03:00 | Makkah |
| makkah-chamber-events | ذكاء الأعمال: من البيانات إلى القرار | past-date | 28/02/2026 إلى 01/03/2026 23:2 0:3 | 2026-02-28T23:02:00+03:00 - 2026-03-01T00:03:00+03:00 | Makkah |
| makkah-chamber-events | كيف تبني البراند باستخدام الذكاء الاصطناعي | past-date | 28/02/2026 إلى 28/02/2026 22:2 23:2 | 2026-02-28T22:02:00+03:00 - 2026-02-28T23:02:00+03:00 | Makkah |
| makkah-chamber-events | الانطلاقة القانونية الآمنة للمشاريع الريادية | past-date | 27/02/2026 إلى 28/02/2026 23:2 0:2 | 2026-02-27T23:02:00+03:00 - 2026-02-28T00:02:00+03:00 | Makkah |
| asharqia-chamber-events | حفل الاستقبال السنوي لقطاع الاعمال 2025م | past-date | 16/12/2025 16/12/2025 07:00 PM 07:00 PM | 2025-12-16T19:00:00+03:00 - 2025-12-16T19:00:00+03:00 | Dhahran |
| asharqia-chamber-events | ملتقى ومعرض ريادة الأعمال 2025م | past-date | 24/11/2025 26/11/2025 04:00 PM 04:00 PM | 2025-11-24T16:00:00+03:00 - 2025-11-26T16:00:00+03:00 | Dhahran |
| asharqia-chamber-events | منتدى القطيف الاستثماري 2025م | past-date | 29/10/2025 29/10/2025 09:00 AM 09:00 AM | 2025-10-29T09:00:00+03:00 - 2025-10-29T09:00:00+03:00 | Qatif |
| asharqia-chamber-events | معرض وظائف 2025م | past-date | 26/10/2025 28/10/2025 12:00 AM 12:00 AM | 2025-10-26T09:00:00+03:00 - 2025-10-28T18:00:00+03:00 | Dhahran |
| asharqia-chamber-events | معرض الحرف والأعمال اليدوية 2025 | past-date | 08/10/2025 11/10/2025 04:00 PM 04:00 PM | 2025-10-08T16:00:00+03:00 - 2025-10-11T16:00:00+03:00 | Dhahran |
| abha-chamber-events | ورشة عمل الرقابة على منتجات التجميل | past-date | 05/12/2024 | 2024-12-05T09:00:00+03:00 - 2024-12-05T18:00:00+03:00 | Abha |
| abha-chamber-events | غرفة أبها تدعو شباب عسير للتطوع السياحي لتطوير القطاع وتعزيز العمل المجتمعي | past-date | 20/02/2025 | 2025-02-20T09:00:00+03:00 - 2025-02-20T18:00:00+03:00 | Abha |
| abha-chamber-events | الدورة التدريبية الجماهيرية " انطلاقة العظماء" | past-date | 14/01/2025 | 2025-01-14T09:00:00+03:00 - 2025-01-14T18:00:00+03:00 | Abha |
| abha-chamber-events | ورشة عمل تراخيص مرافق الضيافة والأنشطة السياحية والرقابة في القطاع السياحي | past-date | 05/02/2025 | 2025-02-05T09:00:00+03:00 - 2025-02-05T18:00:00+03:00 | Abha |
| abha-chamber-events | ورشة عمل "مدخل إلى عالم العطور "بغرفة أبها | past-date | 05/08/2025 | 2025-08-05T09:00:00+03:00 - 2025-08-05T18:00:00+03:00 | Abha |

