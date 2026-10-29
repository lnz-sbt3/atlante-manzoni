import { APP, chapterPos, ROMAN, deck, openItem, isLit } from './main.js';
import { TONES } from './atlas.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const Y = 24, PAD = 14;
const LABELED = new Set([1, 5, 10, 15, 20, 25, 30, 35, 38]);

let svgEl, tipEl, chapters = [], xs = [];

function el(tag, attrs, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
}

function xOf(pos, W) {
  const usable = W - PAD * 2, main = usable * 0.86, gap = usable * 0.035, ci = usable * 0.105;
  return pos <= 38 ? PAD + (pos / 38) * main : PAD + main + gap + ((pos - 39) / 6) * ci;
}

function render() {
  const W = Math.max(svgEl.getBoundingClientRect().width, 240);
  svgEl.setAttribute('viewBox', `0 0 ${W} 44`);
  svgEl.innerHTML = '';

  el('line', { class: 'rail-track', x1: PAD, x2: xOf(38, W), y1: Y, y2: Y }, svgEl);
  el('line', { class: 'rail-track rail-ci', x1: xOf(39, W) - 6, x2: W - PAD, y1: Y, y2: Y }, svgEl);
  el('text', { class: 'rail-section', x: xOf(39, W) - 6, y: 9 }, svgEl).textContent = 'Colonna infame';

  const cur = APP.item ? chapterPos(APP.item) : null;
  xs = [];
  for (const ch of chapters) {
    const x = xOf(ch.pos, W), n = ch.items.length;
    const g = el('g', { class: `rail-cap${n ? '' : ' is-empty'}`, transform: `translate(${x.toFixed(1)},${Y})` }, svgEl);
    if (n) {
      xs.push({ x, ch });
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${nameOf(ch)}: ${n} ${n === 1 ? 'tavola' : 'tavole'}. Apri la prima`);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChapter(ch); } });
      g.addEventListener('focus', () => tip(ch, x));
      g.addEventListener('blur', () => { tipEl.hidden = true; });
    }
    const lit = APP.filter ? ch.items.filter(isLit).length : null;
    g.classList.toggle('is-match', !!lit);
    g.classList.toggle('is-off', lit === 0 && n > 0);
    g.classList.toggle('is-current', ch.pos === cur);
    el('circle', { class: 'rail-dot', r: n === 0 ? 1.8 : n < 4 ? 3.4 : n < 8 ? 4.4 : 5.4 }, g);

    APP.chars.forEach((name, i) => {
      if (ch.items.some(p => p.personaggi.includes(name))) {
        el('rect', { class: 'rail-char', x: -3, y: 8 + i * 4, width: 6, height: 3, style: `fill:${TONES[i]}` }, g);
      }
    });
    if (LABELED.has(ch.pos)) el('text', { class: 'rail-num', y: -10, 'text-anchor': 'middle' }, g).textContent = ROMAN[ch.pos];
    if (n) {
      el('circle', { class: 'rail-hit', r: 10 }, g);
      g.addEventListener('mouseenter', () => tip(ch, x));
      g.addEventListener('mouseleave', () => { tipEl.hidden = true; });
    }
  }
}

function nameOf(ch) {
  return ch.pos >= 39 ? (ch.pos === 39 ? 'Colonna infame, introduzione' : `Colonna infame, capitolo ${ROMAN[ch.pos - 39]}`)
    : ch.pos === 0 ? 'Introduzione' : `Capitolo ${ROMAN[ch.pos]}`;
}

function openChapter(ch) {
  const first = deck().find(p => chapterPos(p) === ch.pos) ?? ch.items[0];
  openItem(first);
}

/* Seleziona il capitolo più vicino al punto di rilascio. */
function wireScrub() {
  let active = null;
  const nearest = e => {
    const r = svgEl.getBoundingClientRect(), x = e.clientX - r.left;
    return xs.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a), xs[0]);
  };
  svgEl.addEventListener('pointerdown', e => {
    if (!xs.length) return;
    svgEl.setPointerCapture(e.pointerId);
    active = nearest(e); tip(active.ch, active.x);
  });
  svgEl.addEventListener('pointermove', e => {
    if (!active) return;
    active = nearest(e); tip(active.ch, active.x);
  });
  svgEl.addEventListener('pointerup', () => {
    if (!active) return;
    tipEl.hidden = true;
    openChapter(active.ch);
    active = null;
  });
  svgEl.addEventListener('pointercancel', () => { active = null; tipEl.hidden = true; });
}

function tip(ch, x) {
  const r = svgEl.getBoundingClientRect();
  const name = nameOf(ch);
  const n = ch.items.length;
  tipEl.innerHTML = `<strong>${name}</strong><span>${n} ${n === 1 ? 'tavola' : 'tavole'}</span>`;
  tipEl.style.left = `${Math.round(r.left + x)}px`;
  tipEl.style.top = `${Math.round(r.top)}px`;
  tipEl.hidden = false;
}

export function initRail() {
  svgEl = document.getElementById('rail-svg');
  tipEl = document.getElementById('rail-tip');
  chapters = Array.from({ length: 46 }, (_, pos) => ({ pos, items: [] }));
  for (const p of APP.items) {
    const c = chapterPos(p);
    if (c !== null && chapters[c]) chapters[c].items.push(p);
  }
  render();
  wireScrub();
  document.addEventListener('atlante:change', render);
  new ResizeObserver(render).observe(svgEl);
}
