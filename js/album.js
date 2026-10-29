import { APP, set, openItem, closeItem, step, deck, applyFacet, isLit, isCI, chapterPos, ROMAN } from './main.js';
import { FACETS, TONES } from './atlas.js';

const OSD_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/5.0.1/openseadragon.min.js';
const OSD_IMAGES = 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/5.0.1/images/';

let el, page = 0, perSpread = 12, lastAlbum = null, lastItemId = null;
let osd = null, lbMode = 'illus';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const narrow = () => window.matchMedia('(max-width: 760px)').matches;

function chapterText(p) {
  const c = chapterPos(p);
  if (isCI(p)) return p.capitolo;
  return c === 0 ? 'Introduzione' : `Capitolo ${ROMAN[c] ?? ''}`;
}

function mount(p) {
  const cap = isCI(p) ? 'Colonna infame' : chapterPos(p) === 0 ? 'Introduzione' : `cap. ${ROMAN[chapterPos(p)] ?? ''}`;
  return `<li class="mount${isLit(p) ? '' : ' is-off'}">
    <button class="mount-photo" data-id="${p.id}" aria-label="${esc(p.titolo)}. Apri la tavola">
      <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
      <img src="${esc(p.thumbnail_medium || p.thumbnail_square)}" alt="" loading="lazy" decoding="async">
    </button>
    <p class="mount-caption">${esc(p.titolo)}</p>
    <p class="mount-meta">${cap} · p. ${esc(p.pagina)}</p>
  </li>`;
}

function renderAlbum() {
  const list = APP.items.filter(p => p.localita === APP.album);
  perSpread = narrow() ? 6 : 12;
  const half = perSpread / 2;
  const spreads = Math.max(1, Math.ceil(list.length / perSpread));
  page = Math.min(page, spreads - 1);
  const slice = list.slice(page * perSpread, (page + 1) * perSpread);
  const lit = APP.filter ? list.filter(isLit).length : null;

  el.innerHTML = `<div class="book">
    <div class="sheet-head">
      <h2 class="album-title" tabindex="-1">${esc(APP.album)}</h2>
      <p class="album-meta">${list.length} ${list.length === 1 ? 'tavola' : 'tavole'}${lit !== null ? ` · ${lit} nel filtro «${esc(APP.filter.value)}»` : ''}</p>
      <button class="sheet-close" data-close aria-label="Chiudi l'album">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6"/></svg>
      </button>
    </div>
    <div class="spread album-spread">
      <ol class="page page-left">${(narrow() ? slice : slice.slice(0, half)).map(mount).join('')}</ol>
      ${narrow() ? '' : `<ol class="page page-right">${slice.slice(half).map(mount).join('')}</ol>`}
    </div>
    <div class="spread-nav">
      <button class="turn" data-turn="-1" ${page === 0 ? 'disabled' : ''} aria-label="Pagine precedenti">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M14 4L7 11l7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
      </button>
      <span class="turn-count">${spreads > 1 ? `${page + 1} / ${spreads}` : ''}</span>
      <button class="turn" data-turn="1" ${page >= spreads - 1 ? 'disabled' : ''} aria-label="Pagine successive">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M8 4l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
      </button>
    </div></div>`;

  el.querySelector('[data-close]').addEventListener('click', () => set({ album: null }));
  el.querySelectorAll('[data-turn]').forEach(b => b.addEventListener('click', () => turn(Number(b.dataset.turn))));
  el.querySelectorAll('.mount-photo').forEach(b => b.addEventListener('click', () => {
    const p = list.find(x => String(x.id) === b.dataset.id);
    if (p) openItem(p, b.querySelector('img'));
  }));
}

function turn(d) {
  const spread = el.querySelector('.album-spread');
  page += d;
  spread?.classList.add(d > 0 ? 'is-leaving-left' : 'is-leaving-right');
  setTimeout(renderAlbum, 160);
}

function facet(type, value) {
  const ci = type === 'personaggio' ? APP.chars.indexOf(value) : -1;
  const on = APP.filter?.type === type && APP.filter.value === value;
  return `<button class="facet${on ? ' is-on' : ''}${ci >= 0 ? ' has-tone' : ''}" data-type="${type}" data-value="${esc(value)}"
    aria-pressed="${on || ci >= 0}" ${ci >= 0 ? `style="--tone:${TONES[ci]}"` : ''}>${esc(value)}</button>`;
}

function row(type, values, label) {
  if (!values?.length) return '';
  return `<div class="meta-row"><dt>${esc(label ?? FACETS[type][values.length > 1 ? 'plural' : 'label'])}</dt><dd>${values.map(v => facet(type, v)).join('')}</dd></div>`;
}

