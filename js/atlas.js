const PERSONAGGI = {
  'Agnese, madre di Lucia': 'Agnese',
  'Alessio di Maggianico, cugino di Agnese': 'Alessio di Maggianico',
  'Attilio, conte': 'Conte Attilio',
  'Auditore di Sanità': 'Auditore della Sanità',
  'Azzecca-garbugli, dottor': 'Dottor Azzecca-garbugli',
  'Badessa del monastero di Monza': 'La badessa di Monza',
  'Barcaiolo del lago di Como che traghetta i promessi sposi in fuga con Agnese': 'Il barcaiolo del lago',
  "Bravi dell'innominato": "Bravi dell'Innominato",
  'Cappuccino che porta l\'ordine di trasferimento al padre Cristoforo': 'Il cappuccino messaggero',
  'Carlo I Gonzaga-Nevers, duca di Mantova e del Monferrato': 'Carlo Gonzaga-Nevers',
  'Commissari della Sanità arruolati al tempo della peste': 'Commissari della Sanità',
  'Conte zio, zio del conte Attilio e di don Rodrigo, membro del consiglio segreto di Milano': 'Il Conte zio',
  'Contadini nel Seicento': 'Contadini',
  'Conversa del monastero di Monza che scopre la tresca di Gertrude ed è fatta sparire': 'La conversa',
  'Cristoforo, padre': 'Fra Cristoforo',
  'Fattoressa del convento di Gertrude': 'La fattoressa',
  'Fazio, fra, laico sagrestano sel convento di Pescarenico': 'Fra Fazio',
  'Felice, padre': 'Padre Felice',
  'Ferrante, don': 'Don Ferrante',
  'Ferrer, Antonio (gran cancelliere spagnolo)': 'Antonio Ferrer',
  'Galdino, fra': 'Fra Galdino',
  'Griso, capo dei bravi di don Rodrigo': 'Il Griso',
  'Madre di Cecilia': 'La madre di Cecilia',
  'Mauri, difensore del Mora': 'Mauri, difensore del Mora',
  'Medici nel Seicento': 'Medici',
  'Mercante di Milano incontrato da Renzo in un\'osteria di Gorgonzola': 'Il mercante di Gorgonzola',
  'Mercantessa vedova di Monza': 'La vedova mercantessa',
  'Monatti di Milano': 'Monatti',
  'Mora, Gian Giacomo (Giangiacomo)': 'Gian Giacomo Mora',
  'Mora, figlio di Giangiacomo': 'Il figlio del Mora',
  'Mora, moglie di Giangiacomo interrogata': 'La moglie del Mora',
  'Olivares, Gaspar de Guzmán, conte-duca di': 'Il conte duca di Olivares',
  'Oste della luna piena': "L'oste della Luna Piena",
  'Padre guardiano del convento dei cappuccini di Monza': 'Il padre guardiano di Monza',
  'Padre guardiano del convento di Pescarenico': 'Il padre guardiano di Pescarenico',
  'Padre provinciale dei cappuccini di Milano': 'Il padre provinciale',
  'Pescatore dell\'Adda che traghetta Renzo in fuga': "Il pescatore dell'Adda",
  'Principe, padre di Gertrude': 'Il principe padre',
  'Principessa, madre di Gertrude': 'La principessa madre',
  'Principino, fratello di Gertrude': 'Il principino',
  'Rodrigo, don': 'Don Rodrigo',
  'Tadini (Tadino), Alessandro': 'Alessandro Tadino',
  'Teresa, figlia minore di G. Mora': 'Teresa Mora',
  'Uomo donna e ragazzotto di Milano carichi di pane e farina il giorno di San Martino': 'Popolani carichi di pane',
  'Vecchio malvissuto che voleva sconfiggere il vicario di provvisione': 'Il vecchio malvissuto',
  'Vicario di provvisione di Milano': 'Il vicario di provvisione',
};

function swapComma(name) {
  const i = name.indexOf(', ');
  return i === -1 ? name : `${name.slice(i + 2)} ${name.slice(0, i)}`;
}

export function personaggioName(raw) {
  return PERSONAGGI[raw] ?? swapComma(raw);
}

export function autoreName(raw) {
  return swapComma(raw.replace(/^\[|\]$/g, ''));
}

const isAttributed = raw => /^\[.*\]$/.test(raw);

/* Corregge la visualizzazione senza modificare il dataset. */
const TITOLI = {
  'Renzo arriva arriva al Duomo': 'Renzo arriva al Duomo',
};

const TOPONIMI = {
  'Como': 'Lago di Como',
  'Venezia': 'Stato di Venezia',
  'Greco, località': 'Greco',
  'Casale Monferrato; Mantova': 'Mantova e Monferrato',
};

export function toponimoName(raw) {
  return TOPONIMI[raw] ?? raw;
}

const LUOGHI = {
  'Borromeo, collegio di Pavia': 'Collegio Borromeo',
  'Cordusio, piazzetta o crocicchio a Milano': 'Cordusio',
  'Duomo di Milano, piazza del': 'Piazza del Duomo',
  'Porta Orientale a Milano, borgo di': 'Borgo di Porta Orientale',
  'Palazzo di Corte, sede del governatore di Milano': 'Palazzo di Corte',
  'Osteria della luna piena a Milano': 'Osteria della Luna Piena',
  'Forno delle grucce': 'Forno delle Grucce',
  'Lazzeretto di Porta Orientale a Milano': 'Lazzeretto',
  'Capanne del lazzeretto': 'Capanne del Lazzeretto',
  'Chiesa del lazzeretto a Milano': 'Chiesa del Lazzeretto',
};

