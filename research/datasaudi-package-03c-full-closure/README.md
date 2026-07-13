# DataSaudi Package 03C — Full Independent Closure

هذه حزمة مصنع إجابات حتمي deterministic تغطي **267/267** سؤالًا مجمدًا دون أي اعتماد على INSAIGHTS.

## ما الذي يعنيه «مغلق» هنا؟

كل سؤال له نص منظم بلغته الأصلية: 247 بالعربية و20 بالإنجليزية. إذا توفرت صفوف قابلة للإعادة، تظهر القيم والصيغة والمصدر. إذا لم تتوفر، تكون الإجابة NO_RANK/رفضًا/حدًا موثقًا بدل تخليق رقم.

## الطبقتان المنفصلتان

- `insaights_observed_status`: ما حدث فعليًا في المنصة (إجابة/حجب/حد/لم يُرسل).
- `independent_answer_status`: الجواب الذي أنتجه المصنع من الكتالوج والأدلة المحلية.

## التشغيل

```bash
node scripts/datasaudi-package-03c/build-full-closure.mjs
node scripts/datasaudi-package-03c/validate-full-closure.mjs
node --test tests/datasaudi-package-03c/*.test.mjs
```

الملف الرئيسي للتكامل: `03-answer-ledger/full-answer-ledger.jsonl`. ملخصه وتحققه في المجلد نفسه، والسجل المقروء: `FULL-CLOSURE-REGISTER.md`.
