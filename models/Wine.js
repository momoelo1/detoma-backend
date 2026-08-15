const mongoose = require("mongoose");

// stesse categorie già in uso sul sito pubblico (data.js → WINE_CATEGORIES)
const CATEGORIES = ["rossi", "bianchi", "rosati", "spumanti", "champagne", "liquorosi"];

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
    prezzo: { type: Number, required: true },
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
