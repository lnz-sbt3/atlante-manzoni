import { APP, set, openItem, isLit, chapterPos, ROMAN, isCI } from './main.js';
import { PLACES, MAP, WORLD, TONES } from './atlas.js';

const BASE = 100;
const SVG_NS = 'http://www.w3.org/2000/svg';

let boardEl, worldEl, cardsEl, labelsEl, threadsEl, tipEl;
const cards = new Map();
let lastPos = new Map();
const view = { k: 1, tx: 0, ty: 0 };
let fitBox = { x: 0, y: 0, w: WORLD.w, h: WORLD.h };
let suppressClick = false;

function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) / 4294967295;
}
const jitter = (key, amp) => (fnv(key) - 0.5) * 2 * amp;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svg(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

const byPlace = () => {
  const m = new Map(Object.keys(PLACES).map(k => [k, []]));
  for (const p of APP.items) m.get(p.localita)?.push(p);
  return m;
};

function buildMap() {
  const s = svg('svg', { class: 'map', viewBox: `0 0 ${WORLD.w} ${WORLD.h}`, width: WORLD.w, height: WORLD.h, 'aria-hidden': 'true' });
  const g = svg('g', {}, s);
  for (const d of MAP.lake) {
    svg('path', { class: 'map-lake-edge', d }, g);
    svg('path', { class: 'map-lake', d }, g);
  }
  for (const r of MAP.rivers) {
    svg('path', { class: 'map-river', d: r.d }, g);
    svg('text', { class: 'map-name', x: r.at[0], y: r.at[1] }, g).textContent = r.name;
  }
  MAP.roads.forEach((r, i) => {
    svg('path', { class: 'map-road', d: r.d, id: `map-road-${i}` }, g);
    const t = svg('text', { class: 'map-name map-name-small', dy: -7 }, g);
    const tp = svg('textPath', { href: `#map-road-${i}`, startOffset: '6%' }, t);
    tp.textContent = r.name;
  });
  for (const m of MAP.mountains) {
    svg('path', { class: 'map-mount', d: m.d }, g);
    svg('text', { class: 'map-name map-name-small', x: m.at[0], y: m.at[1], 'text-anchor': 'middle' }, g).textContent = m.name;
  }

  for (const [name, P] of Object.entries(PLACES)) {
    if (!P.far) continue;
    const c = svg('g', { class: 'map-cutout', transform: `rotate(-2.5 ${P.x} ${P.y + 30})` }, g);
    svg('rect', { class: 'map-cutout-paper', x: P.x - 125, y: P.y - 66, width: 250, height: 190, rx: 6 }, c);
    svg('rect', { class: 'map-tape', x: P.x - 140, y: P.y - 76, width: 54, height: 18, transform: `rotate(-32 ${P.x - 113} ${P.y - 67})` }, c);
    svg('rect', { class: 'map-tape', x: P.x + 86, y: P.y - 76, width: 54, height: 18, transform: `rotate(28 ${P.x + 113} ${P.y - 67})` }, c);
    svg('text', { class: 'map-name map-name-small', x: P.x, y: P.y + 112, 'text-anchor': 'middle' }, c).textContent = 'fuori mappa';
  }
  const w = MAP.walls;
  svg('circle', { class: 'map-walls', cx: w.cx, cy: w.cy, r: w.r }, g);
  svg('circle', { class: 'map-walls map-walls-inner', cx: w.cx, cy: w.cy, r: w.r - 7 }, g);
  svg('text', { class: 'map-note', x: 24, y: 36 }, g).textContent = MAP.note;
  worldEl.prepend(s);
}

function buildCards() {
  const frag = document.createDocumentFragment();
  for (const p of APP.items) {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.id = p.id;
    b.setAttribute('aria-label', `${p.titolo}. ${p.localita}. Apri la tavola`);
    b.innerHTML = `<span class="card-face"><img src="${esc(p.thumbnail_square)}" alt="" width="100" height="100" decoding="async" draggable="false"></span>`;
    b.addEventListener('click', e => {
      if (suppressClick) { e.preventDefault(); return; }
      openItem(p, b);
    });
    b.addEventListener('mouseenter', () => { if (b.dataset.place) fanPile(b.dataset.place, true); showTip(p, b); });
    b.addEventListener('mouseleave', e => {
      hideTip();
      const place = b.dataset.place;
      if (place && !e.relatedTarget?.closest?.(`.pile-hit, .card[data-place="${CSS.escape(place)}"]`)) fanPile(place, false);
    });
    b.addEventListener('focus', () => showTip(p, b));
    b.addEventListener('blur', hideTip);
    cards.set(p.id, b);
    frag.appendChild(b);
  }
  cardsEl.appendChild(frag);
}

/* Distribuzione deterministica delle carte con una spirale. */
function heap(list, cx, cy, S, zBase, extra = {}) {
  const m = list.length;
  const R = S * 0.2 + S * 0.075 * Math.sqrt(m);
  const seed = fnv(String(list[0]?.id ?? '')) * 6.283;
  const out = new Map();
  list.forEach((p, k) => {
    const rr = R * Math.sqrt((k + 0.5) / m), a = k * 2.39996 + seed;
    out.set(p.id, {
      x: cx + Math.cos(a) * rr * 1.25 + jitter(p.id + 'hx', 4),
      y: cy + Math.sin(a) * rr * 0.8 + jitter(p.id + 'hy', 4),
      s: S, r: jitter(p.id + 'hr', 16), z: zBase + (m - k), stacked: true, ...extra,
    });
  });
  return out;
}

function layoutLuoghi() {
  const pos = new Map(), labels = [];
  for (const [place, list] of byPlace()) {
    if (!list.length) continue;
    const { x: cx, y: cy } = PLACES[place];
    const n = list.length;
    const big = n > 40;
    const S = big ? 92 : n > 6 ? 82 : 76;

    const lit = APP.filter ? list.filter(isLit) : [];
    const want = Math.min(n, big ? 9 : n > 20 ? 7 : n > 6 ? 5 : n > 2 ? 3 : n);
    let top = lit.length ? lit.slice(0, Math.max(want, Math.min(lit.length, 12))) : [];
    if (!top.length) {
      const step = n / want;
      top = Array.from({ length: want }, (_, i) => list[Math.floor(i * step + step / 2)]);
    }
    const topIds = new Set(top.map(p => p.id));
    const base = list.filter(p => !topIds.has(p.id));

    for (const [id, q] of heap(base, cx, cy + S * 0.12, S, 0)) pos.set(id, q);
    const lift = S * 0.1;
    const spread = S * (big ? 0.36 : 0.3);
    top.forEach((p, i) => {
      const a = i * 2.39996 + fnv(place) * 6.283;
      const rho = spread * Math.sqrt(i);
      const mid = (top.length - 1) / 2, d = i - mid;
      pos.set(p.id, {
        x: cx + Math.cos(a) * rho * 1.3,
        y: cy - lift + Math.sin(a) * rho * 0.7,
        s: S, r: jitter(p.id + 'tr', 8), z: 500 + top.length - i, place,

        fan: { x: cx + d * S * 0.78, y: cy - lift - S * 0.25 + Math.abs(d) * Math.abs(d) * 3, r: d * 5 },
      });
    });

    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of list) {
      const q = pos.get(p.id), h = S * 0.56;
      x0 = Math.min(x0, q.x - h); x1 = Math.max(x1, q.x + h); y0 = Math.min(y0, q.y - h); y1 = Math.max(y1, q.y + h);
    }
    labels.push({
      kind: 'pile', place, n, lit: lit.length,
      x: (x0 + x1) / 2, y: y1 + 8,
      hit: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: Math.max(x1 - x0, y1 - y0) / 2 },
    });
  }
  return { pos, labels, box: { x: 0, y: 0, w: WORLD.w, h: WORLD.h } };
}

