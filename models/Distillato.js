const mongoose = require("mongoose");

// stesse sotto-sezioni già in uso sul sito pubblico (data.js → DISTILLATI_CATEGORIES)
const CATEGORIES = ["grappa", "whisky", "rhum", "liquori", "armagnac-cognac", "calvados"];

// Stessa forma dei vini (models/Wine.js), di proposito: il pannello dei
// distillati è costruito su quello dei vini, e il sito legge i prezzi con le
// stesse funzioni (utils/prezzo.js). Le differenze sono due, qui sotto.
const FormatoSchema = new mongoose.Schema(
  {
    // facoltativo: vuoto vale bottiglia standard, come per i vini
    ml: { type: Number },
    // in bianco vale zero, che il sito legge come "prezzo assente"
    prezzo: { type: Number, default: 0 },
  },
  { _id: false },
);

const AnnataSchema = new mongoose.Schema(
  {
    // PRIMA DIFFERENZA: l'anno qui non è mai obbligatorio. Per la gran parte
    // dei distillati in etichetta non c'è un'annata (al più un'età, "12 anni"),
    // e chi ce l'ha — un whisky millesimato, un armagnac d'annata — la scrive.
    anno: { type: String },
    formati: [FormatoSchema],
  },
  { _id: false },
);

const DistillatoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, enum: CATEGORIES },
    regione: { type: String },
    // SECONDA DIFFERENZA: il paese è testo libero. I vini lo scelgono da un
    // elenco chiuso (COUNTRY_GROUPS lato sito), ma scozzesi, giamaicani o
    // giapponesi in quell'elenco non ci sono: il form li propone con un
    // <datalist> e accetta quelli nuovi.
    paese: { type: String },
    description: { type: String },
    // stella della selezione della casa, come sui vini
    consigliato: { type: Boolean, default: false },
    // le foto in ordine, la prima è la copertina (vedi models/Wine.js)
    img: [String],
    annate: [AnnataSchema],
  },
  { timestamps: true },
);

DistillatoSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

DistillatoSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model("Distillato", DistillatoSchema, "distillati");
