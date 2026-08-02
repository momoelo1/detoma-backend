const mongoose = require("mongoose");

// i due reparti della pagina Alimentari (data.js → ALIMENTARI_CATEGORIES)
const REPARTI = ["gastronomia", "dolceria"];

const AlimentareSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, enum: REPARTI },
    // raggruppamento interno al reparto (es. "Formaggi", "Salumi",
    // "Biscotti"): testo libero, NON un elenco chiuso — i gruppi si
    // ricavano dai valori presenti, così l'admin può inventarne di nuovi
    // senza toccare il codice. Vuoto = prodotto senza sottogruppo.
    sottocategoria: { type: String },
    // es. "Formaggio", "Salume", "Conserva": sottotitolo della card
    tipo: { type: String },
    // peso in grammi, numero puro (es. 250 per "250g") — stessa scelta
    // fatta per il formato delle birre in centilitri: l'unità è implicita
    // e fissa, così non si mescolano "250 g"/"0,25 kg"/"250gr"
    formato: { type: Number },
    description: { type: String },
    img: { type: String },
    // prezzo singolo: il cibo non ha annate come i vini
    prezzo: { type: Number },
  },
  { timestamps: true },
);

AlimentareSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

AlimentareSchema.statics.REPARTI = REPARTI;

module.exports = mongoose.model("Alimentare", AlimentareSchema);
