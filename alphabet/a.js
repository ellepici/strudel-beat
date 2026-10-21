// =====================================================================
// LETTERA A
// =====================================================================

// --- FORMA ---------------------------------------------------------------
// griglia 12 colonne x 24 righe: '#' = pixel pieno (suona), '.' = vuoto
// righe 0-5 ascendenti, 6-17 x-height (riga 17 = linea di base), 18-23 discendenti
// la pagina legge da qui anche il disegno della lettera (barra in alto e pianoroll)
const forma = [
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
  '...#####....',
  '..##...##...',
  '.##.....##..',
  '........##..',
  '.......###..',
  '....###.##..',
  '..###...##..',
  '.##.....##..',
  '.##.....##..',
  '.##.....##..',
  '..##...###..',
  '...####..##.',
  '............',
  '............',
  '............',
  '............',
  '............',
  '............',
]


// --- BEAT -------------------------------------------------------------------
// codice Strudel: l'ultima espressione è quella che suona.
// la pagina pensa da sola all'ingresso da destra, alla pausa e al reset.
// (tra "doppie virgolette" Strudel legge la mini-notazione, es. "bd sd")

setcps(1)   // velocità: cicli al secondo

// uno strumento per riga, dall'alto in basso (24 righe)
const suoni = [
  'cr','cr','rd','rd','oh','oh',                               // ascendenti (righe 0-5)
  'hh','hh','hh','rim','rim','ht','cp','cp','mt','sd','sd','bd', // x-height (righe 6-17, la cassa sulla linea di base)
  'lt','lt','lt','bd','bd','bd',                               // discendenti (righe 18-23)
]

// la lettera senza le colonne vuote ai lati: ogni colonna è un passo
const righe = ritaglia(forma)

// ogni '#' suona il suono della sua riga
stack(...righe.map((riga, r) =>
  s(seq(...riga.split('').map(c => c === '#' ? suoni[r] : silence)))
    .note(53 - r)   // riga 17 (linea di base) = nota 36, la cassa suona all'altezza originale
))
  .slow(righe[0].length / 24)   // ogni passo dura 1/24 di ciclo: la lettera si ripete all'infinito
  .bank('RolandTR909')
