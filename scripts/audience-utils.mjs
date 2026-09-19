export const AUDIENCE_TAXONOMY = [
  { slug: 'students', label_ar: 'طلاب وخريجون' },
  { slug: 'job-seekers', label_ar: 'باحثون عن عمل' },
  { slug: 'professionals', label_ar: 'موظفون ومهنيون' },
  { slug: 'tech', label_ar: 'تقنيون' },
  { slug: 'skilled-trades', label_ar: 'مهاريون وحرفيون' },
  { slug: 'entrepreneurs', label_ar: 'رواد أعمال' },
  { slug: 'researchers', label_ar: 'باحثون وأكاديميون' },
  { slug: 'families', label_ar: 'عائلات وأطفال' },
  { slug: 'women', label_ar: 'فعاليات نسائية' },
  { slug: 'creatives', label_ar: 'مبدعون وفنون' },
  { slug: 'sports', label_ar: 'رياضة ولياقة' },
  { slug: 'general', label_ar: 'عموم الجمهور' }
];

const AUDIENCE_SLUGS = new Set(AUDIENCE_TAXONOMY.map((audience) => audience.slug));

// JavaScript's \b is ASCII-only: it never fires next to an Arabic letter, so /\bفن\b/ matches
// nothing useful while plain /فن/ matches inside فندقية. An Arabic word here means: the stem,
// optionally carrying the clitic prefixes a Saudi source actually writes (ال، وال، بال، لل، و، ب،
// ل), and no OTHER Arabic letter on either side of it.
// \p{Script=Arabic}, not a \u0600-\u06FF range: that range swallows the Arabic comma (U+060C) and
// the other shared punctuation, so "والثقافة،" read as if a letter followed the word and the
// lookahead failed on every phrase that ends in a comma.
const AR_LETTER = '\\p{Script=Arabic}';
const AR_PREFIX = '(?:و?ال|بال|لل|و|ب|ل)?';
function arabicWord(stem, suffix = '') {
  return new RegExp(`(?<![${AR_LETTER}])${AR_PREFIX}${stem}${suffix}(?![${AR_LETTER}])`, 'u');
}


const ARABIC_DIACRITICS = /[\u064b-\u065f\u0670]/g;
const GENERIC_SOURCE_TAGS = new Set([
  'tourism',
  'culture',
  'sports',
  'entertainment',
  'destinations',
  'seasons',
  'experience-riyadh-season'
]);

export function normalizeAudienceText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}\s+#.-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function eventText(event = {}, options = {}) {
  const tags = Array.isArray(event.tags)
    ? event.tags.filter((tag) => !GENERIC_SOURCE_TAGS.has(normalizeAudienceText(tag).replace(/\s+/g, '-')))
    : [];
  const parts = [
    event.title,
    event.summary,
    event.description,
    event.category,
    event.source_label,
    event.source_owner,
    event.organizer,
    event.city,
    tags.join(' '),
    options.includeAudiences === true && Array.isArray(event.audiences) ? event.audiences.join(' ') : ''
  ];
  return normalizeAudienceText(parts.filter(Boolean).join(' '));
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