export function luogoName(raw) {
  if (LUOGHI[raw]) return LUOGHI[raw];
  let s = raw.replace(/ - a [A-Z][a-z]+$/, '').replace(/ a (Milano|Monza)$/, '');
  const i = s.indexOf(', ');
  if (i !== -1) {
    const head = s.slice(i + 2), name = s.slice(0, i);
    s = head.endsWith("'") ? `${head}${name}` : `${head} ${name}`;
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function capitoloName(props) {
  const t = props.capitolo_testo ?? '';
  if (t.startsWith('CI_')) {
    const rest = t.slice(3);
    return rest === 'Introduzione' ? 'Colonna infame, introduzione' : `Colonna infame, ${rest.toLowerCase()}`;
  }
  return t;
}

/* Conserva i valori catalografici nei campi con suffisso _raw. */
export function normalizeProps(p) {
  p.personaggi_raw = p.personaggi ?? [];
  p.personaggi = [...new Set(p.personaggi_raw.map(personaggioName))];
  p.autori_raw = p.autori ?? [];
  const known = p.autori_raw.filter(a => a !== 's.i.');            /* Senza indicazione. */
  p.autori = [...new Set(known.map(autoreName))];
  p.autori_attribuiti = known.filter(isAttributed).map(autoreName);
  p.titolo_raw = p.titolo;
  p.titolo = TITOLI[p.titolo] ?? p.titolo;
  p.luogo_finzionale_raw = p.luogo_finzionale ?? [];
  p.luogo_finzionale = [...new Set(p.luogo_finzionale_raw.map(luogoName))];
  p.localita = toponimoName(p.toponimo);
  p.capitolo = capitoloName(p);
  return p;
}

export const FACETS = {
  personaggio: { label: 'Personaggio', plural: 'Personaggi', values: p => p.personaggi },
  tema:        { label: 'Tema',        plural: 'Temi',       values: p => p.temi ?? [] },
  luogo:       { label: 'Luogo',       plural: 'Luoghi',     values: p => p.luogo_finzionale ?? [] },
  localita:    { label: 'Località',    plural: 'Località',   values: p => [p.localita] },
  capitolo:    { label: 'Capitolo',    plural: 'Capitoli',   values: p => (p.capitolo ? [p.capitolo] : []) },
  autore:      { label: 'Incisore',    plural: 'Incisori',   values: p => p.autori },
  soggetto:    { label: 'Soggetto',    plural: 'Soggetti',   values: p => (p.soggetto ? [p.soggetto] : []) },
  funzione:    { label: 'Funzione',    plural: 'Funzioni',   values: p => (p.funzione ? [p.funzione] : []) },
};

export function matches(props, type, value) {
  const f = FACETS[type];
  return !!f && f.values(props).includes(value);
}

/* Mappa narrativa senza scala geografica. */

export const WORLD = { w: 1600, h: 1000 };

export const PLACES = {
  'Bellano':              { x: 500,  y: 70 },
  'Pasturo':              { x: 860,  y: 90 },
  'Lecco':                { x: 650,  y: 165 },
  'Lago di Como':         { x: 400,  y: 260 },
  'Pescarenico':          { x: 770,  y: 315 },
  'Maggianico':           { x: 930,  y: 395 },
  'Bergamo':              { x: 1200, y: 260 },
  'Monza':                { x: 600,  y: 470 },
  'Greco':                { x: 540,  y: 640 },
  'Stato di Venezia':     { x: 1270, y: 520 },
  'Adda':                 { x: 960,  y: 610 },
  'Gorgonzola':           { x: 770,  y: 720 },
  'Milano':               { x: 300,  y: 790 },
  'Madrid':               { x: 160,  y: 470, far: true },
  'Pavia':                { x: 560,  y: 920 },
  'Mantova e Monferrato': { x: 1350, y: 850 },
};

export const MAP = {
  lake: [
    'M 505 -10 C 520 50, 565 105, 605 150 S 650 210, 660 236',
    'M 512 75 C 480 125, 445 180, 400 250 S 360 310, 350 330',
  ],
  rivers: [
    { d: 'M 660 226 C 720 300, 800 380, 860 460 S 950 580, 975 650 S 990 780, 1010 860 S 1040 960, 1060 1020', name: 'Adda', at: [1026, 905] },
  ],
  roads: [
    { d: 'M 450 790 C 540 790, 640 780, 700 760 S 860 690, 950 640', name: 'Naviglio della Martesana', at: [0, 0] },
  ],
  mountains: [
    { d: 'M 1012 200 L 1026 174 L 1038 190 L 1050 160 L 1063 186 L 1076 168 L 1092 200', name: 'Resegone', at: [1052, 226] },
  ],
  walls: { cx: 300, cy: 790, r: 178 },
  note: 'Mappa mentale del romanzo, non in scala',
};

export const TONES = ['#BE5749', '#4E7D6E', '#B5852F'];
