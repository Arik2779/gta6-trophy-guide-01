// GTA VI trophy guide & tracker: checklist saved in localStorage, export/import,
// kind + grade + search filters, a spoiler setting for story trophies, and a
// roadmap to the platinum built from the official trophy descriptions.
const EARNED_KEY = 'gta6-trophy-progress-v1';
const SETTINGS_KEY = 'gta6-trophy-settings-v1';

const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detail');
const progressText = document.getElementById('progressText');
const gradeText = document.getElementById('gradeText');
const progressBar = document.getElementById('progressBar');
const searchEl = document.getElementById('search');
const gradeSelect = document.getElementById('gradeSelect');
const spoilerToggle = document.getElementById('spoilerToggle');
const hideEarnedToggle = document.getElementById('hideEarnedToggle');
const hintEl = document.getElementById('listHint');

const [doc, roadmap] = await Promise.all([
  (await fetch('data/trophies.json')).json(),
  (await fetch('data/roadmap.json')).json(),
]);
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set();
try { earned = new Set(JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]').filter((n) => trophies.some((t) => t.name === n))); } catch { earned = new Set(); }
let settings = { spoiler: false, hideEarned: false };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }; } catch { /* keep defaults */ }
spoilerToggle.checked = settings.spoiler;
hideEarnedToggle.checked = settings.hideEarned;

