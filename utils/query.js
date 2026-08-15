// Pezzi di query condivisi dai tre elenchi pubblici (vini, birre, alimentari).

// Quanti documenti al massimo può chiedere un client con ?limit=.
// Il tetto non è per il database ma per la banda del telefono: senza, un
// limite scritto male (o curioso) riporterebbe il catalogo intero.
const MAX_LIMIT = 200;

// ?limit=N: quanti documenti tornare. Serve alla vetrina della home, che ne
// mostra venti e senza questo si scaricava tutto il catalogo (534 vini,
// 153 KB) per poi buttarne il 96% — l'attesa più lunga di tutto il sito.
//
// Un valore non numerico, zero o negativo vale come "nessun limite": una
// query storta non deve mai svuotare un elenco, al massimo lo lascia intero.
// Torna 0 in quel caso, che per Mongoose è già "tutti" — così chi chiama non
// ha bisogno di un ramo a parte.
const limiteDaQuery = (limit) => {
  const n = Number.parseInt(limit, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_LIMIT) : 0;
};

module.exports = { limiteDaQuery, MAX_LIMIT };
