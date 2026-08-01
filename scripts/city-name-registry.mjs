// Single source of truth for Saudi city display names: the English form used
// on event records, the canonical Arabic label, and the URL slug used under
// dist/cities/<slug>.html. Extracted from generate-site.mjs's formerly
// inline cityLabelMap/citySlugMap so any other script that needs city name
// resolution without pulling in the whole site generator (e.g.
// city-places-render.mjs, which needs a city's Arabic/English label for the
// "أبرز المعالم في X" heading) imports this instead of hand-copying the list
// — Gate Governance rule #3 (no duplication of sources of truth).
//
// generate-site.mjs's cityLabelMap/citySlugMap are derived from this array
// and must keep producing byte-identical Maps — do not reorder or rename
// entries without checking every consumer.
export const CITY_NAME_REGISTRY = Object.freeze([
  { en: 'Riyadh', ar: 'الرياض', slug: 'riyadh' },
  { en: 'Jeddah', ar: 'جدة', slug: 'jeddah' },
  { en: 'Makkah', ar: 'مكة', slug: 'makkah' },
  { en: 'Madinah', ar: 'المدينة المنورة', slug: 'madinah' },
  { en: 'Dammam', ar: 'الدمام', slug: 'dammam' },
  { en: 'Khobar', ar: 'الخبر', slug: 'khobar' },
  { en: 'Dhahran', ar: 'الظهران', slug: 'dhahran' },
  { en: 'AlUla', ar: 'العلا', slug: 'alula' },
  { en: 'Abha', ar: 'أبها', slug: 'abha' },
  { en: 'Aseer', ar: 'عسير', slug: 'aseer' },
  { en: 'Khamis Mushait', ar: 'خميس مشيط', slug: 'khamis-mushait' },
  { en: 'Buraydah', ar: 'بريدة', slug: 'buraydah' },
  { en: 'Taif', ar: 'الطائف', slug: 'taif' },
  { en: 'Tabuk', ar: 'تبوك', slug: 'tabuk' },
  { en: 'Hail', ar: 'حائل', slug: 'hail' },
  { en: 'Al Muzahimiyah', ar: 'المزاحمية', slug: 'al-muzahimiyah' },
  { en: 'Al Namas', ar: 'النماص', slug: 'al-namas' },
  { en: 'Jazan', ar: 'جازان', slug: 'jazan' },
  { en: 'Najran', ar: 'نجران', slug: 'najran' },
  { en: 'Al Baha', ar: 'الباحة', slug: 'al-baha' },
  { en: 'Sakaka', ar: 'سكاكا', slug: 'sakaka' },
  { en: 'Dumat Al Jandal', ar: 'دومة الجندل', slug: 'dumat-al-jandal' },
  { en: 'Arar', ar: 'عرعر', slug: 'arar' },
  { en: 'Rafha', ar: 'رفحاء', slug: 'rafha' },
  { en: 'Turaif', ar: 'طريف', slug: 'turaif' },
  { en: 'NEOM', ar: 'نيوم', slug: 'neom' },
  { en: 'Unaizah', ar: 'عنيزة', slug: 'unaizah' },
  { en: 'Rass', ar: 'الرس', slug: 'rass' },
  { en: 'Al Kharj', ar: 'الخرج', slug: 'al-kharj' },
  { en: 'Dawadmi', ar: 'الدوادمي', slug: 'dawadmi' },
  { en: 'Majmaah', ar: 'المجمعة', slug: 'majmaah' },
  { en: 'Shaqra', ar: 'شقراء', slug: 'shaqra' },
  { en: 'Hafar Al Batin', ar: 'حفر الباطن', slug: 'hafar-al-batin' },
  { en: 'Rabigh', ar: 'رابغ', slug: 'rabigh' },
  { en: 'Yanbu', ar: 'ينبع', slug: 'yanbu' },
  { en: 'Al Ahsa', ar: 'الأحساء', slug: 'al-ahsa' },
  { en: 'Thuwal', ar: 'ثول', slug: 'thuwal' },
  { en: 'Qatif', ar: 'القطيف', slug: 'qatif' },
  { en: 'Diriyah', ar: 'الدرعية', slug: 'diriyah' },
  // Al-Aflaj's live page slug is the Arabic filename (dist/cities/الافلاج.html)
  // because its source events carry the Arabic city string — the registry
  // mirrors site reality rather than inventing a latin slug with no page.
  { en: 'Al-Aflaj', ar: 'الأفلاج', slug: 'الافلاج' },
  { en: 'Jubail', ar: 'الجبيل', slug: 'jubail' },
  { en: 'Nationwide', ar: 'على مستوى المملكة', slug: 'nationwide' },
  { en: 'Global', ar: 'دولي', slug: 'global' },
  { en: 'Online', ar: 'عن بعد', slug: 'online' },
  // cityLabelMap-only entry (no slug: never used as a city page/facet key).
  { en: 'Saudi Arabia', ar: 'السعودية', slug: null }
]);

const byEnglish = new Map(CITY_NAME_REGISTRY.map((city) => [city.en, city]));
const bySlug = new Map(CITY_NAME_REGISTRY.filter((city) => city.slug).map((city) => [city.slug, city]));

export function cityByEnglishName(englishName) {
  return byEnglish.get(englishName) || null;
}

export function cityNameBySlug(slug) {
  return bySlug.get(slug) || null;
}