function layoutCapitoli() {
  const chapters = new Map();
  for (const p of APP.items) {
    const c = chapterPos(p);
    const key = c ?? 999;
    if (!chapters.has(key)) chapters.set(key, []);
    chapters.get(key).push(p);
  }
  const keys = [...chapters.keys()].sort((a, b) => a - b);

  const u = usable();
  const HW = Math.round(WORLD.w * Math.min(1.6, Math.max(0.45, u.height / Math.max(u.width, 1))));
  const M = 40, W = WORLD.w - 2 * M, H = HW - 2 * M;

  const flow = (S, rpb) => {
    const colW = S + 5, rowH = rpb * colW + 30, rows = [[]];
    let xCur = 0;
    for (const k of keys) {
      const bw = Math.ceil(chapters.get(k).length / rpb) * colW;
      if (xCur + bw > W && rows.at(-1).length) { rows.push([]); xCur = 0; }
      rows.at(-1).push({ k, bw, x: xCur }); xCur += bw + 22;
    }
    return { rows, fits: rows.length * rowH <= H };
  };
  let S = 30, rowsPerBlock = 7, rows = flow(30, 7).rows;
  search:
  for (let s = 96; s > 30; s -= 2) {
    for (let rpb = 3; rpb <= 7; rpb++) {
      const r = flow(s, rpb);
      if (r.fits) { S = s; rowsPerBlock = rpb; rows = r.rows; break search; }
    }
  }

  const pos = new Map(), labels = [];
  const g = 5, colW = S + g, rowH = rowsPerBlock * colW + 30;
  const top = M + (H - rows.length * rowH) / 2;
  rows.forEach((row, ri) => {
    const rowW = row.at(-1).x + row.at(-1).bw;
    const left = M + (W - rowW) / 2;
    row.forEach(({ k, x }) => {
      const list = chapters.get(k);
      const bx = left + x, by = top + ri * rowH + 26;
      labels.push({ kind: 'chapter', text: k === 999 ? 's.c.' : k >= 39 ? (k === 39 ? 'CI intr.' : `CI ${ROMAN[k - 39]}`) : (k === 0 ? 'Intr.' : ROMAN[k]), x: bx, y: by - 8, ci: k >= 39 });
      list.forEach((p, i) => {
        const col = Math.floor(i / rowsPerBlock), r = i % rowsPerBlock;
        pos.set(p.id, { x: bx + col * colW + S / 2, y: by + r * colW + S / 2, s: S, r: 0, z: 10 });
      });
    });
  });
  return { pos, labels, box: { x: 0, y: 0, w: WORLD.w, h: HW } };
}

