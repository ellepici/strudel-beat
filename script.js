// =====================================================================
// STRUDEL BEAT: il motore della pagina
// ogni lettera (forma + beat) è nel suo file: alphabet/a.js ... alphabet/z.js
// =====================================================================

const CARTELLA = 'alphabet';
const LETTERE = 'abcdefghijklmnopqrstuvwxyz'.split('');

// colonne vuote tra una ripetizione e l'altra della lettera (0 = attaccate, senza interruzioni).
// ogni lettera può avere il suo: "const spazio = ..." nel suo file; negativo = le lettere si incastrano
const SPAZIO = 0;


// --- stato ---------------------------------------------------------------

const canvas = document.getElementById('roll');
const roll = canvas.getContext('2d');
const avviso = document.getElementById('avviso');

const forme = {};        // la forma di ogni lettera, letta dal suo file
const spazi = {};        // lo spazio di ogni lettera (se il file lo indica)
let spazioAttuale = 0;   // lo spazio della lettera che sta suonando
let lettera = 'y';       // lettera selezionata
let righe = null;        // la lettera ritagliata (senza colonne vuote ai lati)
let codice = null;       // il codice Strudel della lettera (dal suo file)
let playing = false;
window.inizio = 0;       // punto (in cicli) da cui riparte il ritmo dopo una pausa
window.partenza = 0;     // primo punto che suona: prima di lì lo schermo è vuoto

// editor di Strudel (nascosto con il CSS): serve solo a far suonare il codice
const repl = document.createElement('strudel-editor');
repl.setAttribute('code', '// pronto');
document.getElementById('editor').append(repl);


// --- lettere: file, forma, ritaglio ------------------------------------------

// toglie le colonne vuote ai lati e aggiunge lo spazio tra le ripetizioni (usata anche nei file delle lettere).
// con spazio negativo restituisce la lettera intera: sarà la pagina a farla ripartire
// ogni "passo" colonne (larghezza + spazio), così la fine di una lettera si incastra nell'inizio della successiva
function ritaglia(r, spazio = SPAZIO) {
  const piene = [...Array(r[0].length).keys()].filter(c => r.some(riga => riga[c] === '#'));
  const da = piene[0], a = piene[piene.length - 1] + 1;
  const tagliata = r.map(riga => riga.slice(da, a));
  return spazio >= 0 ? tagliata.map(riga => riga + '.'.repeat(spazio)) : tagliata;
}

// con spazio negativo: prende una lettera intera (larghezza L) e la fa ripartire ogni P cicli,
// sovrapposta alla precedente. Le copie partono dalla "partenza": nessun pezzo di lettere precedenti
window.ripeti = (p) => {
  if (spazioAttuale >= 0) return p;
  const L = colonneLettera() / 24;
  const P = periodo();
  const una = p.filterHaps(h => { const b = h.whole.begin.valueOf(); return b >= -1e-9 && b < L - 1e-9; });
  const k0 = Math.round(partenza / P);
  return new Pattern((stato) => {
    const b = stato.span.begin.valueOf(), e = stato.span.end.valueOf();
    const haps = [];
    const visti = new Set();   // dove due copie si sovrappongono, lo stesso colpo suona una volta sola
    for (let k = Math.max(k0, Math.floor((b - L) / P)); k * P < e; k++) {
      for (const h of una.late(k * P).query(stato)) {
        const chiave = h.whole.begin.valueOf().toFixed(6) + JSON.stringify(h.value);
        if (!visti.has(chiave)) { visti.add(chiave); haps.push(h); }
      }
    }
    return haps;
  });
};
window.ritaglia = ritaglia;

async function leggiFile(ch) {
  const risposta = await fetch(`${CARTELLA}/${ch}.js`, { cache: 'no-store' });
  if (!risposta.ok) throw new Error(`manca il file ${CARTELLA}/${ch}.js`);
  return await risposta.text();
}

