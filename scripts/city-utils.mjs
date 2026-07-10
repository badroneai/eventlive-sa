const CITY_PATTERNS = [
  ['Diriyah', /diriyah|الدرعية|الدرعيه|jax district/i],
  ['Riyadh', /riyadh|الرياض|kingdom arena|boulevard/i],
  ['Jeddah', /jeddah|jiddah|جدة|جده/i],
  ['Makkah', /makkah|mecca|مكة|مكه/i],
  ['Madinah', /madinah|medina|المدينة|المدينه/i],
  ['Dammam', /dammam|الدمام/i],
  ['Khobar', /khobar|الخبر/i],
  ['Dhahran', /dhahran|الظهران|ithra/i],
  ['AlUla', /alula|al ula|العلا/i],
  ['Abha', /abha|أبها|ابها/i],
  ['Aseer', /aseer|asir|عسير/i],
  ['Khamis Mushait', /khamis|خميس مشيط/i],
  ['Buraydah', /buraydah|buraidah|بريدة|بريده|القصيم|qassim/i],
  ['Taif', /taif|الطائف/i],
  ['Tabuk', /tabuk|تبوك/i],
  ['Hail', /hail|حائل/i],
  ['Jazan', /jazan|جازان/i],
  ['Najran', /najran|نجران/i],
  ['Al Baha', /al baha|الباحة|الباحه/i],
  ['Sakaka', /sakaka|سكاكا/i],
  ['Dumat Al Jandal', /dumat al jandal|دومة الجندل|دومه الجندل/i],
  ['Arar', /\barar\b|عرعر/i],
  ['Rafha', /rafha|رفحاء/i],
  ['Turaif', /turaif|طريف/i],
  ['NEOM', /\bneom\b|نيوم/i],
  ['Unaizah', /unaizah|عنيزة|عنيزه/i],
  ['Rass', /\brass\b|الرس/i],
  ['Al Kharj', /al kharj|الخرج/i],
  ['Dawadmi', /dawadmi|الدوادمي/i],
  ['Majmaah', /majmaah|المجمعة|المجمعه/i],
  ['Shaqra', /shaqra|شقراء/i],
  ['Hafar Al Batin', /hafar al batin|حفر الباطن/i],
  ['Rabigh', /rabigh|رابغ/i],
  ['Yanbu', /yanbu|ينبع/i],
  ['Al Ahsa', /ahsa|hofuf|الأحساء|الاحساء|الهفوف/i],
  ['Jubail', /jubail|الجبيل/i],
  ['Nationwide', /nationwide|على مستوى المملكة|عموم المملكة|كل مناطق المملكة/i],
  ['Global', /global|international|lisbon|paris|vienna|davos|baku|bangalore|usa|france|azerbaijan|switzerland|portugal|india|النمسا|فرنسا|دولي/i]
];

export function normalizeSaudiCity(value = '', fallback = 'Saudi Arabia') {
  const text = String(value || '');
  if (/online|remote|عن بعد/i.test(text)) return 'Online';
  for (const [city, pattern] of CITY_PATTERNS) {
    if (pattern.test(text)) return city;
  }
  return fallback;
}

export function isPlaceholderCity(value = '') {
  return String(value || '').trim().toLowerCase() === 'saudi arabia';
}

export { CITY_PATTERNS };
