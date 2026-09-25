// Pezzi di query condivisi dai tre elenchi pubblici (vini, birre, alimentari).

// Quanti documenti al massimo può chiedere un client con ?limit=.
// Il tetto non è per il database ma per la banda del telefono: senza, un
// limite scritto male (o curioso) riporterebbe il catalogo intero.
const MAX_LIMIT = 200;

const limiteDaQuery = (limit) => {
  const n = Number.parseInt(limit, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_LIMIT) : 0;
};

// ?archiviato=true: SOLO i prodotti messi in archivio (la sezione Archivio del
// pannello). Senza, l'elenco li esclude — ed è il caso di tutti gli altri:
// il sito, la vetrina della home, i Consigliati e le griglie del pannello.
//
// `$ne: true` e non `false`: i prodotti salvati prima che il campo esistesse
// non ce l'hanno proprio, e `archiviato: false` li nasconderebbe tutti.
const filtroArchivio = (archiviato) =>
  archiviato === "true" ? { archiviato: true } : { archiviato: { $ne: true } };

module.exports = { limiteDaQuery, filtroArchivio, MAX_LIMIT };
