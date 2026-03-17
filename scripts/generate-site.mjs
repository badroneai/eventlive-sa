import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configuredSource = process.env.EVENTLIVE_SOURCE_FILE;
const dataPath = configuredSource
  ? path.join(root, configuredSource)
  : path.join(root, 'data', 'demo_program.json');
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });

for (const stalePath of ['live-ops.html', 'alerts.html', 'incidents.html', 'ops', 'reports', '04-Incidents']) {
  fs.rmSync(path.join(distDir, stalePath), { recursive: true, force: true });
}

const document = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const program = document.program || {};
const sessions = Array.isArray(document.sessions) ? document.sessions : [];
const buildAt = new Date().toISOString();
const programTitle = program.program_title || 'برنامج الحدث';
const organizerName = program.organizer_name || 'الجهة المنظمة';
const organizerDisplayName = program.organizer_display_name || organizerName;
const logoText = program.logo_text || 'EL';
const primaryLabel = program.primary_label || 'البرنامج الرسمي';
const supportContact = program.support_contact || 'يرجى التواصل مع الجهة المنظمة';
const footerNote = program.footer_note || 'هذه الصفحة مخصصة للمشاركة السريعة مع الزوار.';
const venueLabel = program.venue || 'الموقع يحدد لاحقًا';
const cityLabel = program.city || 'المدينة غير محددة';
const safeProgramTitle = escapeHtml(programTitle);
const safeOrganizerDisplayName = escapeHtml(organizerDisplayName);
const safeLogoText = escapeHtml(logoText);
const safePrimaryLabel = escapeHtml(primaryLabel);
const safeSupportContact = escapeHtml(supportContact);
const safeFooterNote = escapeHtml(footerNote);
const safeVenueLabel = escapeHtml(venueLabel);
const safeCityLabel = escapeHtml(cityLabel);
const safeEventStart = escapeHtml(program.event_start || '-');
const safeEventEnd = escapeHtml(program.event_end || '-');
const safeUpdatedAt = escapeHtml(program.updated_at || '-');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDateLabel(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? String(iso ?? '-')
    : date.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
}

