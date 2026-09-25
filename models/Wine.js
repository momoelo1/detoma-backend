const mongoose = require("mongoose");

// stesse categorie già in uso sul sito pubblico (data.js → WINE_CATEGORIES)
const CATEGORIES = ["rossi", "bianchi", "rosati", "spumanti", "champagne", "liquorosi"];

// un formato dell'annata: la bottiglia in cui quel vino di quell'anno si
// vende, con il suo prezzo. Lo stesso anno può averne più di uno (750 e
// magnum), ed è per questo che il prezzo sta qui e non sull'annata.
const FormatoSchema = new mongoose.Schema(
  {
    // FACOLTATIVO, ed è la spunta nel form ad accenderlo: `ml` vuoto vale
    // bottiglia standard. Il negozio annota solo i formati fuori misura,
    // esattamente come fa già a mano nei nomi ("(375 ml)", "Magnum"):
    // nessuno deve scrivere 750 su cinquecento vini.
    ml: { type: Number },
    // Facoltativo anche lui, ma con un ripiego invece del vuoto: una riga
    // salvata senza prezzo vale ZERO, che sul sito è già "prezzo assente"
    // (utils/prezzo.js legge `prezzo > 0`, e le 56 schede mai prezzate in
    // produzione sono esattamente così). Niente `required`: il negozio
    // salva il formato e ci mette il prezzo quando ce l'ha.
    prezzo: { type: Number, default: 0 },
  },
  { _id: false },
);

const AnnataSchema = new mongoose.Schema(
  {
    // obbligatoria per tutte le categorie tranne champagne, che non
    // ha un'annata da indicare in etichetta. Se in futuro un'altra
    // categoria smette di chiedere l'annata nel form admin, va
    // aggiunta anche qui, altrimenti il salvataggio fallirà di nuovo.
    anno: {
      type: String,
      required: function () {
        return this.parent().category !== "champagne";
      },
    },
    formati: [FormatoSchema],
    // LEGACY. Il prezzo è passato dentro `formati`, ma questo campo NON si
    // può togliere dallo schema finché i dati in produzione non sono
    // migrati: Mongoose restituisce solo i path che conosce, quindi
    // cancellarlo qui farebbe sparire il prezzo da tutti i vini già
    // salvati — cioè da tutto il catalogo. Chi legge prova prima
    // `formati`, poi ricade qui (utils/prezzo.js lato sito).
    // Lo toglie `scripts/migraPrezziInFormati.js`, quando lo si lancia.
    prezzo: { type: Number },
  },
  { _id: false },
);

const WineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, enum: CATEGORIES },
    regione: { type: String },
    paese: { type: String },
    colore: { type: String },
    anno: { type: String },
    description: { type: String },
    // selezione della casa: il prodotto compare nella tab "Consigliati"
    // dell'Enoteca e porta una stella sulla sua card. Sì o no, niente altro:
    // c'era anche `consiglio`, il perché scritto a mano dal negozio, ed è
    // stato tolto — una nota per prodotto non l'avrebbe scritta nessuno
    consigliato: { type: Boolean, default: false },
    // messo in archivio dal pannello: il negozio non lo ha in vendita adesso
    // ma non vuole perderlo. Sparisce da tutti gli elenchi (sito e pannello)
    // e ricompare nella sezione Archivio, da cui si ripristina. I documenti
    // che il campo non ce l'hanno contano come NON archiviati — vedi
    // `filtroArchivio` in utils/query.js, che per questo usa $ne e non false.
    archiviato: { type: Boolean, default: false },
    // Le foto della bottiglia, in ordine. La PRIMA è quella che si vede sulla
    // card in catalogo e nella fascia della home; nella scheda prodotto
    // scorrono tutte, una ogni sei secondi.
    //
    // Era una stringa sola fino al 2026-09-09, e in produzione lo è ancora per
    // tutti i 383 vini: 71 con un URL, 2 con la stringa vuota, 310 senza il
    // campo. NON serve nessuno script di migrazione, e non perché "tanto
    // funziona" ma perché è stato provato (mongodb in memoria, documenti
    // scritti con il driver grezzo e riletti da questo modello):
    //
    //   img: "https://…"  → letto come  ["https://…"]
    //   img: ""           → letto come  [""]        ← attenzione, vedi sotto
    //   img: assente      → letto come  []
    //   img: ["a","b"]    → letto come  ["a","b"]
    //
    // e in scrittura `new Wine({ img: "https://…" })` salva ["https://…"].
    // Mongoose avvolge da sé lo scalare, quindi il vecchio e il nuovo formato
    // convivono e la migrazione si può fare (o non fare) con comodo.
    //
    // IL CASO CHE MORDE è il secondo: una foto cancellata lasciava "" e ora
    // rileggerla dà un array di UN elemento vuoto, che ha `length` 1 e in JS è
    // pure truthy. Chi legge deve filtrare i valori vuoti, non contare gli
    // elementi — lato sito lo fa `elencoFoto` in utils/cloudinary.js, e qui
    // sotto DELETE /:id/image ora azzera con [] invece che con "".
    img: [String],
    prezzo: { type: Number },
    annate: [AnnataSchema],
  },
  { timestamps: true },
);

WineSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

WineSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model("Wine", WineSchema);
