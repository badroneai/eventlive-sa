import fs from 'node:fs';
import path from 'node:path';
import { IntlMessageFormat } from 'intl-messageformat';

const root = process.cwd();
const localesDir = path.join(root, 'locales');
const manifest = JSON.parse(fs.readFileSync(path.join(localesDir, 'manifest.json'), 'utf8'));
const messages = new Map();

function readMessages(locale) {
  if (!messages.has(locale)) {
    messages.set(locale, JSON.parse(fs.readFileSync(path.join(localesDir, `${locale}.json`), 'utf8')));
  }
  return messages.get(locale);
}

export function localeDefinition(locale) {
  const definition = manifest.locales[locale];
  if (!definition) throw new Error(`Unsupported locale: ${locale}`);
  return { locale, ...definition };
}

export function supportedLocales() {
  return Object.keys(manifest.locales);
}

export function defaultLocale() {
  return manifest.defaultLocale;
}

export function localizedPath(relativePath = '', locale = manifest.defaultLocale) {
  const definition = localeDefinition(locale);
  const clean = String(relativePath || '').replace(/^\/+/, '');
  return definition.urlPrefix ? `${definition.urlPrefix}/${clean}` : clean;
}

export function createLocaleContext(locale) {
  const definition = localeDefinition(locale);
  const localeMessages = readMessages(locale);
  const fallbackMessages = readMessages(manifest.defaultLocale);
  const numberLocale = `${locale}-u-nu-${definition.numberingSystem}`;

  return {
    ...definition,
    t(key, values = {}) {
      const message = localeMessages[key] ?? fallbackMessages[key];
      if (message === undefined) throw new Error(`Missing message '${key}' for ${locale}`);
      return new IntlMessageFormat(message, locale).format(values);
    },
    formatDate(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat(numberLocale, { timeZone: 'Asia/Riyadh', ...options }).format(date);
    },
    formatNumber(value, options = {}) {
      return new Intl.NumberFormat(numberLocale, options).format(Number(value || 0));
    },
    formatRelative(value, unit) {
      return new Intl.RelativeTimeFormat(numberLocale, { numeric: 'auto' }).format(value, unit);
    },
    formatList(values = []) {
      return new Intl.ListFormat(numberLocale, { style: 'long', type: 'conjunction' }).format(values);
    },
    path(relativePath) {
      return localizedPath(relativePath, locale);
    }
  };
}

export function validateLocaleMessages() {
  const locales = supportedLocales();
  const baseline = new Set(Object.keys(readMessages(manifest.defaultLocale)));
  const findings = [];
  for (const locale of locales) {
    const localeKeys = new Set(Object.keys(readMessages(locale)));
    for (const key of baseline) if (!localeKeys.has(key)) findings.push(`${locale}: missing ${key}`);
    for (const key of localeKeys) if (!baseline.has(key)) findings.push(`${locale}: extra ${key}`);
  }
  return findings;
}

export { manifest };
