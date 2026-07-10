import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.join(__dirname, 'platinumlist-platform-radar.mjs');
const source = fs.readFileSync(scriptPath, 'utf8');

assert.match(source, /candidate-only/);
assert.match(source, /today/);
assert.match(source, /weekend/);
assert.match(source, /organizer-acquisition/);
assert.match(source, /city_network/);
assert.match(source, /Smart AI Search|AI Search/);
assert.match(source, /for-organisers/);
assert.match(source, /queue-it|queueit/i);
assert.match(source, /khobar\.platinumlist\.net\/ar\/calendar\/today/);
assert.match(source, /khobar\.platinumlist\.net\/ar\/business-events/);

console.log('TEST_OK platinumlist platform radar regression checks passed');