const RULES = [
  {
    slug: 'students',
    patterns: [
      /طلاب?/, /طالبات/, /خريج/, /جامعه/, /جامعي/, /تدريب تعاوني/,
      /bootcamp/, /معسكر/, /اكاديميه/, /trainee/, /traineeship/, /graduate/
    ]
  },
  {
    slug: 'job-seekers',
    patterns: [
      /توظيف/, /وظايف/, /وظائف/, /مهني/, /سيره ذاتيه/, /سوق العمل/,
      /career/, /job/, /employment/, /recruitment/, /wadaef/
    ]
  },
  {
    slug: 'professionals',
    patterns: [
      /موظف/, /مهني/, /قياده/, /اداره/, /شهاده مهنيه/, /قطاع/, /ملتقي/, /منتدي/,
      /conference/, /forum/, /summit/, /professional/, /leadership/, /cpd/
    ]
  },
  {
    slug: 'tech',
    patterns: [
      /تقنيه/, /تقني/, /برمج/, /ذكاء اصطناعي/, /الذكاء الاصطناعي/, /بيانات/,
      /سايبر/, /امن سيبراني/, /رقمي/, /تحول رقمي/, /هاكاثون/, /sdaia/, /mcit/,
      /tuwaiq/, /\bcode\b/, /\bai\b/, /\bdata\b/, /\bcyber\b/, /\bcloud\b/, /\bsoftware\b/, /\bprogramming\b/,
      /\bdigital\b/, /\bgenerative\b/
    ]
  },
  {
    slug: 'skilled-trades',
    patterns: [
      /حرف/, /حرفي/, /مهارات/, /مهاري/, /اشغال/, /تصنيع/, /لحام/, /كهرباء/,
      /ميكاترونكس/, /درون/, /صناعي/, /maintenance/, /manufacturing/, /skills/,
      /technical/, /equipment/
    ]
  },
  {
    slug: 'entrepreneurs',
    patterns: [
      /رياده/, /رواد/, /منشات/, /منشآت/, /مشاريع/, /استثمار/, /حاضنه/,
      /مسرعه/, /startup/, /entrepreneur/, /sme/, /venture/, /investment/,
      /biban/, /monshaat/
    ]
  },
  {
    slug: 'researchers',
    patterns: [
      /باحث/, /اكاديمي/, /علمي/, /ورقه بحثيه/, /ندوه/, /جامعه/, /kaust/,
      /research/, /academic/, /symposium/, /paper/, /science/
    ]
  },
  {
    slug: 'families',
    patterns: [
      /عائلي/, /عائلات/, /اطفال/, /طفل/, /ترفيه/, /موسم/, /مهرجان/,
      /kids/, /family/, /families/, /festival/, /season/, /entertainment/
    ]
  },
  {
    slug: 'women',
    patterns: [
      /نسائي/, /للسيدات/, /سيدات فقط/, /نساء فقط/, /للمراه/, /للمرأه/,
      /women only/, /female only/, /ladies/
    ]
  },
  {
    slug: 'creatives',
    // 2026-09-19: `/art/` had no word boundary and `/فن/` is two letters, so this rule fired on
    // "Sm-art Data & AI Summit", "Saudi AI Week" (artifici-al), "Cityscape Global" (sm-art),
    // "Web Summit" (st-art-up), "Quarter-Finals: FIFA" (qu-art-er), "Pool Party" (P-art-y), and
    // on a hotel-management diploma because الإدارة الفند-قية contains فن. Nineteen rows carried
    // the "creatives" audience with no art or culture signal anywhere in them, which puts a
    // robotics mission and an AI summit on the arts audience page.
    patterns: [
      // Written in the NORMALISED alphabet this module matches against: normalizeAudienceText
      // folds ة→ه, ى→ي, إأآا→ا and strips diacritics, so a pattern containing ة or إ can never fire.
      arabicWord('فن', '(?:ون|يه|ي|ين|ان|انين)?'), arabicWord('تصميم', '(?:ات)?'),
      arabicWord('سينما', '(?:ئي|ئيه)?'), arabicWord('مسرح', '(?:ي|يه|يات)?'),
      arabicWord('موسيق', '(?:ي|يه|يين)?'), arabicWord('ابداع', '(?:ي|يه)?'),
      arabicWord('ثقاف', '(?:ه|ي|يه)?'), arabicWord('ادب', '(?:ي|يه|اء)?'),
      arabicWord('حرف', '(?:ه|ي|يه|يين|يات)?'), /اثراء/, /معرض فني/,
      /\bart\b/, /\barts\b/, /artwork/, /artist/, /\bdesigns?\b/, /designer/, /cinema/, /theat(?:er|re)/, /\bmusic/,
      /\bcreative\b|\bcreatives\b|\bcreativity\b/, /\bculture\b/, /literature/, /ithra/, /mdlbeast/
    ]
  },
  {
    slug: 'sports',
    patterns: [
      /رياضه/, /رياضي/, /بطوله/, /دوري/, /مباراه/, /سباق جري/, /جري رياضي/, /سباق للجري/, /لياقه/, /ماراثون/,
      /\bsport\b/, /\bsports\b/, /league/, /\bcup\b/, /\bmatch\b/, /fitness/, /marathon/,
      /football/, /esports/
    ]
  }
];

export function audienceLabel(slug) {
  return AUDIENCE_TAXONOMY.find((audience) => audience.slug === slug)?.label_ar || 'عموم الجمهور';
}

export function normalizeAudiences(values = []) {
  const normalized = (Array.isArray(values) ? values : [])
    .map((value) => normalizeAudienceText(value).replace(/\s+/g, '-'))
    .filter((value) => AUDIENCE_SLUGS.has(value));
  return [...new Set(normalized)];
}

export function classifyAudiences(event = {}) {
  const explicit = normalizeAudiences(event.audiences);
  const text = eventText(event);
  const matches = RULES
    .filter((rule) => hasAny(text, rule.patterns))
    .map((rule) => rule.slug);
  const unique = [...new Set(matches)];
  if (explicit.length) {
    const protectedExplicit = new Set(['women']);
    const supported = explicit.filter((slug) => protectedExplicit.has(slug) || unique.includes(slug));
    return supported.length ? supported : explicit;
  }
  return unique.length ? unique : ['general'];
}

export function audienceObjects(slugs = []) {
  return normalizeAudiences(slugs).map((slug) => ({ slug, label: audienceLabel(slug) }));
}
