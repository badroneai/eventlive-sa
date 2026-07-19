const normalizeCategoryValue = (value = '') => String(value)
  .normalize('NFKC')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase();

export const CATEGORY_TAXONOMY = Object.freeze([
  {
    key: 'exhibitions-conferences',
    label_ar: 'المعارض والمؤتمرات',
    label_en: 'Exhibitions & Conferences',
    aliases: [
      'Exhibitions & Conferences', 'exhibition', 'Exhibition / Families', 'conference', 'Forum', 'Summit',
      'venue event', 'مؤتمرات وملتقيات', 'auction', 'career fair', 'لقاء', 'لقاء حواري', 'ملتقى', 'منتدى',
      'مؤتمر', 'ندوة'
    ]
  },
  {
    key: 'family-entertainment',
    label_ar: 'الترفيه والعائلات',
    label_en: 'Entertainment & Family',
    aliases: [
      'family', 'entertainment', 'festival', 'Concerts & Shows / Families', 'Entertainment / Families',
      'Comedy Show / Families', 'Family & Kids', 'Festivals & Celebrations', 'entertainment families',
      'families', 'Immersive Experience', 'music', 'فعالية فوانيس'
    ]
  },
  {
    key: 'culture-arts',
    label_ar: 'الثقافة والفنون',
    label_en: 'Culture & Arts',
    aliases: [
      'culture', 'culture and arts', 'cultural initiative', 'performance', 'Culture & Community', 'Film',
      'Culture & History / Families', 'culture arts', 'architecture design festival', 'ثقافة وإبداع'
    ]
  },
  {
    key: 'education-training',
    label_ar: 'التعليم والتدريب',
    label_en: 'Education & Training',
    aliases: [
      'learning', 'skills program', 'education training', 'workshop', 'summer program', 'application deadline',
      'university event', 'Workshop, Explorers Thematic', 'academic event', 'training', 'Skills', 'دورة تدريبية',
      'ورش عمل', 'ورشة عمل'
    ]
  },
  {
    key: 'technology-innovation',
    label_ar: 'التقنية والابتكار',
    label_en: 'Technology & Innovation',
    aliases: [
      'technology training', 'banking and AI conference', 'enterprise AI conference', 'technology bootcamp',
      'bootcamp', 'technology', 'AI and data', 'gaming program', 'space', 'space education',
      'artificial intelligence', 'Digital Series',
      'الاتصالات وتقنية المعلومات', 'معسكر - أنظمة الشبكات', 'معسكر - الأمن السيبراني',
      'معسكر - الحوسبة السحابية', 'معسكر - تطوير البرمجيات والتطبيقات',
      'معسكر - علم البيانات والذكاء الاصطناعي', 'معسكر - هندسة البرمجيات',
      'معسكر - هندسة الميكاترونكس'
    ]
  },
  {
    key: 'sports-outdoors',
    label_ar: 'الرياضة والمغامرات',
    label_en: 'Sports & Outdoors',
    aliases: [
      'sports', 'Entertainment & Sports', 'sports and community', 'Sports / Families', 'Adventure / Families',
      'football match', 'sports championship'
    ]
  },
  {
    key: 'tourism-experiences',
    label_ar: 'السياحة والتجارب',
    label_en: 'Tourism & Experiences',
    aliases: ['tourism experience', 'destination event', 'outdoor experience', 'Saudi Seasons', 'tourism']
  },
  {
    key: 'business-entrepreneurship',
    label_ar: 'الأعمال وريادة الأعمال',
    label_en: 'Business & Entrepreneurship',
    aliases: [
      'entrepreneurship', 'business forum', 'chamber event', 'أسبوع الاعمال', 'ريادة أعمال', 'ريادة الأعمال',
      'Jeddah Chamber', 'business event', 'business gathering', 'business reception', 'Roadshow', 'اجتماع',
      'التوطين', 'وفد تجاري', 'Accelerator', 'AI entrepreneurship', 'incubator'
    ]
  },
  {
    key: 'health-regulation',
    label_ar: 'الصحة والتنظيم',
    label_en: 'Health & Regulation',
    aliases: ['regulatory workshop']
  },
  {
    key: 'community-occasions',
    label_ar: 'المجتمع والمناسبات',
    label_en: 'Community & Occasions',
    aliases: ['Public Holidays', 'national day', 'awards', 'community', 'حفل تدشين', 'حفل تكريم']
  }
].map((category) => Object.freeze({
  ...category,
  aliases: Object.freeze([...category.aliases])
})));

