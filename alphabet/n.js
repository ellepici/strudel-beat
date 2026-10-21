// =====================================================================
// LETTERA N — extended italic (disegnata in InDesign)
// stile: deep acid techno, 132 BPM, La minore (ispirato a "2 Minute Deep Acid in Strudel" di Switch Angel)
// =====================================================================

// --- FORMA ---------------------------------------------------------------
// griglia 24 colonne x 24 righe: '#' = pixel pieno (suona), '.' = vuoto
// righe 0-5 ascendenti, 6-17 x-height (riga 17 = linea di base), 18-23 discendenti
// la pagina legge da qui anche il disegno della lettera (barra in alto e pianoroll)
const forma = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........#...............',
  '.......##....#####......',
  '.......#...###...###....',
  '......##.###.......##...',
  '......####..........##..',
  '.....###.............#..',
  '.....##.............##..',
  '.....##............##...',
  '....##.............#....',
  '....##............##....',
  '...##.............#.....',
  '...##.............#.....',
  '..##..............##..#.',
  '.###...............###..',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
]

// spazio tra una n e l'altra: -4 = le lettere si incastrano,
// l'uncino finale coincide con il piede della n successiva
const spazio = -4


// --- TEMPO ------------------------------------------------------------------
// 1 ciclo = 1 battuta da 4 quarti, 24 colonne per battuta (6 per quarto)
// 0.55 cicli al secondo = 132 BPM
setcps(0.55)


// --- LA LETTERA: la linea acid ---------------------------------------------------
// ogni riga è una nota della pentatonica di La minore (in alto = acuto):
// qualsiasi combinazione di pixel resta consonante.
// i pixel vicini sulla stessa riga diventano UNA nota tenuta (l'arco della n
// è una nota lunga, le aste diagonali sono note brevi che salgono e scendono)
const PENTA = [0, 3, 5, 7, 10]                       // La Do Re Mi Sol
const notaRiga = (r) => {
  const i = 23 - r                                   // riga 23 = la più bassa (La0)
  return 21 + 12 * Math.floor(i / 5) + PENTA[i % 5]  // 21 = La0 in MIDI: un'ottava sotto, registro "303"
}

const righe = ritaglia(forma, spazio)

// trasforma una riga in note tenute: '..###.#' -> pausa 2, nota lunga 3, pausa 1, nota 1
const tratti = (riga, nota) => {
  const pezzi = []
  for (const run of riga.match(/#+|\.+/g)) {
    pezzi.push([run.length, run[0] === '#' ? pure(nota) : silence])
  }
  return timeCat(...pezzi)
}

// il suono acid: dente di sega, filtro passa-basso risonante che si apre a ogni nota
// e si chiude subito (lpenv/lpdecay), mentre la manopola del filtro gira lenta in 16 battute
const lettera = stack(...righe.map((riga, r) =>
  note(tratti(riga, notaRiga(r))).pan(0.3 + r / 60)
))
  .slow(righe[0].length / 24)   // ogni colonna dura 1/24 di battuta
  .s('sawtooth')
  .lpf(sine.slow(16).range(250, 1400))   // la "manopola" del cutoff
  .lpq(12)                               // risonanza: il fischio acido
  .lpenv(3).lpattack(0.005).lpdecay(0.14).lpsustain(0.1)
  .attack(0.003).decay(0.2).sustain(0.5).release(0.08)
  .gain(0.3)
  .delay(0.25).delaytime(0.341).delayfeedback(0.45)   // eco a 1/8 puntato (a 132 BPM)
  .orbit(2)                                            // orbita 2: si abbassa a ogni colpo di cassa


// --- LA BASE: cassa che pompa, rumble, charleston, pad scuro ----------------------
// struttura di 16 battute: nelle ultime 2 cassa e rumble si fermano (break)
const sezione = "<1!14 0!2>"

// la cassa "schiaccia" l'orbita 2 a ogni colpo (sidechain): è da qui che viene il pompaggio
const cassa = s("bd*4").bank('RolandTR909')
  .shape(0.3)
  .gain(0.6)
  .duckorbit(2).duckattack(0.18).duckdepth(0.9)
  .mask(sezione)

// rumble: un La basso ripetuto tra un colpo e l'altro, pompato dalla cassa
const rumble = note("[~ a1 a1 a1]*4")
  .s('sawtooth').lpf(160)
  .attack(0.005).decay(0.1).sustain(0.4).release(0.05)
  .gain(0.55)
  .orbit(2)
  .mask(sezione)

const clap = s("~ cp ~ cp").bank('RolandTR909').gain(0.22)

const rim = s("~ ~ rim ~ ~ rim ~ ~ ~ rim ~ ~ ~ ~ rim ~").bank('RolandTR909').gain(0.14)

const aperto = s("[~ oh]*4").bank('RolandTR909').gain(0.16)          // il charleston aperto in levare

const chiuso = s("hh*16").bank('RolandTR909').gain(".09 .04 .06 .04")

// pad scuro: un solo accordo di La minore, filtro lento, pompato dalla cassa
const pad = note("[a2,e3,a3,c4]")
  .s('supersaw')
  .lpf(sine.slow(32).range(350, 1100))
  .attack(0.3).release(0.6)
  .gain(0.07)
  .orbit(2)

// la base parte insieme alla prima n che tocca il bordo sinistro
const base = stack(cassa, rumble, clap, rim, aperto, chiuso, pad).late(partenza)


// --- TUTTO INSIEME -------------------------------------------------------------
// ripeti() fa ripartire la lettera ogni 18 colonne, incastrata con la precedente
stack(ripeti(lettera), base)
