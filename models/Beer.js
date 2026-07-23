const mongoose = require("mongoose");

// stesse categorie già in uso sul sito pubblico (data.js → BEER_CATEGORIES),
// qui sono i birrifici, non stili di birra
const CATEGORIES = [
  "32-via-dei-birrai",
  "ribaldi",
  "gjulia",
  "mont-blanc",
  "forte",
  "calabrau",
  "salento",
];

const BeerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, enum: CATEGORIES },
    stile: { type: String },
    colore: { type: String },
    gradazione: { type: String },
    img: { type: String },
    prezzo: { type: Number },
  },
  { timestamps: true },
);

BeerSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

BeerSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model("Beer", BeerSchema);
