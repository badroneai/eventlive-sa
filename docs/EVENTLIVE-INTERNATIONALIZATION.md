# EventLive Internationalization Contract

## Public locales

| Locale | Direction | URL | Status |
| --- | --- | --- | --- |
| `ar-SA` | RTL | `/` | Default and active |
| `en-SA` | LTR | `/en/` | Active |
| `zh-Hans` | LTR | `/zh-hans/` | Registered for a later phase, not published |

Every public Arabic HTML route has one English counterpart with the same route key. Owner-only operational pages are not mirrored.

## Source files

- `locales/manifest.json`: locale registry, direction, prefix, and numbering system.
- `locales/ar-SA.json` and `locales/en-SA.json`: ICU messages used by the locale engine.
- `locales/en-SA-static.json`: reviewed translations for existing generated UI and taxonomy text.
- `scripts/i18n-utils.mjs`: locale context, paths, ICU messages, dates, numbers, lists, and relative time.
- `scripts/generate-localized-site.mjs`: post-build localized route generation and SEO integration.

## Build behavior

`npm run build` first generates the canonical Arabic site and then:

1. normalizes Arabic pages to `lang="ar-SA" dir="rtl"`;
2. generates matching English pages under `/en/` with `lang="en-SA" dir="ltr"`;
3. localizes UI controls, runtime strings, city and category labels without changing official event identity;
4. adds reciprocal canonical and `hreflang` links;
5. localizes JSON-LD, metadata, the event catalog, PWA manifest, and AI discovery files;
6. creates a bilingual sitemap and English offline shell;
7. preserves query strings and fragments when switching languages.

The browser language may trigger a dismissible suggestion. It never forces a redirect. The visitor's explicit language choice is stored locally.

## Trust and content rules

- Official event titles may remain in the language used by the source.
- Translated UI must not imply that EventLive translated or changed official organizer content.
- Dates and times use the `Asia/Riyadh` operating context.
- Arabic and English search terms resolve against the same canonical events and city identities.
- A localized route cannot publish unless its Arabic counterpart exists.

## Adding a locale

1. Add the locale definition to `locales/manifest.json`.
2. Add a complete ICU message file with the same keys as `ar-SA.json`.
3. Add a reviewed static taxonomy and UI translation layer.
4. Register the URL prefix and direction in the localized generator.
5. Generate exact route counterparts, PWA metadata, JSON-LD, and sitemap alternates.
6. Extend `test:i18n-contract` and `test:i18n-site`.
7. Run `npm run build`, `npm run launch:site-gates`, and the production deployment workflow.

Do not activate a future locale in the public locale registry until all public routes, metadata, runtime strings, and release gates are complete.