export const CATEGORY_KEYS = Object.freeze(CATEGORY_TAXONOMY.map((category) => category.key));

const categoryByKey = new Map(CATEGORY_TAXONOMY.map((category) => [category.key, category]));
const categoryByAlias = new Map();

for (const category of CATEGORY_TAXONOMY) {
  for (const alias of [category.key, category.label_ar, category.label_en, ...category.aliases]) {
    const normalized = normalizeCategoryValue(alias);
    const existing = categoryByAlias.get(normalized);
    if (existing && existing.key !== category.key) {
      throw new Error(`Category alias "${alias}" belongs to both ${existing.key} and ${category.key}`);
    }
    categoryByAlias.set(normalized, category);
  }
}

export const CATEGORY_EVENT_OVERRIDES = Object.freeze({
  'event-alula-arts-festival': 'culture-arts',
  'event-alula-wellness-festival': 'health-regulation',
  'event-ancient-kingdoms-festival': 'culture-arts',
  'event-bio-middle-east-biome': 'health-regulation',
  'event-immersive-experience-flying-over-saudi': 'tourism-experiences',
  'event-in-act-act-ix': 'family-entertainment',
  'event-in-act-act-x': 'family-entertainment',
  'event-kashtah': 'tourism-experiences',
  'event-on-this-carpet': 'education-training',
  'event-pfl-mena-final': 'sports-outdoors',
  'event-the-art-of-looking-at-art': 'education-training',
  'event-the-comeback': 'sports-outdoors',
  'event-who-lived-here': 'education-training',
  'event-join-us-at-kaust-health-for-respiratory-health-day': 'health-regulation',
  'event-ultra-gobi-alula': 'sports-outdoors',
  'event-ضحكات-الرياض': 'family-entertainment',
  'event-كايف-المزرعة': 'tourism-experiences',
  'event-منعً-في-لاحراج-عرض-ستاند-أب-كوميدي-من-عبدالرحمن-محمد-2': 'family-entertainment',
  'event-تيفو-فان-زون': 'sports-outdoors',
  'event-ليالي-المونديال': 'sports-outdoors',
  'event-jameel-library-summer-reading-challenge': 'education-training',
  'event-registration-for-international-research-competition-on-non-terrestrial-n': 'technology-innovation',
  'event-hayy-arts': 'culture-arts',
  'event-hayy-arts-red-wind-coral-worlds': 'culture-arts',
  'event-echoes-of-the-familiar': 'culture-arts',
  'event-tafasahu-make-room': 'culture-arts',
  'event-business-sector-annual-reception': 'business-entrepreneurship'
});

const LEGACY_CATEGORY_SLUGS = new Map([
  ['awards-ceremonies', 'community-occasions'],
  ['chamber-event', 'business-entrepreneurship'],
  ['conference-forum', 'exhibitions-conferences'],
  ['conferences-forums', 'exhibitions-conferences'],
  ['education-community', 'education-training'],
  ['entertainment-families', 'family-entertainment'],
  ['entrepreneurship', 'business-entrepreneurship'],
  ['exhibition-trade', 'exhibitions-conferences'],
  ['gaming-esports', 'technology-innovation'],
  ['general-events', 'community-occasions'],
  ['national-day', 'community-occasions'],
  ['regulatory-workshop', 'health-regulation'],
  ['science-space', 'technology-innovation'],
  ['sports', 'sports-outdoors'],
  ['sports-and-community', 'sports-outdoors'],
  ['sports-families', 'sports-outdoors'],
  ['technology-bootcamp', 'technology-innovation'],
  ['technology-training', 'technology-innovation']
]);