function renderPlate() {
  const p = APP.item;
  const list = deck();
  const i = list.findIndex(x => x.id === p.id);
  const where = APP.album ? `Album di ${APP.album}`
    : APP.layout === 'personaggi' && APP.chars.length ? APP.chars.join(', ')
    : APP.filter ? APP.filter.value : 'Tutte le tavole';
  const src = p.iiif_image_illus || p.thumbnail_large || p.thumbnail_medium;
  const low = p.thumbnail_large || p.thumbnail_medium;

  el.innerHTML = `<div class="book">
    <div class="sheet-head">
      ${APP.album ? `<button class="back" data-back>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
        Torna all'album di ${esc(APP.album)}</button>` : '<span></span>'}
      <button class="sheet-close" data-close aria-label="Chiudi la tavola">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6"/></svg>
      </button>
    </div>
    <div class="spread plate-spread">
      <div class="page page-left plate-page">
        <button class="plate-mount" data-zoom aria-label="Ingrandisci l'incisione">
          <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
          <img class="plate-img" alt="${esc(p.titolo)}" decoding="async">
        </button>
        <div class="plate-tools">
          <button class="tool" data-zoom>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14M7 5v4M5 7h4" stroke="currentColor" stroke-width="1.5"/></svg>
            Ingrandisci il tratto</button>
          ${p.iiif_image_pagina ? `<button class="tool" data-zoom-page>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h6l3 3v9H4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
            Vedi la pagina del libro</button>` : ''}
        </div>
      </div>
      <div class="page page-right meta-page">
        <h2 class="plate-title" tabindex="-1">${esc(p.titolo)}</h2>
        ${p.autori.length ? `<p class="plate-sign">incisione di ${p.autori.map(a => facet('autore', a) + (p.autori_attribuiti.includes(a) ? ' <span class="attr">(attribuito)</span>' : '')).join(', ')}</p>` : ''}
        <dl class="plate-meta">
          <div class="meta-row"><dt>Opera</dt><dd><span class="meta-text">${esc(isCI(p) ? 'Storia della colonna infame' : 'I promessi sposi')}</span></dd></div>
          ${p.capitolo ? `<div class="meta-row"><dt>Capitolo</dt><dd>${facet('capitolo', p.capitolo).replace(`>${esc(p.capitolo)}<`, `>${esc(chapterText(p))}<`)}</dd></div>` : ''}
          ${p.iiif_image_pagina ? `<div class="meta-row"><dt>Pagina</dt><dd><button class="facet" data-zoom-page aria-label="Pagina ${esc(p.pagina)}: guarda la pagina del libro">p. ${esc(p.pagina)}</button></dd></div>`
            : `<div class="meta-row"><dt>Pagina</dt><dd><span class="meta-text">p. ${esc(p.pagina)}</span></dd></div>`}
          ${row('personaggio', p.personaggi)}
          ${row('tema', p.temi)}
          ${row('localita', [p.localita], 'Località')}
          ${row('luogo', p.luogo_finzionale, p.luogo_finzionale.length > 1 ? 'Luoghi del racconto' : 'Luogo del racconto')}
          ${row('soggetto', p.soggetto ? [p.soggetto] : [])}
        </dl>
        ${p.dl_url ? `<a class="source-link" href="${esc(p.dl_url)}" target="_blank" rel="noopener noreferrer">Scheda e pagina originale nella DL FICLIT
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9l6-6M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></a>` : ''}
      </div>
    </div>
    <div class="spread-nav">
      <button class="turn" data-step="-1" aria-label="Tavola precedente">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M14 4L7 11l7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
      </button>
      <span class="turn-count"><span><b>${i + 1}</b> / ${list.length}</span><span class="turn-where">${esc(where)}</span></span>
      <button class="turn" data-step="1" aria-label="Tavola successiva">
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M8 4l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
      </button>
    </div></div>`;

  const img = el.querySelector('.plate-img');
  const mountEl = el.querySelector('.plate-mount');
  mountEl.classList.add('is-loading');
  img.addEventListener('load', () => mountEl.classList.remove('is-loading'), { once: true });
  const giveUp = () => {
    img.onerror = null;
    mountEl.classList.remove('is-loading');
    mountEl.classList.add('is-missing');
    img.replaceWith(Object.assign(document.createElement('span'), {
      className: 'plate-missing',
      textContent: "L'immagine non si è caricata dal server della DL FICLIT. La tavola resta consultabile dal link alla scheda originale.",
    }));
  };
  /* Assegna la sorgente dopo i gestori per le immagini in cache. */
  img.onerror = low && src !== low ? () => { img.onerror = giveUp; img.src = low; } : giveUp;
  img.src = src;

  el.querySelector('[data-close]').addEventListener('click', closeItem);
  el.querySelector('[data-back]')?.addEventListener('click', () => closeItem());
  el.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => step(Number(b.dataset.step))));
  el.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => { lbMode = 'illus'; set({ lightbox: true }); }));
  el.querySelectorAll('[data-zoom-page]').forEach(b => b.addEventListener('click', () => { lbMode = 'page'; set({ lightbox: true }); }));
  el.querySelectorAll('.facet[data-type]').forEach(b => b.addEventListener('click', () => applyFacet(b.dataset.type, b.dataset.value)));

  if (APP.origin) fly(APP.origin, p, mountEl);
}

function fly(from, p, target) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = target.getBoundingClientRect();
  if (!to.width || !from.width) return;
  const ghost = document.createElement('img');
  ghost.className = 'flying-card';
  ghost.src = p.thumbnail_large || p.thumbnail_square;
  ghost.alt = '';
  const fw = from.width, fh = from.height;
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${fw}px`, height: `${fh}px` });
  document.body.appendChild(ghost);
  target.classList.add('is-arriving');
  const sx = to.width / fw, sy = to.height / fh;
  const anim = ghost.animate([
    { transform: 'translate(0,0) scale(1) rotate(-3deg)', boxShadow: '0 2px 4px rgba(30,45,38,.25)' },
    { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${sx}, ${sy}) rotate(0deg)`, boxShadow: '0 18px 40px rgba(30,45,38,.35)' },
  ], { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
  anim.onfinish = () => {
    target.classList.remove('is-arriving');
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = () => ghost.remove();
  };
}

function loadOSD() {
  if (window.OpenSeadragon) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = OSD_SRC;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => reject(new Error('OpenSeadragon non disponibile'));
    document.head.appendChild(s);
  });
}

const infoUrl = url => url?.replace(/\/full\/[^/]+\/0\/default\.jpg$/, '/info.json');

async function renderLightbox() {
  const lb = document.getElementById('lightbox');
  if (!APP.lightbox || !APP.item) {
    lb.hidden = true;
    osd?.destroy(); osd = null;
    return;
  }
  const p = APP.item;
  lb.hidden = false;
  lb.innerHTML = `
    <div class="lb-bar">
      <div class="lb-modes" role="tablist" aria-label="Cosa guardare">
        <button role="tab" data-mode="illus" aria-selected="${lbMode === 'illus'}">Illustrazione</button>
        ${p.iiif_image_pagina ? `<button role="tab" data-mode="page" aria-selected="${lbMode === 'page'}">Pagina del libro</button>` : ''}
      </div>
      <p class="lb-title">${esc(p.titolo)}</p>
      <button class="sheet-close lb-close" aria-label="Chiudi l'ingrandimento">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6"/></svg>
      </button>
    </div>
    <div id="osd" class="lb-view" role="img" aria-label="${esc(p.titolo)}, ingrandibile"></div>
    <p class="lb-hint">Rotella o pizzico per ingrandire, trascina per spostarti.</p>`;
  lb.querySelector('.lb-close').addEventListener('click', () => set({ lightbox: false }));
  lb.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { lbMode = b.dataset.mode; renderLightbox(); }));
  lb.querySelector('.lb-close').focus();

  const url = lbMode === 'page' ? p.iiif_image_pagina : p.iiif_image_illus;
  try {
    await loadOSD();
    osd?.destroy();
    osd = window.OpenSeadragon({
      element: lb.querySelector('#osd'),
      prefixUrl: OSD_IMAGES,
      tileSources: infoUrl(url) ?? { type: 'image', url: p.thumbnail_large },
      crossOriginPolicy: 'Anonymous',
      showNavigationControl: false,
      gestureSettingsMouse: { clickToZoom: false },
      maxZoomPixelRatio: 3,
      visibilityRatio: 0.6,
      animationTime: 0.6,
    });
  } catch {
    lb.querySelector('#osd').innerHTML = `<img class="lb-fallback" src="${esc(url ?? p.thumbnail_large)}" alt="${esc(p.titolo)}">`;
  }
}

export function initAlbum() {
  el = document.getElementById('album');
  document.addEventListener('atlante:change', e => {
    const keys = e.detail.keys;
    const showItem = !!APP.item, showAlbum = !!APP.album;
    el.hidden = !showItem && !showAlbum;
    el.dataset.mode = showItem ? 'plate' : 'album';

    if (showItem && (APP.item.id !== lastItemId || keys.includes('filter') || keys.includes('chars'))) {
      lastItemId = APP.item.id;
      renderPlate();
      el.querySelector('.plate-title')?.focus({ preventScroll: true });
    } else if (!showItem && showAlbum && (APP.album !== lastAlbum || keys.includes('filter') || keys.includes('item'))) {
      if (APP.album !== lastAlbum) page = 0;
      renderAlbum();
      el.querySelector('.album-title')?.focus({ preventScroll: true });
    }
    if (!showItem) lastItemId = null;
    lastAlbum = APP.album;
    if (keys.includes('lightbox') || keys.includes('item')) renderLightbox();
  });

  document.addEventListener('keydown', e => {
    if (!APP.album || APP.item || e.target.closest?.('input')) return;
    const right = el.querySelector('[data-turn="1"]'), left = el.querySelector('[data-turn="-1"]');
    if (e.key === 'ArrowRight' && right && !right.disabled) turn(1);
    if (e.key === 'ArrowLeft' && left && !left.disabled) turn(-1);
  });

  el.addEventListener('click', e => {
    if (e.target !== el) return;
    if (APP.item) closeItem(); else set({ album: null });
  });
  window.addEventListener('resize', () => { if (APP.album && !APP.item) renderAlbum(); });
}