function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function getNextSession(rows, now = Date.now()) {
  return rows
    .filter((session) => new Date(session.start_at).getTime() > now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] || null;
}

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeProgramTitle} | ${safeOrganizerDisplayName}</title>
  <style>
    :root { --brand-accent:#7dd3fc; --brand-panel:#101a36; --brand-panel-soft:#0f1730; --brand-border:#24335d; --brand-text:#e9eefc; --brand-muted:#9fb2db; }
    body { font-family: Tahoma, Arial, sans-serif; margin: 24px; background:#0b1020; color:var(--brand-text); }
    .hero { margin-bottom: 20px; padding: 18px; border:1px solid #24335d; border-radius:16px; background:#101a36; }
    .hero-top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
    .brand-mark { display:inline-flex; align-items:center; justify-content:center; min-width:54px; min-height:54px; padding:0 14px; border-radius:14px; background:linear-gradient(135deg, #0b5cab, var(--brand-accent)); color:#08111f; font-weight:900; letter-spacing:.5px; }
    .eyebrow { color:var(--brand-accent); font-size:13px; margin-bottom:8px; }
    .hero-badge { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; background:rgba(125,211,252,.12); border:1px solid rgba(125,211,252,.25); color:var(--brand-accent); font-size:13px; }
    .hero h1 { margin:0 0 10px; font-size: 30px; }
    .hero p { margin: 0; color:#c4d2f3; line-height:1.8; }
    .program-meta { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:16px; }
    .meta-card { padding:12px; border-radius:12px; background:var(--brand-panel-soft); border:1px solid var(--brand-border); }
    .meta-label { color:#8ea7d6; font-size:12px; margin-bottom:4px; }
    .meta-value { font-weight:700; }
    .meta { color:#9fb2db; margin-bottom:16px; }
    .support-strip, .footer-note { margin-top:16px; padding:12px 14px; border-radius:12px; background:var(--brand-panel-soft); border:1px solid var(--brand-border); color:#c4d2f3; }
    .support-strip strong, .footer-note strong { color:var(--brand-accent); }
    .delivery-links { display:flex; gap:10px; flex-wrap:wrap; margin: 14px 0 18px; }
    .delivery-link { display:inline-flex; align-items:center; justify-content:center; padding:10px 14px; border-radius:999px; border:1px solid rgba(125,211,252,.25); background:rgba(125,211,252,.08); color:var(--brand-accent); text-decoration:none; font-size:13px; font-weight:700; }
    .row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
    input, select { padding:10px; border-radius:8px; border:1px solid #3b4f79; background:#111a33; color:#fff; min-height:40px; }
    table { width:100%; border-collapse: collapse; background:#101a36; border-radius:12px; overflow:hidden; }
    th, td { padding:12px; border-bottom:1px solid #24335d; text-align:right; font-size:14px; }
    th { background:#1a2850; position:sticky; top:0; z-index:1; }
    tr:hover { background:#14224a; }
    .pill { padding:4px 8px; border-radius:999px; background:#24407f; font-size:12px; }
    .state { padding:4px 8px; border-radius:999px; font-size:12px; font-weight:700; }
    .state-now { background:#0f8a4a; color:#fff; }
    .state-next { background:#a86d00; color:#fff; }
    .state-ended { background:#4b5563; color:#fff; }
    .legend { margin:10px 0 14px; font-size:13px; color:#c4d2f3; }
    .legend span { margin-left:8px; }
    .pager { margin-top:12px; display:flex; gap:8px; align-items:center; }
    button { padding:10px 14px; border-radius:8px; border:1px solid #3b4f79; background:#111a33; color:#fff; min-height:40px; }

    @media (max-width: 768px) {
      body { margin: 10px; }
      .hero { padding: 14px; }
      .hero h1 { font-size: 24px; }
      .program-meta { grid-template-columns: 1fr; }
      .row { position: sticky; top: 0; background:#0b1020; z-index: 2; padding-bottom:8px; }
      input, select, button { width: 100%; font-size: 14px; }
      .legend { font-size: 12px; }
      .meta { font-size: 12px; }

      table, thead, tbody, tr, td { display: block; width: 100%; }
      thead { display: none; }
      tr {
        margin-bottom: 10px;
        border: 1px solid #24335d;
        border-radius: 10px;
        background: #101a36;
        padding: 6px 8px;
      }
      td {
        border: none;
        border-bottom: 1px dashed #24335d;
        padding: 8px 6px;
        font-size: 13px;
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }
      td:last-child { border-bottom: none; }
      td::before {
        content: attr(data-label);
        color: #9fb2db;
        font-weight: 700;
        flex: 0 0 40%;
      }
      .pager { display:grid; grid-template-columns: 1fr 1fr; }
      #pageInfo { grid-column: 1 / -1; text-align:center; padding: 6px 0; }
    }
  </style>
</head>
<body>
  <section class="hero">
    <div class="hero-top">
      <div>
        <div class="eyebrow">EventLive | ${safeOrganizerDisplayName}</div>
        <div class="hero-badge">${safePrimaryLabel}</div>
      </div>
      <div class="brand-mark">${safeLogoText}</div>
    </div>
    <h1>${safeProgramTitle}</h1>
    <p>صفحة تفاعلية لبرنامج الجلسات تساعد الزوار على معرفة الجلسة الحالية، الجلسة التالية، والمتحدثين والقاعات خلال يوم الحدث.</p>
    <div class="program-meta">
      <div class="meta-card"><div class="meta-label">الجهة المنظمة</div><div class="meta-value">${safeOrganizerDisplayName}</div></div>
      <div class="meta-card"><div class="meta-label">الموقع</div><div class="meta-value">${safeVenueLabel}</div></div>
      <div class="meta-card"><div class="meta-label">المدينة</div><div class="meta-value">${safeCityLabel}</div></div>
      <div class="meta-card"><div class="meta-label">بداية الحدث</div><div class="meta-value">${safeEventStart}</div></div>
      <div class="meta-card"><div class="meta-label">نهاية الحدث</div><div class="meta-value">${safeEventEnd}</div></div>
      <div class="meta-card"><div class="meta-label">آخر تحديث للبرنامج</div><div class="meta-value">${safeUpdatedAt}</div></div>
    </div>
    <div class="support-strip"><strong>التواصل:</strong> ${safeSupportContact}</div>
  </section>
  <div class="meta">عدد الجلسات: <span id="count"></span> | Build: <span id="buildAt">${buildAt}</span></div>
  <div class="delivery-links">
    <a class="delivery-link" href="./share.html">Share Landing</a>
    <a class="delivery-link" href="./print.html">Print View</a>
    <a class="delivery-link" href="./current-delivery-manifest.md">Delivery Manifest</a>
    <a class="delivery-link" href="./handoff-notes.md">Handoff Notes</a>
    <a class="delivery-link" href="./current-release-bundle.json">Release Bundle</a>
    <a class="delivery-link" href="./archive-browser.html">Archive Browser</a>
  </div>

  <div class="row">
    <input id="search" placeholder="ابحث باسم الجلسة أو المتحدث أو القاعة..." />
    <select id="sessionType"><option value="">كل أنواع الجلسات</option></select>
    <select id="track"><option value="">كل المسارات</option></select>
    <select id="status">
      <option value="">كل الحالات</option>
      <option value="scheduled">scheduled</option>
      <option value="live">live</option>
      <option value="completed">completed</option>
      <option value="cancelled">cancelled</option>
      <option value="draft">draft</option>
    </select>
  </div>
  <div class="legend">
    <span><span class="state state-now">الآن</span></span>
    <span><span class="state state-next">التالي</span></span>
    <span><span class="state state-ended">منتهية</span></span>
  </div>

  <table>
    <thead>
      <tr>
        <th>الجلسة</th><th>اليوم</th><th>النوع</th><th>المسار</th><th>المتحدث</th><th>القاعة</th><th>الوقت</th><th>حالة الجلسة</th><th>الحالة</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
  <div class="pager">
    <button id="prevBtn">السابق</button>
    <span id="pageInfo"></span>
    <button id="nextBtn">التالي</button>
  </div>
  <div class="footer-note"><strong>ملاحظة:</strong> ${safeFooterNote}</div>

  <script>
    const data = ${serializeForInlineScript(sessions)};
    const tbody = document.getElementById('tbody');
    const search = document.getElementById('search');
    const sessionType = document.getElementById('sessionType');
    const track = document.getElementById('track');
    const status = document.getElementById('status');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    const pageSize = 50;
    let currentPage = 1;
    document.getElementById('count').textContent = data.length;

    [...new Set(data.map(r => r.session_type))].forEach(c => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; sessionType.appendChild(o);
    });
    [...new Set(data.map(r => r.track))].forEach(c => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; track.appendChild(o);
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

    function escapeHTML(value){
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function render(){
      const q = search.value.trim().toLowerCase();
      const selectedType = sessionType.value;
      const selectedTrack = track.value;
      const s = status.value;
      const filtered = data.filter(r => {
        const matchQ = !q ||
          r.session_title.toLowerCase().includes(q) ||
          r.speaker.toLowerCase().includes(q) ||
          r.room.toLowerCase().includes(q) ||
          r.track.toLowerCase().includes(q);
        const matchType = !selectedType || r.session_type === selectedType;
        const matchTrack = !selectedTrack || r.track === selectedTrack;
        const matchS = !s || r.status === s;
        return matchQ && matchType && matchTrack && matchS;
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
          '<td data-label="الجلسة">' + escapeHTML(r.session_title) + '</td>' +
          '<td data-label="اليوم">' + escapeHTML(r.day_label) + '</td>' +
          '<td data-label="النوع"><span class="pill">' + escapeHTML(r.session_type) + '</span></td>' +
          '<td data-label="المسار">' + escapeHTML(r.track) + '</td>' +
          '<td data-label="المتحدث">' + escapeHTML(r.speaker) + '</td>' +
          '<td data-label="القاعة">' + escapeHTML(r.room) + '</td>' +
          '<td data-label="الوقت">' + escapeHTML(fmtDate(r.start_at)) + ' → ' + escapeHTML(fmtDate(r.end_at)) + '</td>' +
          '<td data-label="حالة الجلسة"><span class="state state-' + st.key + '">' + st.label + '</span></td>' +
          '<td data-label="الحالة">' + escapeHTML(r.status) + '</td>' +
        '</tr>';
      }).join('');
      document.getElementById('count').textContent = filtered.length;
      pageInfo.textContent = 'صفحة ' + currentPage + ' / ' + totalPages;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;
    }

    [search, sessionType, track, status].forEach(el => el.addEventListener('input', function(){ currentPage = 1; render(); }));
    prevBtn.addEventListener('click', function(){ if (currentPage > 1) { currentPage--; render(); } });
    nextBtn.addEventListener('click', function(){ currentPage++; render(); });
    render();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');

const printRows = sessions.map((session) => `
  <tr>
    <td>${escapeHtml(session.day_label)}</td>
    <td>${escapeHtml(session.session_title)}</td>
    <td>${escapeHtml(session.track)}</td>
    <td>${escapeHtml(session.speaker)}</td>
    <td>${escapeHtml(session.room)}</td>
    <td>${escapeHtml(fmtDateLabel(session.start_at))}</td>
    <td>${escapeHtml(fmtDateLabel(session.end_at))}</td>
  </tr>
`).join('');

const printHtml = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(programTitle)} | Print View</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; margin: 24px; color: #111827; background: #ffffff; }
    .topbar { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:18px; }
    .badge { display:inline-flex; padding:6px 10px; border:1px solid #cbd5e1; border-radius:999px; font-size:12px; color:#0f172a; }
    .meta { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin: 16px 0; }
    .meta-card { border:1px solid #e2e8f0; border-radius:12px; padding:12px; background:#f8fafc; }
    .label { font-size:12px; color:#475569; margin-bottom:4px; }
    .value { font-weight:700; }
    .actions { margin: 0 0 18px; display:flex; gap:10px; flex-wrap:wrap; }
    .actions a, .actions button { padding:10px 14px; border-radius:999px; border:1px solid #cbd5e1; background:#ffffff; color:#0f172a; text-decoration:none; cursor:pointer; }
    table { width:100%; border-collapse: collapse; }
    th, td { border:1px solid #cbd5e1; padding:10px; text-align:right; vertical-align:top; }
    th { background:#e2e8f0; }
    .footer { margin-top: 18px; font-size: 12px; color:#475569; }
    @media print {
      .actions { display:none; }
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div>
      <div class="badge">${escapeHtml(primaryLabel)}</div>
      <h1>${escapeHtml(programTitle)}</h1>
      <div>${escapeHtml(organizerDisplayName)}</div>
    </div>
    <div>${escapeHtml(logoText)}</div>
  </div>
  <div class="actions">
    <a href="./index.html">العودة للبرنامج</a>
    <a href="./share.html">Share Landing</a>
    <a href="./current-delivery-manifest.md">Delivery Manifest</a>
    <a href="./handoff-notes.md">Handoff Notes</a>
    <a href="./current-release-bundle.json">Release Bundle</a>
    <a href="./share-kit.json">Share Kit</a>
    <a href="./archive-browser.html">Archive Browser</a>
    <button onclick="window.print()">طباعة</button>
  </div>
  <div class="meta">
    <div class="meta-card"><div class="label">الموقع</div><div class="value">${escapeHtml(venueLabel)}</div></div>
    <div class="meta-card"><div class="label">المدينة</div><div class="value">${escapeHtml(cityLabel)}</div></div>
    <div class="meta-card"><div class="label">بداية الحدث</div><div class="value">${escapeHtml(fmtDateLabel(program.event_start))}</div></div>
    <div class="meta-card"><div class="label">نهاية الحدث</div><div class="value">${escapeHtml(fmtDateLabel(program.event_end))}</div></div>
    <div class="meta-card"><div class="label">التواصل</div><div class="value">${escapeHtml(supportContact)}</div></div>
    <div class="meta-card"><div class="label">آخر تحديث</div><div class="value">${escapeHtml(fmtDateLabel(program.updated_at))}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>اليوم</th>
        <th>الجلسة</th>
        <th>المسار</th>
        <th>المتحدث</th>
        <th>القاعة</th>
        <th>البداية</th>
        <th>النهاية</th>
      </tr>
    </thead>
    <tbody>${printRows}</tbody>
  </table>
  <div class="footer">${escapeHtml(footerNote)}</div>
</body>
</html>`;
fs.writeFileSync(path.join(distDir, 'print.html'), printHtml, 'utf8');

const nextSession = getNextSession(sessions);
const shareHtml = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(programTitle)} | Share Landing</title>
  <style>
    body { font-family: Tahoma, Arial, sans-serif; margin: 24px; background:#0b1020; color:#e9eefc; }
    .wrap { max-width: 780px; margin: 0 auto; }
    .hero { background:#101a36; border:1px solid #24335d; border-radius:18px; padding:24px; }
    .badge { display:inline-flex; padding:8px 12px; border-radius:999px; background:rgba(125,211,252,.12); border:1px solid rgba(125,211,252,.25); color:#7dd3fc; font-size:13px; margin-bottom:12px; }
    .quick { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin:18px 0; }
    .card { background:#0f1730; border:1px solid #24335d; border-radius:14px; padding:14px; }
    .label { color:#9fb2db; font-size:12px; margin-bottom:6px; }
    .value { font-weight:700; }
    .links { display:flex; gap:10px; flex-wrap:wrap; margin-top:18px; }
    .links a { display:inline-flex; align-items:center; justify-content:center; padding:12px 14px; border-radius:999px; background:#7dd3fc; color:#08111f; text-decoration:none; font-weight:800; }
    .links a.secondary { background:#0f1730; color:#7dd3fc; border:1px solid #24335d; }
    .note { margin-top:18px; color:#c4d2f3; line-height:1.8; }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="badge">${escapeHtml(primaryLabel)}</div>
      <h1>${escapeHtml(programTitle)}</h1>
      <p>${escapeHtml(organizerDisplayName)} | ${escapeHtml(venueLabel)} | ${escapeHtml(cityLabel)}</p>
      <div class="quick">
        <div class="card"><div class="label">أقرب جلسة</div><div class="value">${escapeHtml(nextSession?.session_title || 'لا توجد جلسات قادمة')}</div></div>
        <div class="card"><div class="label">عدد الجلسات</div><div class="value">${sessions.length}</div></div>
        <div class="card"><div class="label">التواصل</div><div class="value">${escapeHtml(supportContact)}</div></div>
      </div>
      <div class="links">
        <a href="./index.html">فتح البرنامج الكامل</a>
        <a class="secondary" href="./print.html">نسخة الطباعة</a>
        <a class="secondary" href="./current-delivery-manifest.md">Delivery Manifest</a>
        <a class="secondary" href="./handoff-notes.md">Handoff Notes</a>
        <a class="secondary" href="./current-release-bundle.json">Release Bundle</a>
        <a class="secondary" href="./share-kit.json">Share Kit</a>
        <a class="secondary" href="./archive-browser.html">Archive Browser</a>
      </div>
      <div class="note">${escapeHtml(footerNote)}</div>
    </section>
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(distDir, 'share.html'), shareHtml, 'utf8');

const report = [
  '# EventLive Build Report',
  `- Built at: ${buildAt}`,
  `- Program title: ${programTitle}`,
  `- Organizer: ${organizerName}`,
  `- Organizer display: ${organizerDisplayName}`,
  `- Primary label: ${primaryLabel}`,
  `- Support contact: ${supportContact}`,
  `- Venue: ${venueLabel}`,
  `- City: ${cityLabel}`,
  `- Event start: ${program.event_start || 'n/a'}`,
  `- Event end: ${program.event_end || 'n/a'}`,
  `- Input sessions: ${sessions.length}`,
  '- Output: dist/index.html',
  '- Output: dist/print.html',
  '- Output: dist/share.html',
  '- Client-facing page only: yes',
  '- Internal ops pages excluded from dist build'
].join('\n');
fs.writeFileSync(path.join(reportsDir, 'build-report.md'), report, 'utf8');
console.log(report);
