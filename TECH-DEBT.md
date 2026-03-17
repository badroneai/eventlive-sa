# TECH-DEBT.md

## 1) Unsafe HTML interpolation (Priority: High)
- **Where:** `scripts/generate-site.mjs`
- **Issue:** حقن نصوص السجلات مباشرة داخل HTML strings.
- **Risk:** XSS إذا دخلت بيانات غير موثوقة.
- **Proposed Fix:** implement `escapeHTML()` and sanitize all rendered fields.

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