export function normalizeCategoryAlias(value = '') {
  return normalizeCategoryValue(value);
}

export function categoryDefinition(value, event = {}) {
  const overrideKey = CATEGORY_EVENT_OVERRIDES[event.id];
  if (overrideKey) return categoryByKey.get(overrideKey);
  return categoryByAlias.get(normalizeCategoryValue(value)) || null;
}

export function categoryDefinitionByKey(key = '') {
  return categoryByKey.get(String(key)) || null;
}

export function canonicalCategorySlug(value = '') {
  let decoded = String(value || '').trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Invalid percent-encoding cannot be a canonical category key.
  }
  return categoryByKey.has(decoded) ? decoded : (LEGACY_CATEGORY_SLUGS.get(decoded) || '');
}

export function normalizeEventCategory(event = {}, { strict = true } = {}) {
  const rawCategory = event.raw_category !== undefined && event.raw_category !== null
    ? String(event.raw_category)
    : String(event.category || '');
  const definition = categoryDefinition(rawCategory || event.category, event)
    || categoryDefinitionByKey(event.category);
  if (!definition) {
    if (!strict) return null;
    throw new Error(`Unknown category "${rawCategory || event.category || ''}" for event ${event.id || '(missing id)'}`);
  }
  return {
    ...event,
    raw_category: rawCategory,
    category: definition.key
  };
}

export function assignEventCategory(event, rawCategory = event.raw_category ?? event.category) {
  const normalized = normalizeEventCategory({
    ...event,
    category: rawCategory,
    raw_category: rawCategory
  });
  event.category = normalized.category;
  event.raw_category = normalized.raw_category;
  return event;
}

export function categoryLabels(value, event = {}) {
  const definition = categoryDefinition(value, event) || categoryDefinitionByKey(canonicalCategorySlug(value));
  return definition
    ? { ar: definition.label_ar, en: definition.label_en }
    : null;
}

function canonicalizeCategoryStatement(value, label) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/(تصنيف الفعالية في EventLive\s*:\s*)[^.\n]+(\.?)/giu, `$1${label}$2`)
    .replace(/^(\s*التصنيف\s*:\s*).+$/iu, `$1${label}`)
    .replace(/^(\s*category\s*:\s*).+$/iu, `$1${label}`);
}

export function normalizeEventCategoryMetadata(event = {}) {
  const normalized = normalizeEventCategory(event);
  event.category = normalized.category;
  event.raw_category = normalized.raw_category;
  const label = categoryLabels(event.category, event)?.ar;
  if (!label) throw new Error(`Missing category label for event ${event.id || '(missing id)'}`);

  if (Array.isArray(event.highlights)) {
    event.highlights = event.highlights.map((value) => canonicalizeCategoryStatement(value, label));
  }
  if (event.program_outline && typeof event.program_outline === 'object') {
    const outline = event.program_outline;
    if (typeof outline.official_description === 'string') {
      outline.official_description = canonicalizeCategoryStatement(outline.official_description, label);
    }
    if (Array.isArray(outline.features)) {
      outline.features = outline.features.map((value) => canonicalizeCategoryStatement(value, label));
    }
    if (outline.faqs && typeof outline.faqs === 'object' && !Array.isArray(outline.faqs) && 'category' in outline.faqs) {
      outline.faqs.category = label;
    }
  }
  for (const field of ['description', 'rich_summary']) {
    if (typeof event[field] === 'string') {
      event[field] = canonicalizeCategoryStatement(event[field], label);
    }
  }
  return event;
}
