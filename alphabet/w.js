// =====================================================================
// LETTERA W
// =====================================================================

// --- FORMA ---------------------------------------------------------------
// 24 colonne x 16 righe: '#' = pixel pieno (suona), '.' = vuoto
// righe 0-3 ascendenti, 4-11 x-height (riga 11 = linea di base), 12-15 discendenti
// la pagina legge da qui anche il disegno della lettera (barra in alto e pianoroll)
const forma = [
  '........................',
  '........................',
  '........................',
  '........................',
  '.......#...#...#........',
  '.......#...#...#........',
  '.......#..#.#..#........',
  '.......#..#.#..#........',
  '........#.#.#.#.........',
  '........#.#.#.#.........',
  '.........#...#..........',
  '.........#...#..........',
  '........................',
  '........................',
  '........................',
  '........................',
]


// --- BEAT (per ora uguale per tutte le lettere) ---------------------------
// codice Strudel: l'ultima espressione è quella che suona.
// la pagina pensa da sola all'ingresso da destra, alla pausa e al reset.
// (tra "doppie virgolette" Strudel legge la mini-notazione, es. "bd sd")

setcps(0.5)   // velocità: cicli al secondo

// uno strumento per riga, dall'alto in basso
const suoni = [
  'cr','rd','rd','oh',                      // ascendenti
  'hh','hh','rim','ht','cp','mt','sd','bd', // x-height (la cassa sulla linea di base)
  'lt','lt','bd','bd',                      // discendenti
]

// la lettera senza le colonne vuote ai lati: ogni colonna è un passo
const righe = ritaglia(forma)

// ogni '#' suona il suono della sua riga
stack(...righe.map((riga, r) =>
  s(seq(...riga.split('').map(c => c === '#' ? suoni[r] : silence)))
    .note(47 - r)   // riga 11 (linea di base) = nota 36, la cassa suona all'altezza originale
))
  .slow(righe[0].length / 24)   // ogni passo dura 1/24 di ciclo: la lettera si ripete all'infinito
  .bank('RolandTR909')
