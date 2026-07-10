const IMAGE_EXTENSION_PATTERN = /\.(?:jpg|jpeg|png|webp|avif|gif|svg)(?:$|[?#])/i;
const IMAGE_PATH_PATTERN = /\/(?:images?|media|uploads?|assets?|cdn|img|web\/image)\b/i;
const BAD_EXACT_SEGMENTS = new Set([
  'avatar',
  'arrow',
  'arrow-left',
  'arrow-right',
  'calendar',
  'favicon',
  'placeholder',
  'reject-shape',
  'spcommon',
  'unsupported',
  'vision-w'
]);

function assetParts(value = '') {
  const raw = String(value || '').trim();
  try {
    const url = new URL(raw, /^https?:\/\//i.test(raw) ? undefined : 'https://eventme.live/');
    const pathText = decodeURIComponent(url.pathname || '').toLowerCase();
    const searchText = decodeURIComponent(url.search || '').toLowerCase();
    const filename = pathText.split('/').filter(Boolean).pop() || '';
    const stem = filename.replace(/\.[a-z0-9]+$/i, '');
    const segments = pathText.split('/').filter(Boolean);
    return {
      raw: `${pathText}${searchText}`,
      pathText,
      filename,
      stem,
      segments
    };
  } catch {
    const text = raw.toLowerCase();
    const filename = text.split('/').filter(Boolean).pop() || text;
    const stem = filename.replace(/\.[a-z0-9]+$/i, '');
    return {
      raw: text,
      pathText: text,
      filename,
      stem,
      segments: text.split('/').filter(Boolean)
    };
  }
}

function tokenPattern(token) {
  return new RegExp(`(^|[-_.])${token}([-_.]|$)`, 'i');
}

function isGenericSiteAssetPath(pathText = '') {
  return /\/(?:themes?|assets|siteassets|_layouts|static|common|spcommon)\//i.test(pathText);
}

export function isRejectedImageAssetUrl(value = '') {
  const { raw, pathText, filename, stem, segments } = assetParts(value);
  if (!raw) return false;
  if (segments.some((segment) => BAD_EXACT_SEGMENTS.has(segment))) return true;
  if (BAD_EXACT_SEGMENTS.has(stem)) return true;
  if (/(^|[-_.])(?:unsupported|placeholder|reject-shape|vision-w|spcommon|default[-_.]?meta[-_.]?image|arrow(?:[-_.](?:left|right|up|down))?|chevron(?:[-_.](?:left|right|up|down))?)([-_.]|$)/i.test(stem)) return true;
  if (/^calendar(?:[-_.]?\d+)?$/i.test(stem)) return true;
  if (/chicon[-_.]?footer/i.test(stem)) return true;
  if (/^(?:m[-_.]?)?logo(?:[-_.](?:white|new|old|dark|light))?$/i.test(stem)) return true;
  if (/digitalportal[-_.]?logo/i.test(stem)) return true;
  if (/(?:safari[-_.]?pinned[-_.]?tab|pinned[-_.]?tab|mask[-_.]?icon)/i.test(stem)) return true;
  if (isGenericSiteAssetPath(pathText) && (tokenPattern('logo').test(stem) || tokenPattern('icon').test(stem))) return true;
  if (/^(?:icon|icons|favicon)$/i.test(stem)) return true;
  if (/\/(?:logo|icons?|favicon)\.(?:svg|png|jpg|jpeg|webp|gif|avif)(?:$|[?#])/i.test(pathText)) return true;
  return false;
}

export function isSourcePageLikeImageUrl(value = '') {
  const text = String(value || '').trim();
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    const url = new URL(text);
    const pathText = url.pathname || '';
    if (/\/web\/image\//i.test(pathText)) return false;
    if (IMAGE_EXTENSION_PATTERN.test(pathText + url.search)) return false;
    return /\/(?:events?|programs?|workshop|dashboard|node|pages?)\//i.test(pathText);
  } catch {
    return true;
  }
}

export function isLikelyImageAssetUrl(value = '') {
  const text = String(value || '').trim();
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    const url = new URL(text);
    if (/eventme\.live$/i.test(url.hostname)) return false;
    if (isRejectedImageAssetUrl(url.href)) return false;
    if (isSourcePageLikeImageUrl(url.href)) return false;
    const pathAndSearch = `${url.pathname}${url.search}`;
    if (IMAGE_EXTENSION_PATTERN.test(pathAndSearch)) return true;
    if (IMAGE_PATH_PATTERN.test(url.pathname)) return true;
    if (/alt=media/i.test(url.search)) return true;
    return false;
  } catch {
    return false;
  }
}
