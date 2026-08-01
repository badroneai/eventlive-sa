// City-profiles place category taxonomy (EVENTME-CITY-PROFILES-BRIEF.md).
// Deliberately separate from category-taxonomy.mjs (event categories) —
// places and events are different domain objects with different category
// sets; nothing here should ever be merged into the 10-key event taxonomy.
//
// Display order below is also the canonical grouping order used when
// rendering a city's places section (scripts/city-places-render.mjs) —
// keep it stable so a city's category groups don't reorder between builds.
export const PLACE_CATEGORIES = Object.freeze([
  { key: 'nature', label_ar: 'طبيعة', label_en: 'Nature' },
  { key: 'culture', label_ar: 'ثقافة', label_en: 'Culture' },
  { key: 'entertainment', label_ar: 'ترفيه', label_en: 'Entertainment' },
  { key: 'adventure', label_ar: 'مغامرة', label_en: 'Adventure' },
  { key: 'food', label_ar: 'طعام', label_en: 'Food' }
]);

export const PLACE_CATEGORY_KEYS = Object.freeze(PLACE_CATEGORIES.map((category) => category.key));

const categoryByKey = new Map(PLACE_CATEGORIES.map((category) => [category.key, category]));

export function placeCategoryDefinition(key = '') {
  return categoryByKey.get(String(key)) || null;
}

export function placeCategoryLabel(key = '', lang = 'ar') {
  const definition = placeCategoryDefinition(key);
  if (!definition) throw new Error(`Unknown place category "${key}"`);
  return lang === 'en' ? definition.label_en : definition.label_ar;
}
