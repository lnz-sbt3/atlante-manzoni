/* Stato condiviso e navigazione dell’applicazione. */

import { normalizeProps, matches } from './atlas.js';
import { initBoard } from './board.js';
import { initPanels } from './panels.js';
import { initAlbum } from './album.js';
import { initRail } from './rail.js';

export const APP = {
  items:    [],
  layout:   'luoghi',
  chars:    [],
  filter:   null,
  album:    null,
  item:     null,
  lightbox: false,
  origin:   null,
};

export const MAX_CHARS = 3;

export function set(changes) {
  Object.assign(APP, changes);
  document.body.dataset.layout = APP.layout;
  document.body.classList.toggle('has-item', !!APP.item);
  document.body.classList.toggle('has-album', !!APP.album);
  document.body.classList.toggle('has-filter', !!APP.filter);
  document.dispatchEvent(new CustomEvent('atlante:change', { detail: { keys: Object.keys(changes) } }));
}

export const ROMAN = ['Introduzione', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII',
  'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV',
  'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII'];

const CI_ORDER = ['CI_Introduzione', 'CI_Capitolo I', 'CI_Capitolo II', 'CI_Capitolo III',
  'CI_Capitolo IV', 'CI_Capitolo V', 'CI_Capitolo VI'];

export function isCI(p) {
  return (p.capitolo_testo ?? '').startsWith('CI_');
}

/* Posizioni: 0–38 per i Promessi sposi, 39–45 per la Colonna infame. */
export function chapterPos(p) {
  if (isCI(p)) { const i = CI_ORDER.indexOf(p.capitolo_testo); return i === -1 ? null : 39 + i; }
  return p.capitolo_num ?? null;
}

export function chapterShort(pos) {
  if (pos === null || pos === undefined) return '';
  if (pos >= 39) return pos === 39 ? 'CI, intr.' : `CI, ${ROMAN[pos - 39]}`;
  return pos === 0 ? 'Intr.' : `Cap. ${ROMAN[pos]}`;
}

export function isLit(p) {
  return !APP.filter || matches(p, APP.filter.type, APP.filter.value);
}

export function itemsOf(name) {
  return APP.items.filter(p => p.personaggi.includes(name));
}

export function deck() {
  let list = APP.items;
  if (APP.album) list = list.filter(p => p.localita === APP.album);
  else if (APP.layout === 'personaggi' && APP.chars.length) {
    list = list.filter(p => APP.chars.some(c => p.personaggi.includes(c)));
  }
  if (APP.filter) {
    const lit = list.filter(isLit);
    if (lit.length) list = lit;
  }
  return list;
}

export function openItem(p, originEl = null) {
  set({ item: p, origin: originEl?.getBoundingClientRect?.() ?? null, lightbox: false });
}

export function closeItem() {
  set({ item: null, lightbox: false, origin: null });
}

export function step(delta) {
  const list = deck();
  if (!list.length) return;
  const i = APP.item ? list.findIndex(p => p.id === APP.item.id) : -1;
  const next = list[((Math.max(i, 0) + delta) % list.length + list.length) % list.length];
  set({ item: next, origin: null });
}

export function setLayout(layout) {
  if (layout === APP.layout) return;
  set({ layout, album: null });
}

export function toggleChar(name) {
  let chars = APP.chars.includes(name) ? APP.chars.filter(c => c !== name) : [...APP.chars, name];
  if (chars.length > MAX_CHARS) chars = chars.slice(-MAX_CHARS);
  set({ chars, layout: 'personaggi', album: null });
}

export function applyFacet(type, value) {
  if (type === 'personaggio') {
    if (!APP.chars.includes(value)) toggleChar(value);
    else set({ layout: 'personaggi', album: null });
    set({ item: null, lightbox: false });
    return;
  }
  if (type === 'localita') { set({ album: value, item: null, lightbox: false, layout: 'luoghi' }); return; }
  if (type === 'capitolo') { set({ filter: { type, value }, layout: 'capitoli', album: null, item: null, lightbox: false }); return; }
  const same = APP.filter && APP.filter.type === type && APP.filter.value === value;
  set({ filter: same ? null : { type, value }, item: null, lightbox: false });
}

export function clearFilter() { set({ filter: null }); }

function pageNum(p) {
  const m = String(p.pagina ?? '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function wireKeys() {
  document.addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea')) return;
    if (e.key === 'Escape') {
      if (APP.lightbox) set({ lightbox: false });
      else if (APP.item) closeItem();
      else if (APP.album) set({ album: null });
      else if (APP.filter) clearFilter();
      return;
    }
    if (!APP.item || APP.lightbox) return;
    if (e.key === 'ArrowLeft')  step(-1);
    if (e.key === 'ArrowRight') step(+1);
  });
}

async function bootstrap() {
  try {
    const res = await fetch('data/atlante_manzoni.geojson');
    if (!res.ok) throw new Error(`GeoJSON non raggiungibile: ${res.status}`);
    const { features } = await res.json();
    const items = features.map(f => normalizeProps(f.properties));
    items.sort((a, b) => (isCI(a) - isCI(b)) || (pageNum(a) - pageNum(b)));
    items.forEach((p, i) => { p.n = i; });
    APP.items = items;

    initBoard();
    initPanels();
    initAlbum();
    initRail();
    wireKeys();
    set({ layout: 'luoghi' });
  } catch (err) {
    console.error('[Atlante Manzoni] Bootstrap fallito:', err);
    document.getElementById('board')?.insertAdjacentHTML('beforeend',
      '<p class="load-error">Le tavole non si sono caricate. Ricarica la pagina; se il problema resta, il file dei dati non è raggiungibile.</p>');
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
