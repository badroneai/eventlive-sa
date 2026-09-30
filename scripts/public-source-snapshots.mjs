import fs from 'node:fs';
import path from 'node:path';

// These established public endpoints must follow their authoritative inputs,
// including a final source-ops refresh after the site build. Keep the original
// timestamps: copying a snapshot is not a new collection or publication.
export const PUBLIC_SOURCE_SNAPSHOTS = [
  ['data/source_run_state.json', 'source-run-state.json'],
  ['data/source_registry.json', 'source-registry.json'],
  ['reports/source-auto-publish-report.json', 'source-auto-publish-report.json'],
  ['reports/source-auto-publish-report.md', 'source-auto-publish-report.md']
];

export function syncPublicSourceSnapshots(root = process.cwd()) {
  for (const [input, output] of PUBLIC_SOURCE_SNAPSHOTS) {
    const source = path.join(root, input);
    const destination = path.join(root, 'dist', output);
    if (!fs.existsSync(source)) {
      // Partial fixture builds (and first-time installations) may not have
      // collection evidence yet. Never retain a stale cached endpoint or give
      // it a new timestamp; make the unavailable input explicit instead.
      fs.rmSync(destination, { force: true });
      console.warn(`PUBLIC_SOURCE_SNAPSHOT_UNAVAILABLE ${input}`);
      continue;
    }
    const content = fs.readFileSync(source);
    // Fail on malformed JSON rather than shipping an unreadable snapshot.
    if (input.endsWith('.json')) JSON.parse(content.toString('utf8'));
    fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
    fs.writeFileSync(destination, content);
  }
}