// legge la forma dal file: le righe tra apici dentro "const forma = [ ... ]"
// (ogni lettera può avere la sua griglia, es. 24x16 oppure 12x24: conta il numero di righe del file)
function leggiForma(testo, ch) {
  const blocco = testo.match(/const\s+forma\s*=\s*\[([\s\S]*?)\]/);
  const r = blocco ? [...blocco[1].matchAll(/['"]([.#]+)['"]/g)].map(m => m[1]) : [];
  if (r.length === 0 || r.some(riga => riga.length !== r[0].length) || !r.join('').includes('#')) {
    throw new Error(`la forma in ${CARTELLA}/${ch}.js deve avere righe tutte della stessa lunghezza, con almeno un '#'`);
  }
  return r;
}

// legge lo spazio dal file ("const spazio = -4"), altrimenti usa SPAZIO
function leggiSpazio(testo) {
  const m = testo.match(/const\s+spazio\s*=\s*(-?\d+)/);
  return m ? parseInt(m[1], 10) : SPAZIO;
}


// --- barra delle lettere -------------------------------------------------

const barra = document.getElementById('lettere');
const ALTEZZA_BARRA = 48;   // altezza (in px) di ogni lettera nella barra, qualunque sia la sua griglia

function disegnaMini(btn, forma) {
  const r = ritaglia(forma, 0);
  const w = r[0].length;
  const PX_BARRA = ALTEZZA_BARRA / r.length;   // grandezza di un pixel della lettera nella barra
  let mini = btn.querySelector('canvas');
  if (!mini) { mini = document.createElement('canvas'); btn.append(mini); }
  mini.width = Math.round(w * PX_BARRA);
  mini.height = ALTEZZA_BARRA;
  const c = mini.getContext('2d');
  c.clearRect(0, 0, mini.width, mini.height);
  c.fillStyle = '#fff';
  r.forEach((riga, y) => [...riga.slice(0, w)].forEach((v, x) => {
    if (v === '#') c.fillRect(x * PX_BARRA, y * PX_BARRA, PX_BARRA, PX_BARRA);
  }));
}

function evidenzia() {
  for (const b of barra.children) b.classList.toggle('attiva', b.dataset.lettera === lettera);
}

// all'apertura legge tutti i file e disegna le lettere nella barra
async function preparaBarra() {
  const errori = [];
  await Promise.all(LETTERE.map(async ch => {
    try { forme[ch] = leggiForma(await leggiFile(ch), ch); }
    catch (e) { errori.push(e.message); }
  }));
  for (const ch of LETTERE) {
    if (!forme[ch]) continue;
    const btn = document.createElement('button');
    btn.className = 'lettera';
    btn.dataset.lettera = ch;
    btn.title = ch;
    disegnaMini(btn, forme[ch]);
    btn.onclick = () => { btn.blur(); scegli(ch); };
    barra.append(btn);
  }
  evidenzia();
  mostraErrore(errori.join('\n'));
}


// --- far suonare la lettera ---------------------------------------------------

// la pagina aggiunge in testa al codice della lettera: velocità di base, e una
// trasformazione che toglie i suoni prima della partenza (schermo vuoto, la lettera
// arriva da destra) e fa ripartire dal punto della pausa. Vale per qualsiasi codice.
// Se il file della lettera usa ripeti(...) da solo (es. lettera + base musicale),
// la pagina non lo riapplica a tutto: la base non va tagliata sul passo della lettera.
const prefisso = (codice) => `setcps(0.5)
all(p => ${/\bripeti\s*\(/.test(codice) ? 'p' : 'ripeti(p)'}.filterHaps(h => h.whole.begin.valueOf() >= partenza - 1e-9).early(inizio))
`;

function mostraErrore(msg) {
  avviso.textContent = msg || '';
  avviso.style.display = msg ? 'block' : 'none';
}

// fa suonare il codice attuale e controlla se ci sono errori
async function suona() {
  repl.editor.setCode(prefisso(codice) + codice);
  await repl.editor.evaluate();
  const err = repl.editor.repl.state.evalError;
  mostraErrore(err ? `errore in ${CARTELLA}/${lettera}.js: ${err.message}` : '');
  return !err;
}


// --- disegno: le righe della lettera riempiono l'altezza, ogni passo (1/24 di ciclo) è un quadrato ---

const numeroRighe = () => (righe ? righe.length : 16);   // 16 per la griglia 24x16, 24 per la 12x24
const lato = () => canvas.height / numeroRighe();
const pxPerCiclo = () => lato() * 24;
const colonneLettera = () => righe[0].length;                              // larghezza della lettera (in passi)
const colonne = () => colonneLettera() + Math.min(0, spazioAttuale);      // passo: ogni quanti passi riparte la lettera
const periodo = () => colonne() / 24;                                     // durata di un passo della lettera in cicli

// il riquadro occupa tutto lo spazio sotto la barra (nitido anche sugli schermi retina)
function adatta() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}
adatta();
addEventListener('resize', adatta);

// partenza = il primo inizio di lettera dopo il tempo che serve per attraversare lo schermo:
// così al play lo schermo è vuoto e la prima lettera arriva da destra, intera
function calcolaPartenza() {
  const ingresso = Math.ceil(canvas.width / lato()) / 24;
  window.partenza = Math.ceil(ingresso / periodo() - 1e-9) * periodo();
}

// posizione attuale nel ritmo (in cicli): avanza mentre suona, resta ferma in pausa
function posizione() {
  return playing ? inizio + repl.editor.repl.scheduler.now() : inizio;
}

// disegna la forma della lettera ripetuta: ogni colonna entra da destra
// e arriva al bordo sinistro esattamente quando suona (lì diventa un contorno)
function disegnaFrame() {
  const W = canvas.width, H = canvas.height;
  const l = lato(), ppc = pxPerCiclo();
  const gap = Math.max(1, Math.round(l * 0.03));          // sottile riga nera tra i quadrati
  const spessore = Math.max(2, Math.round(l * 0.06));     // contorno del quadrato che sta suonando

  roll.fillStyle = '#000';
  roll.fillRect(0, 0, W, H);

  if (righe && codice) {
    const ora = posizione();
    const w = colonne();
    const zero = Math.round(partenza * 24);
    const primo = Math.max(Math.floor(ora * 24), zero);
    const ultimo = Math.ceil((ora + W / ppc) * 24);
    roll.fillStyle = '#fff';
    roll.strokeStyle = '#fff';
    roll.lineWidth = spessore;
    const L = colonneLettera();
    for (let n = primo; n <= ultimo; n++) {        // n = passo
      const t = n / 24;
      const x = (t - ora) * ppc;
      const suona = t <= ora && ora < t + 1 / 24;
      // colonne delle copie della lettera che passano da questo passo (più di una se si incastrano)
      const cols = [];
      for (let k = Math.floor((n - zero) / w); k >= 0 && (n - zero) - k * w < L; k--) cols.push((n - zero) - k * w);
      for (let r = 0; r < righe.length; r++) {
        if (!cols.some(col => righe[r][col] === '#')) continue;
        if (suona) roll.strokeRect(x + spessore / 2, r * l + spessore / 2, ppc / 24 - gap - spessore, l - gap - spessore);
        else roll.fillRect(x, r * l, ppc / 24 - gap, l - gap);
      }
    }
  }
  requestAnimationFrame(disegnaFrame);
}
requestAnimationFrame(disegnaFrame);


// --- comandi ---------------------------------------------------------------

const btnPlay = document.getElementById('toggle');
const btnReset = document.getElementById('reset');

function aggiornaPulsante() {
  btnPlay.textContent = playing ? '❚❚ pausa' : '▶ play';
}

async function ferma() {
  if (playing) {
    playing = false;
    await repl.editor.stop();
  }
}

// fa partire la lettera da capo: rilegge il file (così vedi subito le modifiche),
// schermo vuoto, la lettera entra da destra
async function daCapo() {
  await ferma();
  try {
    codice = await leggiFile(lettera);
    forme[lettera] = leggiForma(codice, lettera);
    spazi[lettera] = leggiSpazio(codice);
  } catch (e) {
    codice = null;
    mostraErrore(e.message);
    aggiornaPulsante();
    return;
  }
  const btn = barra.querySelector(`[data-lettera="${lettera}"]`);
  if (btn) disegnaMini(btn, forme[lettera]);
  spazioAttuale = spazi[lettera];
  righe = ritaglia(forme[lettera], spazioAttuale);
  window.inizio = 0;
  calcolaPartenza();
  playing = await suona();
  aggiornaPulsante();
}

// scegli una lettera nella barra: parte subito il suo loop
async function scegli(ch) {
  lettera = ch;
  evidenzia();
  await daCapo();
}

// play / pausa: la pausa ricorda il punto, il play riparte da lì
async function playPausa() {
  if (playing) {
    window.inizio = posizione();
    await ferma();
  } else if (!codice) {
    await daCapo();
    return;
  } else {
    playing = await suona();
  }
  aggiornaPulsante();
}

// reset: torna all'inizio con lo schermo vuoto (se stava suonando, riparte subito)
async function reset() {
  if (playing) {
    await daCapo();
  } else {
    window.inizio = 0;
    codice = null;
  }
}

btnPlay.onclick = () => { btnPlay.blur(); playPausa(); };
btnReset.onclick = () => { btnReset.blur(); reset(); };
canvas.onclick = playPausa;
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); playPausa(); }                  // barra spaziatrice = play / pausa
  const ch = e.key.toLowerCase();
  if (forme[ch] && !e.metaKey && !e.ctrlKey && !e.altKey) scegli(ch);           // tasto di una lettera = scegli quella lettera
});

preparaBarra();
