const mongoose = require("mongoose");

// stesse categorie già in uso sul sito pubblico (data.js → WINE_CATEGORIES)
const CATEGORIES = ["rossi", "bianchi", "rosati", "spumanti", "champagne", "liquorosi"];

// un formato dell'annata: la bottiglia in cui quel vino di quell'anno si
// vende, con il suo prezzo. Lo stesso anno può averne più di uno (750 e
// magnum), ed è per questo che il prezzo sta qui e non sull'annata.
//
// `ml` vuoto = bottiglia standard. Il negozio annota solo i formati fuori
// misura, esattamente come fa già a mano nei nomi ("(375 ml)", "Magnum"):
// nessuno deve scrivere 750 su cinquecento vini.
const FormatoSchema = new mongoose.Schema(
  {
    ml: { type: Number },
    // facoltativo come lo era sull'annata: la spunta nel form lo slega.
    // Un magnum senza prezzo è il caso vero di "disponibile anche Magnum"
    prezzo: { type: Number },
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
    img: { type: String },
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