function runsOf(name) {
  const runs = [];
  for (const p of APP.items) {
    if (!p.personaggi.includes(name)) continue;
    const last = runs.at(-1);
    if (last && last.place === p.localita) last.items.push(p); else runs.push({ place: p.localita, items: [p] });
  }
  return runs;
}

function layoutPersonaggi() {
  const base = layoutLuoghi();
  if (!APP.chars.length) return { ...base, empty: true };

  const pos = new Map(), labels = [], threads = [], piles = [], visited = new Set();
  const S = 62;
  const claimed = new Map();

  const overlap = (c) => piles.reduce((sum, o) => sum + Math.max(0, c.r + o.r + 18 - Math.hypot(c.x - o.x, c.y - o.y)), 0);

  APP.chars.forEach((name, ci) => {
    const tone = TONES[ci];
    const runs = runsOf(name);
    const way = [];
    runs.forEach((run, ri) => {
      visited.add(run.place);
      const own = run.items.filter(p => !claimed.has(p.id));
      if (!own.length) { way.push(claimed.get(run.items[0].id)); return; }

      const n = own.length;
      const T = Math.min(n, n > 8 ? 5 : n > 3 ? 4 : n);
      const heapR = n > T ? (S * 0.2 + S * 0.075 * Math.sqrt(n - T)) * 1.25 + S * 0.45 : 0;
      const r = Math.max(S * 0.62 + (T > 1 ? S * 0.32 * Math.sqrt(T) : 0), heapR);
      const A = PLACES[run.place];

      let best = { x: A.x, y: A.y, r }, score = overlap(best);
      for (let t = 1; t < 60 && score > 0; t++) {
        const a = t * 2.39996 + ci * 1.3, rad = 22 * Math.sqrt(t) * 1.9;
        const c = { x: A.x + Math.cos(a) * rad, y: A.y + Math.sin(a) * rad * 0.8, r };
        const sc = overlap(c) * 4 + rad * 0.6;
        if (sc < score) { best = c; score = sc; }
      }
      piles.push(best);
      const key = `run-${ci}-${ri}`;

      const step = n / T;
      const top = Array.from({ length: T }, (_, i) => own[Math.floor(i * step + step / 2)]);
      const topIds = new Set(top.map(p => p.id));
      const rest = own.filter(p => !topIds.has(p.id));
      for (const [id, q] of heap(rest, best.x, best.y + S * 0.12, S, 700)) pos.set(id, q);
      const lift = S * 0.1;
      top.forEach((p, i) => {
        const a = i * 2.39996 + ri, rho = S * 0.32 * Math.sqrt(i);
        const mid = (T - 1) / 2, d = i - mid;
        pos.set(p.id, {
          x: best.x + Math.cos(a) * rho * 1.3, y: best.y - lift + Math.sin(a) * rho * 0.7,
          s: S, r: jitter(p.id + 'tr', 7), z: 900 + T - i, tone, place: key,
          fan: { x: best.x + d * S * 0.8, y: best.y - lift - S * 0.2 + d * d * 3, r: d * 5 },
        });
      });
      own.forEach(p => claimed.set(p.id, { x: best.x, y: best.y - lift / 2 }));
      way.push({ x: best.x, y: best.y - lift / 2 });

      labels.push({
        kind: 'cluster', key, text: run.place, n, step: ri + 1, tone,
        x: best.x, y: best.y + r * 0.55 + 6, first: own[0],
        hit: { x: best.x, y: best.y - lift / 2, r: r * 0.8 },
      });
    });
    threads.push({ tone, name, way });
  });

  for (const [id, b] of base.pos) {
    if (!pos.has(id)) pos.set(id, { ...b, s: b.s * 0.72, dim: true, fan: null });
  }
  const pileLabels = base.labels.filter(l => !visited.has(l.place)).map(l => ({ ...l, dim: true }));
  return { pos, labels: [...pileLabels, ...labels], threads, box: { x: 0, y: 0, w: WORLD.w, h: WORLD.h } };
}

