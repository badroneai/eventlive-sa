import assert from 'node:assert/strict';
import { parseJoufUniversitySummerProgram } from './collect-source-candidates.mjs';

const fixture = `
  <html lang="ar"><head>
    <meta name="description" content="برنامج صيفي لخدمة المجتمع"/>
    <meta property="og:image" content="https://ju.edu.sa/sites/default/files/2026-07/summer.webp"/>
  </head><body>
    <img src="/sites/default/files/styles/webp/public/2026-07/summer.jpg.webp?itok=small"/>
    <p>برعاية رئيس الجامعة، تطلق جامعة الجوف البرنامج الصيفي بجامعة الجوف 1447هـ - 2026م.</p>
    <p>ويستهدف البرنامج، الذي يمتد من شهر يوليو حتى نهاية أغسطس 2026م، أكثر من 16,000 مستفيد، من خلال أكثر من 50 برنامجًا وفعالية نوعية.</p>
    <p>ويأتي البرنامج ضمن توجه جامعة الجوف إلى تحويل الإجازة الصيفية إلى موسم أثر معرفي ومجتمعي.</p>
  </body></html>`;

const item = parseJoufUniversitySummerProgram(
  fixture,
  { owner: 'Jouf University' },
  'https://ju.edu.sa/ar/university-s-2026-summer-program',
  '2026-07-08'
);

assert.ok(item);
assert.equal(item.title, 'البرنامج الصيفي بجامعة الجوف 2026');
assert.equal(item.city, 'Sakaka');
assert.equal(item.starts_at, '2026-07-08T00:00:00+03:00');
assert.equal(item.ends_at, '2026-08-31T23:59:00+03:00');
assert.equal(item.category, 'summer program');
assert.equal(item.image_url, 'https://ju.edu.sa/sites/default/files/2026-07/summer.jpg.webp');

console.log('JOUF_UNIVERSITY_PROGRAM_EXTRACTOR_OK programs=1');
