import fs from 'node:fs';
import path from 'node:path';
import {
  loadContentTranslations,
  normalizeContentText,
  saveContentTranslations
} from './content-translation-cache.mjs';

// Merge reviewed translation batches into the persistent content-translation
// cache. Usage: node scripts/merge-content-translations.mjs <dir> [--method label]
// <dir> must contain the pending chunk files (chunk-*.json) and their
// translated outputs (chunk-*.out.json produced by the translation batch).

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
  console.error('Usage: node scripts/merge-content-translations.mjs <dir-with-chunk-and-out-files> [--method label]');
  process.exit(1);
}
const methodFlag = process.argv.indexOf('--method');
const method = methodFlag > -1 ? process.argv[methodFlag + 1] : 'llm-agent';

const cache = loadContentTranslations();
cache.entries = cache.entries || {};
const problems = [];
let merged = 0;
let skipped = 0;

for (const name of fs.readdirSync(dir).filter((file) => /^chunk-\d+\.json$/.test(file)).sort()) {
  const inputPath = path.join(dir, name);
  const outputPath = path.join(dir, name.replace(/\.json$/, '.out.json'));
  if (!fs.existsSync(outputPath)) {
    problems.push(`${name}: missing output file`);
    continue;
  }
  const inputs = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const outputs = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  for (const item of inputs) {
    const translated = normalizeContentText(outputs[item.key]);
    if (!translated) {
      problems.push(`${name}: ${item.key} has no translation`);
      skipped += 1;
      continue;
    }
    const hasTargetScript = item.target_lang === 'ar' ? /[ء-ي]/.test(translated) : /[A-Za-z]/.test(translated);
    if (!hasTargetScript) {
      problems.push(`${name}: ${item.key} output lacks ${item.target_lang} script (${translated.slice(0, 60)})`);
      skipped += 1;
      continue;
    }
    cache.entries[item.key] = {
      source: item.source,
      source_lang: item.source_lang,
      target_lang: item.target_lang,
      text: translated,
      method,
      translated_at: new Date().toISOString()
    };
    merged += 1;
  }
}

saveContentTranslations(cache);
console.log(`CONTENT_TRANSLATIONS_MERGED merged=${merged} skipped=${skipped} total_cache=${Object.keys(cache.entries).length}`);
if (problems.length) {
  console.log(`PROBLEMS (${problems.length}):`);
  for (const problem of problems.slice(0, 25)) console.log(`- ${problem}`);
}
