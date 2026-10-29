import { APP, set, setLayout, toggleChar, applyFacet, clearFilter, deck, openItem, MAX_CHARS } from './main.js';
import { FACETS, TONES } from './atlas.js';

const CLOUD_TABS = [
  { type: 'tema',   label: 'Temi' },
  { type: 'luogo',  label: 'Luoghi del racconto' },
  { type: 'autore', label: 'Incisori' },
];

let cloudTab = 'tema';
let charQuery = '';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function counts(type) {
  const m = new Map();
  for (const p of APP.items) for (const v of FACETS[type].values(p)) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function wireTopbar() {
  document.querySelectorAll('[data-layout]').forEach(b => {
    b.addEventListener('click', () => setLayout(b.dataset.layout));
  });
  document.getElementById('btn-home')?.addEventListener('click', () => {
    set({ layout: 'luoghi', chars: [], filter: null, album: null, item: null, lightbox: false });
  });
  document.getElementById('btn-read')?.addEventListener('click', () => {
    const first = deck()[0];
    if (first) openItem(first);
  });
  const cloudBtn = document.getElementById('btn-cloud');
  cloudBtn?.addEventListener('click', () => {
    const cloud = document.getElementById('cloud');
    const open = cloud.hidden;
    cloud.hidden = !open;
    cloudBtn.setAttribute('aria-expanded', String(open));
    if (open) renderCloud();
  });
}

function syncTopbar() {
  document.querySelectorAll('[data-layout]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.layout === APP.layout));
  });
}

function renderChars() {
  const panel = document.getElementById('chars');
  panel.hidden = APP.layout !== 'personaggi';
  if (panel.hidden) return;

  const list = [...counts('personaggio')].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'));
  const q = charQuery.trim().toLowerCase();
  const shown = q ? list.filter(([name]) => name.toLowerCase().includes(q)) : list;

  const ul = document.getElementById('chars-list');
  ul.innerHTML = shown.map(([name, n]) => {
    const i = APP.chars.indexOf(name);
    return `<li><button class="char-row${i >= 0 ? ' is-on' : ''}" data-name="${esc(name)}" aria-pressed="${i >= 0}" ${i >= 0 ? `style="--tone:${TONES[i]}"` : ''}>
      <span class="char-mark" aria-hidden="true"></span>
      <span class="char-name">${esc(name)}</span>
      <span class="char-count">${n}</span>
    </button></li>`;
  }).join('') || `<li class="chars-none">Nessun personaggio con questo nome.</li>`;

  ul.querySelectorAll('.char-row').forEach(b => b.addEventListener('click', () => toggleChar(b.dataset.name)));

  const note = document.getElementById('chars-note');
  note.textContent = APP.chars.length
    ? `${APP.chars.length} di ${MAX_CHARS} personaggi a confronto. Tocca un nome per toglierlo.`
    : `Scegli fino a ${MAX_CHARS} personaggi: le loro tavole escono dai mucchi e si dispongono lungo un filo, nell'ordine del racconto.`;
}

function wireChars() {
  const input = document.getElementById('chars-search');
  input?.addEventListener('input', () => { charQuery = input.value; renderChars(); });
}

function renderCloud() {
  const cloud = document.getElementById('cloud');
  if (cloud.hidden) return;
  const tabs = document.getElementById('cloud-tabs');
  tabs.innerHTML = CLOUD_TABS.map(t =>
    `<button role="tab" data-tab="${t.type}" aria-selected="${t.type === cloudTab}">${t.label}</button>`).join('');
  tabs.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { cloudTab = b.dataset.tab; renderCloud(); }));

  const list = [...counts(cloudTab)].sort((a, b) => a[0].localeCompare(b[0], 'it'));
  const max = Math.max(...list.map(([, n]) => n));
  const words = document.getElementById('cloud-words');
  words.innerHTML = list.map(([v, n]) => {
    const size = 15 + Math.sqrt(n / max) * 19;
    const on = APP.filter?.type === cloudTab && APP.filter.value === v;
    return `<button class="word${on ? ' is-on' : ''}" data-value="${esc(v)}" aria-pressed="${on}" style="font-size:${size.toFixed(1)}px">${esc(v)}<sup>${n}</sup></button>`;
  }).join('');
  words.querySelectorAll('.word').forEach(b => b.addEventListener('click', () => applyFacet(cloudTab, b.dataset.value)));
}

function renderFilter() {
  const chip = document.getElementById('filter-chip');
  if (!APP.filter) { chip.hidden = true; return; }
  const n = APP.items.filter(p => FACETS[APP.filter.type].values(p).includes(APP.filter.value)).length;
  chip.innerHTML = `<span class="filter-type">${esc(FACETS[APP.filter.type].label)}</span>
    <span class="filter-value">${esc(APP.filter.value)}</span>
    <span class="filter-count">${n} ${n === 1 ? 'tavola' : 'tavole'}</span>
    <button class="filter-x" aria-label="Togli il filtro ${esc(APP.filter.value)}">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6"/></svg>
    </button>`;
  chip.querySelector('.filter-x').addEventListener('click', clearFilter);
  chip.hidden = false;
}

export function initPanels() {
  wireTopbar();
  wireChars();
  document.addEventListener('atlante:change', () => {
    syncTopbar();
    renderChars();
    renderCloud();
    renderFilter();
  });
}
