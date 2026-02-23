import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataPath = path.join(root, 'data', 'sample_clean.json');
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });

const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const buildAt = new Date().toISOString();

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EventLive MVP</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; margin: 24px; background:#0b1020; color:#e9eefc; }
    .meta { color:#9fb2db; margin-bottom:16px; }
    .row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
    input, select { padding:10px; border-radius:8px; border:1px solid #3b4f79; background:#111a33; color:#fff; }
    table { width:100%; border-collapse: collapse; background:#101a36; border-radius:12px; overflow:hidden; }
    th, td { padding:12px; border-bottom:1px solid #24335d; text-align:right; font-size:14px; }
    th { background:#1a2850; position:sticky; top:0; }
    tr:hover { background:#14224a; }
    .pill { padding:4px 8px; border-radius:999px; background:#24407f; font-size:12px; }
    .state { padding:4px 8px; border-radius:999px; font-size:12px; font-weight:700; }
    .state-now { background:#1f7a3f; }
    .state-next { background:#7a5a1f; }
    .state-ended { background:#5b5b5b; }
    .pager { margin-top:12px; display:flex; gap:8px; align-items:center; }
    button { padding:8px 12px; border-radius:8px; border:1px solid #3b4f79; background:#111a33; color:#fff; }
  </style>
</head>
<body>
  <h1>EventLive — نسخة MVP</h1>
  <div class="meta">آخر تحديث: <span id="buildAt">${buildAt}</span> | عدد السجلات: <span id="count"></span></div>

  <div class="row">
    <input id="search" placeholder="ابحث بالعنوان أو الموقع..." />
    <select id="category"><option value="">كل التصنيفات</option></select>
    <select id="status">
      <option value="">كل الحالات</option>
      <option value="scheduled">scheduled</option>
      <option value="live">live</option>
      <option value="completed">completed</option>
      <option value="cancelled">cancelled</option>
      <option value="draft">draft</option>
    </select>
  </div>

  <table>
    <thead>
      <tr>
        <th>العنوان</th><th>التصنيف</th><th>حالة الجلسة</th><th>الوقت</th><th>الموقع</th><th>السعر</th><th>المقاعد</th><th>الحالة</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
  <div class="pager">
    <button id="prevBtn">السابق</button>
    <span id="pageInfo"></span>
    <button id="nextBtn">التالي</button>
  </div>

  <script>
    const data = ${JSON.stringify(rows)};
    const tbody = document.getElementById('tbody');
    const search = document.getElementById('search');
    const category = document.getElementById('category');
    const status = document.getElementById('status');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    const pageSize = 50;
    let currentPage = 1;
    document.getElementById('count').textContent = data.length;

    [...new Set(data.map(r => r.category))].forEach(c => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; category.appendChild(o);
    });

    function fmtDate(iso){
      const d = new Date(iso);
      return d.toLocaleString('ar-SA', { dateStyle:'medium', timeStyle:'short' });
    }

    function sessionState(r){
      const now = Date.now();
      const start = new Date(r.start_at).getTime();
      const end = new Date(r.end_at).getTime();
      if (now >= start && now <= end) return { key: 'now', label: 'الآن' };
      if (now < start) return { key: 'next', label: 'التالي' };
      return { key: 'ended', label: 'منتهية' };
    }

    function stateWeight(key){
      if (key === 'now') return 0;
      if (key === 'next') return 1;
      return 2;
    }

    function render(){
      const q = search.value.trim().toLowerCase();
      const c = category.value;
      const s = status.value;
      const filtered = data.filter(r => {
        const matchQ = !q || r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q);
        const matchC = !c || r.category === c;
        const matchS = !s || r.status === s;
        return matchQ && matchC && matchS;
      }).sort((a,b) => {
        const sa = sessionState(a);
        const sb = sessionState(b);
        const w = stateWeight(sa.key) - stateWeight(sb.key);
        if (w !== 0) return w;
        return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
      });

      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const rows = filtered.slice(start, start + pageSize);

      tbody.innerHTML = rows.map(function(r){
        const st = sessionState(r);
        return '<tr>' +
          '<td>' + r.title + '</td>' +
          '<td><span class="pill">' + r.category + '</span></td>' +
          '<td><span class="state state-' + st.key + '">' + st.label + '</span></td>' +
          '<td>' + fmtDate(r.start_at) + ' → ' + fmtDate(r.end_at) + '</td>' +
          '<td>' + r.location + '</td>' +
          '<td>' + r.price_sar + ' ر.س</td>' +
          '<td>' + (r.available_seats ?? '-') + ' / ' + r.capacity + '</td>' +
          '<td>' + r.status + '</td>' +
        '</tr>';
      }).join('');
      document.getElementById('count').textContent = filtered.length;
      pageInfo.textContent = 'صفحة ' + currentPage + ' / ' + totalPages;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;
    }

    [search, category, status].forEach(el => el.addEventListener('input', function(){ currentPage = 1; render(); }));
    prevBtn.addEventListener('click', function(){ if (currentPage > 1) { currentPage--; render(); } });
    nextBtn.addEventListener('click', function(){ currentPage++; render(); });
    render();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');

const report = [
  '# EventLive Build Report',
  `- Built at: ${buildAt}`,
  `- Input records: ${rows.length}`,
  '- Output: dist/index.html'
].join('\n');
fs.writeFileSync(path.join(reportsDir, 'build-report.md'), report, 'utf8');
console.log(report);
