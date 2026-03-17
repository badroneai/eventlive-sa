import fs from 'node:fs/promises';
import path from 'node:path';

const dir = '04-Incidents';
const out = 'reports/incidents-index.json';

const files = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
const incidents = [];

for (const f of files) {
  if (!f.isFile() || !f.name.endsWith('.md') || !f.name.startsWith('INC-')) continue;
  const full = path.join(dir, f.name);
  const raw = await fs.readFile(full, 'utf8');
  const titleLine = raw.split(/\r?\n/).find((l) => l.startsWith('# ')) || f.name;
  const openedLine = raw.split(/\r?\n/).find((l) => l.toLowerCase().startsWith('opened at:')) || '';
  incidents.push({
    id: f.name.replace(/\.md$/, ''),
    title: titleLine.replace(/^#\s*/, '').trim(),
    opened_at: openedLine.replace(/^opened at:\s*/i, '').trim() || null,
    file: full.replace(/\\/g, '/')
  });
}

incidents.sort((a, b) => String(b.opened_at || '').localeCompare(String(a.opened_at || '')));

await fs.mkdir('reports', { recursive: true });
await fs.writeFile(out, JSON.stringify({ generated_at: new Date().toISOString(), count: incidents.length, incidents }, null, 2));
console.log(`INCIDENTS_INDEX_OK ${out} count=${incidents.length}`);
