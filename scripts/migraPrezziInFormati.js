// Migrazione UNA TANTUM: sposta il prezzo dall'annata dentro il formato.
//
// PRIMA:  annate: [ { anno: "2019", prezzo: 30 } ]
// DOPO:   annate: [ { anno: "2019", formati: [ { prezzo: 30 } ] } ]
//
// Il formato nasce senza `ml`, che vuol dire "bottiglia standard": è la
// lettura giusta per il catalogo di oggi, dove il formato fuori misura è
// scritto nel NOME e non nei dati (51 vini su 533 — vedi in fondo).
//
// PERCHÉ SERVE. `annate[].prezzo` è rimasto nello schema apposta come
// ripiego, e il sito lo legge quando `formati` manca (utils/prezzo.js →
// formatiAnnata). Quindi il catalogo funziona anche SENZA lanciare questo
// script: nessuna fretta, nessuna finestra di disservizio. Lo si lancia per
// chiudere il doppio binario, e solo dopo si potrà togliere il campo legacy
// da models/Wine.js.
//
// NOTE PER CHI LANCIA LO SCRIPT:
// - `--dry-run` PRIMA. Sempre. Si connette alla Atlas di PRODUZIONE via
//   .env: non c'è staging, il database è quello vero del negozio.
// - È idempotente: un'annata che ha già `formati` non viene toccata, quindi
//   rilanciarlo non raddoppia niente.
// - Non tocca `anno`, né i vini senza annate, né il `prezzo` di primo
//   livello (`Wine.prezzo`), che è un'altra cosa e non è in uso sui vini.
// - Lo ZERO non diventa un formato prezzato: `prezzo: 0` sono le schede mai
//   prezzate e il sito già le tratta come senza prezzo. Diventano un formato
//   standard SENZA prezzo, che è la verità.
//
// PROVA A VUOTO del 2026-08-26 sulla produzione (nessuna scrittura):
//   vini in catalogo 533 · vini toccati 533 · annate migrate 533
//   di cui 56 senza prezzo (erano a zero)
//   Ogni vino ha esattamente un'annata, tutte col vecchio prezzo piatto.
//
// Uso: node scripts/migraPrezziInFormati.js [--dry-run]
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const dryRun = process.argv.includes("--dry-run");

// un'annata è da migrare se ha il vecchio prezzo piatto e non ha già formati
const daMigrare = (a) => !a.formati?.length && a.prezzo != null;

const migraAnnata = (a) => ({
  anno: a.anno,
  // zero = mai prezzata: formato standard, senza prezzo
  formati: a.prezzo > 0 ? [{ prezzo: a.prezzo }] : [{}],
});

const main = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI mancante: controlla il .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(dryRun ? "== PROVA A VUOTO (nessuna scrittura) ==" : "== MIGRAZIONE VERA ==");

  const wines = await Wine.find({});
  let toccati = 0;
  let annateMigrate = 0;
  let senzaPrezzo = 0;

  for (const wine of wines) {
    const annate = wine.annate ?? [];
    if (!annate.some(daMigrare)) continue;

    const nuove = annate.map((a) => {
      if (!daMigrare(a)) return a.toObject ? a.toObject() : a;
      annateMigrate += 1;
      if (!(a.prezzo > 0)) senzaPrezzo += 1;
      return migraAnnata(a);
    });

    toccati += 1;
    console.log(
      `  ${wine.category.padEnd(10)} ${wine.name.trim().slice(0, 46).padEnd(46)} ` +
        annate.map((a) => `${a.anno || "—"}:${a.prezzo ?? "—"}`).join(" ") +
        "  ->  " +
        nuove
          .map((a) => `${a.anno || "—"}:[${(a.formati ?? []).map((f) => f.prezzo ?? "—").join(",")}]`)
          .join(" "),
    );

    if (!dryRun) {
      wine.annate = nuove;
      // il campo legacy sparisce solo qui, a formati scritti
      wine.annate.forEach((a) => {
        a.prezzo = undefined;
      });
      await wine.save();
    }
  }

  console.log("");
  console.log(`vini in catalogo:      ${wines.length}`);
  console.log(`vini toccati:          ${toccati}`);
  console.log(`annate migrate:        ${annateMigrate}`);
  console.log(`  di cui senza prezzo: ${senzaPrezzo} (erano a zero)`);
  if (dryRun) console.log("\nNiente è stato scritto. Rilancia senza --dry-run per applicare.");

  await mongoose.connection.close();
};

main().catch(async (err) => {
  console.error("Migrazione fallita:", err.message);
  await mongoose.connection.close();
  process.exit(1);
});