function render(animate = true) {
  const L = APP.layout === 'capitoli' ? layoutCapitoli() : APP.layout === 'personaggi' ? layoutPersonaggi() : layoutLuoghi();
  boardEl.classList.toggle('is-empty-chars', !!L.empty);
  fitBox = L.threads?.length ? contentBox(L.pos) : L.box;

  APP.items.forEach(p => {
    const el = cards.get(p.id), q = L.pos.get(p.id);
    if (!el || !q) return;
    const prev = lastPos.get(p.id);
    const moved = !prev || prev.x !== q.x || prev.y !== q.y || prev.s !== q.s;
    el.style.transitionDelay = animate && moved ? `${Math.min(p.n * 2.2, 420)}ms` : '0ms';
    place(el, q);
    el.style.zIndex = q.z;
    el.style.setProperty('--s', q.s);
    el.dataset.place = q.fan ? q.place : '';
    el.classList.toggle('is-stacked', !!q.stacked);
    el.classList.toggle('is-dim', !!q.dim);
    el.classList.toggle('is-off', !isLit(p) && !q.dim);
    el.classList.toggle('is-current', APP.item?.id === p.id);
    el.style.setProperty('--tone', q.tone ?? 'transparent');
    el.classList.toggle('has-tone', !!q.tone);
    el.tabIndex = q.stacked || q.dim ? -1 : 0;
    lastPos.set(p.id, q);
  });

  renderLabels(L.labels);
  renderThreads(L.threads ?? []);
  boardEl.classList.toggle('no-anim', !animate);
}

function place(el, q) {
  el.style.transform = `translate(${(q.x - BASE / 2).toFixed(1)}px, ${(q.y - BASE / 2).toFixed(1)}px) rotate(${q.r.toFixed(2)}deg) scale(${(q.s / BASE).toFixed(3)})`;
}

function fanPile(name, open) {
  cardsEl.querySelectorAll(`.card[data-place="${CSS.escape(name)}"]`).forEach(el => {
    const q = lastPos.get(Number(el.dataset.id));
    if (!q?.fan) return;
    el.style.transitionDelay = '0ms';
    place(el, open ? { ...q, ...q.fan } : q);
    el.classList.toggle('is-fanned', open);
  });
}

