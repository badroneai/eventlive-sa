function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\u0022/g, '"')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/gi, '<')
    .replace(/\\u003e/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(decodeHtml(value));
    } catch {
      return null;
    }
  }
}

function balancedJsonAt(text, startIndex) {
  const opener = text[startIndex];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let quote = '';
  let escapeNext = false;
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (inString) {
      if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === opener) depth += 1;
    if (char === closer) depth -= 1;
    if (depth === 0) return text.slice(startIndex, index + 1);
  }
  return '';
}

export function walkEmbeddedObjects(value, visit) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) walkEmbeddedObjects(item, visit);
    return;
  }
  visit(value);
  for (const child of Object.values(value)) walkEmbeddedObjects(child, visit);
}

export function extractEmbeddedJsonObjects(html = '') {
  const text = String(html || '');
  const objects = [];
  const push = (value) => {
    const parsed = safeJsonParse(value);
    if (parsed) objects.push(parsed);
  };

  for (const match of text.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    push(match[1].trim());
  }

  const nextData = text.match(/<script id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (nextData) push(nextData.trim());

  const nuxtData = text.match(/window\.__NUXT__\s*=\s*([\s\S]*?)<\/script>/i)?.[1];
  if (nuxtData) {
    const start = nuxtData.search(/[{\[]/);
    if (start >= 0) push(balancedJsonAt(nuxtData, start));
  }

  for (const marker of ['window.__SERVER_DATA__', 'window.__INITIAL_STATE__', '__APOLLO_STATE__']) {
    const index = text.indexOf(marker);
    if (index < 0) continue;
    const start = text.slice(index).search(/[{\[]/);
    if (start >= 0) push(balancedJsonAt(text, index + start));
  }

  return objects;
}

export function objectHasDateSignals(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((key) => /date|time|start|end|calendar|event/i.test(key));
}
