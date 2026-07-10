import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLocaleContext, localizedPath, supportedLocales, validateLocaleMessages } from './i18n-utils.mjs';

assert.deepEqual(supportedLocales(), ['ar-SA', 'en-SA']);
assert.deepEqual(validateLocaleMessages(), []);
assert.equal(localizedPath('events.html', 'ar-SA'), 'events.html');
assert.equal(localizedPath('events.html', 'en-SA'), 'en/events.html');

const ar = createLocaleContext('ar-SA');
const en = createLocaleContext('en-SA');
assert.equal(ar.dir, 'rtl');
assert.equal(en.dir, 'ltr');
assert.equal(en.t('event.startsIn', { duration: '2 hours' }), 'Starts in 2 hours');
assert.match(ar.formatNumber(1234), /١|۱/);
assert.match(en.formatNumber(1234), /1/);

const manifest = JSON.parse(fs.readFileSync('locales/manifest.json', 'utf8'));
assert.ok(manifest.futureLocales['zh-Hans'], 'future Chinese locale contract must remain declared');

console.log('TEST_OK i18n locale contract supports Arabic, English, and future locale registration');
