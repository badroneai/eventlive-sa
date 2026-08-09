# TECH-DEBT.md

## 1) HTML and URL output encoding (Priority: Preventive; known High findings resolved)
- **Where:** `scripts/generate-site.mjs` and generated event-detail scripts.
- **Current Status:** دالة `escapeHtml()` موجودة وتُستخدم في قوالب HTML. أغلقت T0.3 مسار session DOM XSS باستبدال `innerHTML` بعُقد DOM و`textContent`، وأغلقت T0.4 حقن بروتوكولات الروابط وخصائص الصور عبر `safeHref()` وتعقيم `src` وقيود schema/validator.
- **Known Open Findings:** لا توجد ثغرة Critical/High معروفة حالياً في المسارات التي غطتها T0.3/T0.4.
- **Remaining Debt:** ما زال مولّد الموقع يعتمد كثيراً على HTML string templates؛ أي sink جديد يحتاج ترميزاً واعياً بالسياق، ولا يجوز تمرير URL إلى `href` دون `safeHref()`.
- **Regression Gates:** `test:session-xss` و`test:url-attribute-xss` ضمن `launch:site-gates`.

## 2) CSV parser simplification (Priority: Medium)
- **Where:** `scripts/validate-data.mjs`
- **Issue:** parser بسيط ولا يدعم quoted fields بشكل كامل.
- **Risk:** false parsing على بيانات OCR مع فواصل داخل النص.
- **Proposed Fix:** استخدام parser موثوق (csv-parse) أو parser state-machine.

## 3) No dedicated unit-test framework (Priority: Medium)
- **Where:** project-wide
- **Issue:** regression test موجود لكنه ليس ضمن إطار اختبارات قياسي.
- **Risk:** توسّع الاختبارات أصعب مع الوقت.
- **Proposed Fix:** إدخال Vitest/Jest تدريجيًا وربطها بـ CI.

## 4) Large dataset rendering strategy (Priority: Low/Medium)
- **Where:** front-end render logic
- **Issue:** full filter/sort on each input event.
- **Risk:** بطء عند datasets كبيرة.
- **Proposed Fix:** debounce + memoized filtered state + server-side pagination (later).

## 5) Operator console read-surface authentication (Priority: Medium)
- **Where:** `apps/operator-console/server.mjs` read-only `/api/` routes and `/artifacts/`.
- **Issue:** T0.5 authenticates and origin-checks all state-changing API requests, but GET workspace data and files under `workspaces/`, `reports/`, and `dist/` remain readable without a token.
- **Risk:** عند تشغيل الكونسول على non-loopback host يمكن لعميل شبكي قراءة بيانات تشغيلية داخلية، مع بقاء مسارات التغيير محمية.
- **Proposed Fix:** قبل اعتماد تشغيل شبكي دائم، أضف read-scope authentication أو session-based console login، مع إبقاء static public preview assets منفصلة عن internal workspace artifacts.

## 6) Duplicate event records from multi-event PDF ingestion (Priority: Medium)
- **Where:** `data/events_catalog.json` / `data/source_ended_events.json` ingestion, `buildEvents()` semantic dedupe in `scripts/generate-site.mjs`.
- **Issue:** بوابة `test:search-indexability` (2026-08-09) كشفت 14 فعالية منشورة **مرتين** بسلَغين مختلفين: صف من `Visit Saudi Summer Calendar PDF` بنافذة يوم كامل، ونسخة أدق من مصدر أول‑طرفي (Discover Aseer / Visit Saudi Calendar / MDLBEAST). مفتاح الـ dedupe الدلالي يجزّئ **العنوان العربي**، والعنوانان يختلفان بالنقحرة («سكاي فيلج» مقابل «قرية السماء»)، أو بالصياغة («متنزه» مقابل «حديقة»)، أو بخطأ إملائي في الـ PDF («ليلة اابطال») — فينجو الصفّان معًا.
- **Risk:** 36 صفحة مفهرسة تتنافس على 14 فعالية. Google يختار واحدة ويُسقط البقية اعتباطًا، فقد تخسر الفعالية صفحتها الأفضل.
- **Current Mitigation (ليس إصلاحًا):** `scripts/event-canonical-aliases.mjs` — سجلّ مُنسَّق يوجّه كل نسخة مكررة إلى نسختها الأساسية عبر `<link rel="canonical">` ويُبقيها خارج `sitemap.xml`. **لا يُلغي نشر أي فعالية** (إلغاء النشر قرار مالك، انظر `APPROVAL-DECISION-GUIDE.md`). الصفحة تبقى حيّة لزوّارها، وإشارة الفهرسة وحدها تنتقل.
- **Proposed Fix:** دمج السجلّات في طبقة البيانات — إمّا بتوسيع مفتاح الـ dedupe ليشمل (المدينة + تاريخ البداية + مصدر متعدد‑الفعاليات)، أو بربط صفوف الـ PDF بالسجلّ الأول‑طرفي وقت الاستيراد. عندها يُحذف السجلّ اليدوي بالكامل.
- **Regression Gates:** `test:search-indexability` (عناوين متطابقة بين صفحتين كلٌّ منهما canonical لنفسها = فشل)، `test:sitemap`، `test:i18n-site`.