function contentBox(pos) {
  let x0 = 0, y0 = 0, x1 = WORLD.w, y1 = WORLD.h;
  for (const q of pos.values()) {
    if (q.dim) continue;
    x0 = Math.min(x0, q.x - q.s); y0 = Math.min(y0, q.y - q.s - 30);
    x1 = Math.max(x1, q.x + q.s); y1 = Math.max(y1, q.y + q.s);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function renderLabels(list) {
  labelsEl.innerHTML = '';
  cardsEl.querySelectorAll('.pile-hit').forEach(h => h.remove());
  for (const l of list) {
    if (l.kind === 'pile') {
      /* Mantiene l’area interattiva fra i livelli delle carte. */
      const hit = document.createElement('button');
      hit.className = `pile-hit${l.dim ? ' is-dim' : ''}`;
      hit.tabIndex = -1;
      hit.setAttribute('aria-hidden', 'true');
      hit.style.cssText = `left:${l.hit.x - l.hit.r}px;top:${l.hit.y - l.hit.r}px;width:${l.hit.r * 2}px;height:${l.hit.r * 2}px`;
      hit.addEventListener('click', () => { if (!suppressClick) set({ album: l.place, item: null }); });
      hit.addEventListener('mouseenter', () => fanPile(l.place, true));
      hit.addEventListener('mouseleave', e => { if (!e.relatedTarget?.closest?.(`.card[data-place="${CSS.escape(l.place)}"]`)) fanPile(l.place, false); });
      cardsEl.appendChild(hit);

      const b = document.createElement('button');
      b.className = `pile-label${l.dim ? ' is-dim' : ''}${PLACES[l.place].far ? ' is-far' : ''}`;
      b.style.left = `${l.x}px`; b.style.top = `${l.y}px`;
      const count = APP.filter ? `${l.lit} / ${l.n}` : l.n;
      b.innerHTML = `<span class="pile-name">${esc(l.place)}</span><span class="pile-count">${count}</span>`;
      b.setAttribute('aria-label', `${l.place}: ${l.n} ${l.n === 1 ? 'tavola' : 'tavole'}${APP.filter ? `, ${l.lit} nel filtro` : ''}. Apri l'album`);
      b.addEventListener('click', () => { if (!suppressClick) set({ album: l.place, item: null }); });
      labelsEl.appendChild(b);
    } else if (l.kind === 'chapter') {
      const s = document.createElement('span');
      s.className = `chapter-label${l.ci ? ' is-ci' : ''}`;
      s.style.left = `${l.x}px`; s.style.top = `${l.y}px`;
      s.textContent = l.text;
      labelsEl.appendChild(s);
    } else if (l.kind === 'cluster') {
      const hit = document.createElement('button');
      hit.className = 'pile-hit';
      hit.tabIndex = -1;
      hit.setAttribute('aria-hidden', 'true');
      hit.style.cssText = `left:${l.hit.x - l.hit.r}px;top:${l.hit.y - l.hit.r}px;width:${l.hit.r * 2}px;height:${l.hit.r * 2}px;z-index:850`;
      hit.addEventListener('click', () => { if (!suppressClick) openItem(l.first); });
      hit.addEventListener('mouseenter', () => fanPile(l.key, true));
      hit.addEventListener('mouseleave', e => { if (!e.relatedTarget?.closest?.(`.card[data-place="${l.key}"]`)) fanPile(l.key, false); });
      cardsEl.appendChild(hit);

      const s = document.createElement('button');
      s.className = 'cluster-label';
      s.style.left = `${l.x}px`; s.style.top = `${l.y}px`;
      s.style.setProperty('--tone', l.tone);
      s.innerHTML = `<b>${l.step}</b>${esc(l.text)}<span class="cluster-count">${l.n}</span>`;
      s.setAttribute('aria-label', `Tappa ${l.step}: ${l.text}, ${l.n} ${l.n === 1 ? 'tavola' : 'tavole'}. Apri la prima`);
      s.addEventListener('click', () => { if (!suppressClick) openItem(l.first); });
      labelsEl.appendChild(s);
    }
  }
}

function renderThreads(threads) {
  threadsEl.innerHTML = '';
  for (const t of threads) {
    const stops = t.way.filter(Boolean);
    if (stops.length < 2) continue;
    const pts = [stops[0]];
    for (let i = 1; i < stops.length; i++) {
      const p0 = stops[i - 1], p1 = stops[i];
      const dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy);
      if (len > 60) {
        const bend = Math.min(90, len * 0.16) * (i % 2 ? 1 : -1);
        pts.push({ x: (p0.x + p1.x) / 2 - dy / len * bend, y: (p0.y + p1.y) / 2 + dx / len * bend });
      }
      pts.push(p1);
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
      const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    svg('path', { class: 'thread-halo', d }, threadsEl);
    const path = svg('path', { class: 'thread', d, style: `--tone:${t.tone}` }, threadsEl);
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
  }
}

function usable() {
  const r = boardEl.getBoundingClientRect();
  const side = APP.layout === 'personaggi' && r.width >= 760 ? 332 : 0;
  return { left: side, width: r.width - side, height: r.height, full: r };
}

function kMin() {
  const u = usable();
  return Math.min(u.width / fitBox.w, u.height / fitBox.h) * 0.96;
}

function applyView(animate = false) {
  worldEl.classList.toggle('is-gliding', animate);
  worldEl.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`;
  worldEl.style.setProperty('--k', view.k.toFixed(4));
}

export function fit(animate = true) {
  const u = usable();
  const k = kMin();
  const narrow = u.width < 700;
  view.k = narrow ? Math.max(k, 0.47) : k;
  const focus = narrow && APP.layout === 'luoghi' ? { x: 520, y: 560 } : { x: fitBox.x + fitBox.w / 2, y: fitBox.y + fitBox.h / 2 };
  view.tx = u.left + u.width / 2 - focus.x * view.k;
  view.ty = u.height / 2 - focus.y * view.k;
  applyView(animate);
}

function zoomAt(factor, cx, cy, animate = false) {
  const k = Math.min(Math.max(view.k * factor, kMin() * 0.9), 3.4);
  view.tx = cx - (cx - view.tx) * (k / view.k);
  view.ty = cy - (cy - view.ty) * (k / view.k);
  view.k = k;
  applyView(animate);
}

function wirePanZoom() {
  const pointers = new Map();
  let start = null, pinch = null;

  boardEl.addEventListener('wheel', e => {
    e.preventDefault();
    const r = boardEl.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  boardEl.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { start = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false }; suppressClick = false; }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k };
    }
  });

  window.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const r = boardEl.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((pinch.k * d / pinch.d) / view.k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      suppressClick = true;
      return;
    }
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    start.moved = true; suppressClick = true;
    boardEl.classList.add('is-dragging');
    view.tx = start.tx + dx; view.ty = start.ty + dy;
    applyView(false);
  });

  const end = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) {
      boardEl.classList.remove('is-dragging');
      start = null;
      setTimeout(() => { suppressClick = false; }, 0);
    }
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  document.getElementById('zoom-in')?.addEventListener('click', () => {
    const r = boardEl.getBoundingClientRect(); zoomAt(1.4, r.width / 2, r.height / 2, true);
  });
  document.getElementById('zoom-out')?.addEventListener('click', () => {
    const r = boardEl.getBoundingClientRect(); zoomAt(1 / 1.4, r.width / 2, r.height / 2, true);
  });
  document.getElementById('zoom-fit')?.addEventListener('click', () => fit(true));
}

function showTip(p, el) {
  if (el.classList.contains('is-stacked')) return;
  const r = el.getBoundingClientRect(), host = boardEl.getBoundingClientRect();
  const cap = chapterPos(p);
  tipEl.innerHTML = `<span class="tip-title">${esc(p.titolo)}</span><span class="tip-meta">${esc(p.localita)} · ${isCI(p) ? 'Colonna infame' : cap === 0 ? 'Introduzione' : `cap. ${ROMAN[cap] ?? ''}`} · p. ${esc(p.pagina)}</span>`;
  /* La didascalia resta fuori dall’ingombro della carta ingrandita. */
  const cy = r.top + r.height / 2 - host.top, reach = Math.max(r.height / 2, 100) + 12;
  const below = cy + reach + 70 < host.height;
  tipEl.style.left = `${Math.min(Math.max(r.left - host.left + r.width / 2, 160), host.width - 160)}px`;
  tipEl.style.top = `${below ? cy + reach : cy - reach}px`;
  tipEl.classList.toggle('is-below', below);
  tipEl.hidden = false;
}
function hideTip() { tipEl.hidden = true; }

export function initBoard() {
  boardEl = document.getElementById('board');
  worldEl = document.getElementById('world');
  cardsEl = document.getElementById('cards');
  labelsEl = document.getElementById('labels');
  tipEl = document.getElementById('card-tip');
  worldEl.style.width = `${WORLD.w}px`;
  worldEl.style.height = `${WORLD.h}px`;

  buildMap();
  threadsEl = svg('svg', { class: 'threads', viewBox: `0 0 ${WORLD.w} ${WORLD.h}`, width: WORLD.w, height: WORLD.h, 'aria-hidden': 'true' });
  worldEl.insertBefore(threadsEl, cardsEl);
  buildCards();
  wirePanZoom();

  render(false);
  fit(false);

  let prevLayout = APP.layout;
  document.addEventListener('atlante:change', e => {
    const keys = e.detail.keys;
    if (!keys.some(k => ['layout', 'chars', 'filter', 'item', 'album'].includes(k))) return;
    const layoutChanged = APP.layout !== prevLayout;
    prevLayout = APP.layout;
    render(true);
    if (layoutChanged || (keys.includes('chars') && APP.layout === 'personaggi')) fit(true);
  });

  new ResizeObserver(() => {
    if (APP.layout === 'capitoli') render(false);
    fit(false);
  }).observe(boardEl);
}