let kind = 'all';
let selectedId = 28; // Positive Mental Attitude: the missable trophy, guide open by default.
const hashMatch = location.hash.match(/^#trophy-(\d+)$/);
if (hashMatch && byId.has(Number(hashMatch[1]))) selectedId = Number(hashMatch[1]);

function saveEarned() { localStorage.setItem(EARNED_KEY, JSON.stringify([...earned])); }
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function isHiddenFromSpoilers(t) { return settings.spoiler && t.kind === 'story' && !earned.has(t.name); }
function displayName(t) { return isHiddenFromSpoilers(t) ? 'Hidden story trophy' : t.name; }
function displayDesc(t) { return isHiddenFromSpoilers(t) ? 'Hidden until earned — tick it off to reveal the name and description.' : t.description; }

function renderProgress() {
  const perGrade = {};
  for (const t of trophies) if (earned.has(t.name)) perGrade[t.grade] = (perGrade[t.grade] ?? 0) + 1;
  progressText.textContent = `${earned.size} of ${trophies.length} earned — ${Math.round((earned.size / trophies.length) * 100)}% to the platinum`;
  gradeText.textContent = ['platinum', 'gold', 'silver', 'bronze'].map((g) => `${perGrade[g] ?? 0} ${g}`).join(' · ');
  progressBar.style.width = `${(earned.size / trophies.length) * 100}%`;
}

function trophyMatches(t) {
  if (kind === 'missable' && !t.missable) return false;
  if (kind === 'online') return false;
  if (kind !== 'all' && kind !== 'missable' && kind !== 'online' && t.kind !== kind) return false;
  if (gradeSelect.value !== 'all' && t.grade !== gradeSelect.value) return false;
  if (settings.hideEarned && earned.has(t.name)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
  return true;
}

function renderList() {
  listEl.replaceChildren();
  const shown = trophies.filter(trophyMatches);
  if (kind === 'online') {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No online trophies: all 55 GTA VI trophies are single-player and offline (PowerPyx, Push Square). Nothing here needs a network connection or another player.';
    listEl.append(li);
  }
  for (const t of shown) {
    const li = document.createElement('li');
    if (t.id === selectedId) li.classList.add('selected');
    if (earned.has(t.name)) li.classList.add('earned');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} earned`);
    box.addEventListener('click', (e) => e.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      saveEarned(); renderProgress(); renderList(); renderDetail();
    });
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'tname';
    name.textContent = displayName(t);
    const desc = document.createElement('div');
    desc.className = 'tdesc';
    desc.textContent = displayDesc(t);
    const meta = document.createElement('div');
    meta.className = 'tmeta';
    const chips = [`${t.grade}`, t.kind, t.hidden ? 'hidden' : 'visible'];
    if (t.missable) chips.push('missable');
    if (t.count) chips.push(`× ${t.count.toLocaleString('en-US')}`);
    chips.push(`roadmap ${t.stage}`);
    for (const c of chips) {
      const s = document.createElement('span');
      s.className = `chip ${c === t.grade ? t.grade : ''} ${c === 'missable' ? 'missable' : ''} ${c === 'hidden' ? 'hidden' : ''}`;
      s.textContent = c;
      meta.append(s);
    }
    body.append(name, desc, meta);
    const grade = document.createElement('div');
    grade.className = 'grade-big';
    grade.textContent = t.grade;
    li.append(box, body, grade);
    li.addEventListener('click', () => { selectedId = t.id; renderList(); renderDetail(); });
    listEl.append(li);
  }
  const earnedShown = shown.filter((t) => earned.has(t.name)).length;
  hintEl.textContent = kind === 'online'
    ? 'Filter: online — the game lists no online trophies.'
    : `Showing ${shown.length} of ${trophies.length} trophies${earnedShown ? ` · ${earnedShown} earned in this view` : ''}${settings.spoiler ? ' · story spoilers hidden' : ''}. Click a trophy to read its guide.`;
}

function renderDetail() {
  const t = byId.get(selectedId) ?? trophies[0];
  detailEl.replaceChildren();
  const h2 = document.createElement('h2');
  h2.textContent = displayName(t);
  detailEl.append(h2);
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = `Official: “${displayDesc(t)}” — ${t.grade}${t.hidden ? ' · hidden on PlayStation until earned' : ''}${t.count ? ` · tracker counts ${t.count.toLocaleString('en-US')}` : ''}`;
  detailEl.append(official);
  if (t.missable) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = '⚠ Possibly missable — the only trophy PowerPyx flags. Read the guide below before you pass Chapter 1.';
    detailEl.append(warn);
  }
  const stage = document.createElement('p');
  stage.textContent = `Roadmap step ${t.stage} · ${t.kind}${t.missable ? ' · missable' : ''}`;
  detailEl.append(stage);
  if (isHiddenFromSpoilers(t)) {
    const p = document.createElement('p');
    p.textContent = 'Spoilers are hidden. Tick this trophy off (or turn off “Hide story spoilers”) to reveal its guide.';
    detailEl.append(p);
    return;
  }
  const gh = document.createElement('h3');
  gh.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.className = 'guide';
  guide.textContent = t.guide;
  detailEl.append(gh, guide);
  const sh = document.createElement('h3');
  sh.textContent = 'Source';
  const src = document.createElement('p');
  src.className = 'source';
  const a = document.createElement('a');
  a.href = t.source.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = t.source.name;
  src.append(a, document.createTextNode(` — ${t.source.url}`));
  detailEl.append(sh, src);
}

function renderRoadmap() {
  const host = document.getElementById('roadmapContent');
  host.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'roadmap';
  const h2 = document.createElement('h2');
  h2.textContent = roadmap.title;
  const sum = document.createElement('p');
  sum.className = 'summary';
  sum.textContent = roadmap.summary;
  wrap.append(h2, sum);
  for (const step of roadmap.steps) {
    const s = document.createElement('section');
    s.className = 'step';
    const h3 = document.createElement('h3');
    h3.textContent = step.title;
    const p = document.createElement('p');
    p.textContent = step.body;
    s.append(h3, p);
    if (step.warning) {
      const w = document.createElement('p');
      w.className = 'warn';
      w.textContent = step.warning;
      s.append(w);
    }
    wrap.append(s);
  }
  const ch = document.createElement('h3');
  ch.textContent = 'Collectibles & counts — what each trophy needs';
  wrap.append(ch);
  const table = document.createElement('table');
  table.className = 'counts';
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  for (const h of ['What', 'Needed', 'Total in the game']) {
    const th = document.createElement('th');
    th.textContent = h;
    tr.append(th);
  }
  thead.append(tr);
  const tbody = document.createElement('tbody');
  for (const c of roadmap.collectibles) {
    const row = document.createElement('tr');
    for (const v of [c.name, c.need, c.total]) {
      const td = document.createElement('td');
      td.textContent = v;
      row.append(td);
    }
    tbody.append(row);
  }
  table.append(thead, tbody);
  wrap.append(table);
  const src = document.createElement('p');
  src.className = 'source';
  const a = document.createElement('a');
  a.href = roadmap.source.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = roadmap.source.name;
  src.append(document.createTextNode('Roadmap figures from '), a);
  wrap.append(src);
  host.append(wrap);
}

// Tabs.
const tabTracker = document.getElementById('tabTracker');
const tabRoadmap = document.getElementById('tabRoadmap');
function showTab(which) {
  const tracker = which === 'tracker';
  document.getElementById('trackerView').hidden = !tracker;
  document.getElementById('roadmapView').hidden = tracker;
  tabTracker.classList.toggle('active', tracker);
  tabRoadmap.classList.toggle('active', !tracker);
  tabTracker.removeAttribute('aria-current');
  tabRoadmap.removeAttribute('aria-current');
  (tracker ? tabTracker : tabRoadmap).setAttribute('aria-current', 'page');
  if (!tracker) renderRoadmap();
}
tabTracker.addEventListener('click', () => showTab('tracker'));
tabRoadmap.addEventListener('click', () => showTab('roadmap'));

// Filters.
document.getElementById('kindFilters').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-kind]');
  if (!b) return;
  kind = b.dataset.kind;
  for (const btn of document.querySelectorAll('#kindFilters button')) btn.classList.toggle('active', btn === b);
  renderList();
});
gradeSelect.addEventListener('change', renderList);
searchEl.addEventListener('input', renderList);
spoilerToggle.addEventListener('change', () => { settings.spoiler = spoilerToggle.checked; saveSettings(); renderList(); renderDetail(); });
hideEarnedToggle.addEventListener('change', () => { settings.hideEarned = hideEarnedToggle.checked; saveSettings(); renderList(); });

// Export / import / reset.
document.getElementById('exportBtn').addEventListener('click', () => {
  const payload = { game: 'Grand Theft Auto VI', platform: 'PlayStation 5', exportedAt: new Date().toISOString(), earned: [...earned] };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('importInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    earned = new Set(names.filter((n) => trophies.some((t) => t.name === n)));
    saveEarned(); renderProgress(); renderList(); renderDetail();
  } catch {
    hintEl.textContent = 'Import failed: that file is not a trophy-progress export from this guide.';
  }
  e.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!window.confirm('Clear all earned trophies?')) return;
  earned = new Set();
  saveEarned(); renderProgress(); renderList(); renderDetail();
});

renderProgress();
renderList();
renderDetail();
