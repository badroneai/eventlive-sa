function normalizeImageUrl(url = '') {
  return String(url || '').trim().replace(/&amp;/g, '&');
}

export function isStillImage(url = '') {
  const cleaned = normalizeImageUrl(url).split('#')[0];
  if (/logo|sprite|icon|favicon|apple-touch|whatsapp|social|chat[-_]?icon|safari[-_]?pinned|pinned[-_]?tab|mask[-_]?icon/i.test(cleaned)) return false;
  return /\.(jpe?g|png|webp|avif)(\?|$)/i.test(cleaned) || /scene7\.com\/is\/image\//i.test(cleaned);
}

export function highResImage(url = '') {
  const cleaned = normalizeImageUrl(url);
  if (!cleaned) return '';
  if (/datocms-assets\.com/i.test(cleaned)) return `${cleaned.split('?')[0]}?auto=format&fit=max&w=2048&q=90`;
  if (/scene7\.com\/is\/image\//i.test(cleaned) && !/[?&](wid|hei|fmt)=/i.test(cleaned)) {
    return `${cleaned}${cleaned.includes('?') ? '&' : '?'}wid=1600&hei=900&fit=constrain&fmt=webp`;
  }
  try {
    return new URL(cleaned).href;
  } catch {
    return cleaned;
  }
}

export function imageQualityScore(url = '') {
  const cleaned = highResImage(url);
  if (!isStillImage(cleaned)) return -100;
  let score = 0;
  if (/^https?:\/\//i.test(cleaned)) score += 2;
  if (/\/(?:uploads?|media|images?)\//i.test(cleaned)) score += 3;
  if (/(?:1100x500|1400[-x_]650|1600x900|2048|wid=1[2-9]\d{2})/i.test(cleaned)) score += 8;
  if (/\/assets\/event-images\//i.test(cleaned)) score += 6;
  if (/\/assets\/event-covers\//i.test(cleaned)) score -= 2;
  return score;
}

export function preferredEventImage(pageImage = '', currentImage = '') {
  const page = highResImage(pageImage);
  const current = highResImage(currentImage);
  return imageQualityScore(page) > imageQualityScore(current) ? page : current;
}
