const mongoose = require("mongoose");

// stesse categorie già in uso sul sito pubblico (data.js → WINE_CATEGORIES)
const CATEGORIES = ["rossi", "bianchi", "rosati", "spumanti", "champagne", "liquorosi"];

const AnnataSchema = new mongoose.Schema(
  {
    anno: { type: String, required: true },
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
