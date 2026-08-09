// HTML entity helpers shared by the generators and the content pipeline.
//
// Two defect classes live here, both of which reached production titles and
// meta descriptions:
//
//  * escaping an already-escaped value ("&quot;" -> "&amp;quot;"), which a
//    searcher then reads verbatim in the Google snippet;
//  * storing source-fed or machine-translated text that still carries its
//    entities, so the escape happens legitimately and the entity ships anyway.
//
// Both are fixed by decoding before the value is treated as plain text.

const NAMED = new Map([
  ['quot', '"'],
  ['apos', "'"],
  ['lt', '<'],
  ['gt', '>'],
  ['nbsp', ' '],
  ['amp', '&']
]);

export function escapeHtmlText(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Decodes the entity set the pipeline actually produces (named basics plus
 * numeric references). `&amp;` resolves last so that an intentionally
 * double-encoded `&amp;lt;` decodes to the literal text `&lt;` rather than `<`.
 */
export function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&(quot|apos|lt|gt|nbsp);/gi, (_match, name) => NAMED.get(name.toLowerCase()) ?? _match)
    .replace(/&amp;/gi, '&');
}

/** True when a value still carries markup entities that should have been decoded. */
export function hasHtmlEntities(value = '') {
  return /&(?:quot|apos|lt|gt|nbsp|amp|#\d+|#x[0-9a-f]+);/i.test(String(value));
}
