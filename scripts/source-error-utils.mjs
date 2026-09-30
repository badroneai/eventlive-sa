// Keep collection reports useful without copying nested exception messages,
// stacks, request options, or proxy credentials into persisted source state.
export function sourceErrorMessage(error) {
  if (error == null) return '';
  const message = String(error?.message || error || 'source extraction failed')
    .split(/\r?\n/, 1)[0]
    .replace(/https?:\/\/[^\s<>"']+/gi, '[URL redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
  const codes = [];
  const seen = new Set();
  function visit(value, depth = 0) {
    if (!value || typeof value !== 'object' || seen.has(value) || depth > 4) return;
    seen.add(value);
    const code = String(value.code || '');
    // Only machine-readable codes are useful here. In particular, never copy
    // cause.message: it can include addresses, credentials, or request data.
    if (/^[A-Z][A-Z0-9_]{1,63}$/.test(code) && !codes.includes(code) && codes.length < 5) codes.push(code);
    visit(value.cause, depth + 1);
    if (Array.isArray(value.errors)) value.errors.slice(0, 8).forEach((cause) => visit(cause, depth + 1));
  }
  visit(error);
  return `${message}${codes.length ? ` [${codes.join(', ')}]` : ''}`;
}
