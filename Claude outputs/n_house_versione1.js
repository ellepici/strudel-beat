// =====================================================================
// LETTERA N — extended italic (disegnata in InDesign)
// stile: house / elettronica, 120 BPM, La minore
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
// 0.5 cicli al secondo = 120 BPM (prova 0.52 per ~125 BPM, più "club")
setcps(0.5)


// --- LA LETTERA: la melodia ---------------------------------------------------
// ogni riga è una nota della scala pentatonica di La minore (in alto = acuto):
// qualsiasi combinazione di pixel resta consonante.
// i pixel vicini sulla stessa riga diventano UNA nota tenuta (l'arco della n
// è una nota lunga, le aste diagonali sono note brevi che salgono e scendono)
const PENTA = [0, 3, 5, 7, 10]                       // La Do Re Mi Sol
const notaRiga = (r) => {
  const i = 23 - r                                   // riga 23 = la più bassa (La1)
  return 33 + 12 * Math.floor(i / 5) + PENTA[i % 5]  // 33 = La1 in MIDI
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

const lettera = stack(...righe.map((riga, r) =>
  note(tratti(riga, notaRiga(r))).pan(0.25 + r / 46)   // un po' di stereo: righe alte a sinistra
))
  .slow(righe[0].length / 24)   // ogni colonna dura 1/24 di battuta
  .s('sawtooth')
  .lpf(2400)
  .attack(0.005).decay(0.18).sustain(0.35).release(0.2)
  .gain(0.32)
  .delay(0.3).delaytime(0.375).delayfeedback(0.35)   // eco a 1/8 puntato


// --- LA BASE: cassa dritta, controtempi, basso e accordi -----------------------
// giro di 4 battute: Lam7 Lam7 Famaj7 Famaj7
// struttura di 16 battute: il basso entra alla 5a, la cassa si ferma nelle ultime 2 (break)

const cassa = s("bd*4").bank('RolandTR909').gain(0.55)
  .mask("<1!14 0!2>")

const clap = s("~ cp ~ cp").bank('RolandTR909').gain(0.28)

const aperto = s("[~ oh]*4").bank('RolandTR909').gain(0.16)          // il charleston aperto in levare

const chiuso = s("hh*16").bank('RolandTR909').gain(".09 .04 .06 .04")

const basso = note("<[~ a1]*4 [~ a1 ~ a1 ~ a1 ~ c2] [~ f1]*4 [~ f1 ~ f1 ~ f1 ~ g1]>")
  .s('sawtooth').lpf(380)
  .attack(0.005).decay(0.12).sustain(0.3).release(0.05)
  .gain(0.7)
  .mask("<0!4 1!12>")

const accordi = note("<[a3,c4,e4,g4]!2 [f3,a3,c4,e4]!2>")
  .s('sawtooth')
  .lpf(sine.slow(16).range(600, 1800))   // il filtro si apre e si chiude lentamente
  .attack(0.4).release(1)
  .gain(0.1)
  .delay(0.25).delaytime(0.75).delayfeedback(0.3)

// la base parte insieme alla prima n che tocca il bordo sinistro
const base = stack(cassa, clap, aperto, chiuso, basso, accordi).late(partenza)


// --- TUTTO INSIEME -------------------------------------------------------------
// ripeti() fa ripartire la lettera ogni 18 colonne, incastrata con la precedente
stack(ripeti(lettera), base)
