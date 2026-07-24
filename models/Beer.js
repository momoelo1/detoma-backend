const mongoose = require("mongoose");

// stessi birrifici già in uso sul sito pubblico (data.js → BEER_CATEGORIES);
// il campo si chiama "producer" perché è quello che rappresenta davvero
// (il birrificio), non una categoria di stile
const PRODUCERS = [
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
    producer: { type: String, required: true, enum: PRODUCERS },
    stile: { type: String },
    colore: { type: String },
    gradazione: { type: String },
    // formato bottiglia/lattina in centilitri, es. 33 per "33cl" — numero
    // puro, l'unità è implicita e fissa (niente "33cl"/"0,33l" misti)
    formato: { type: Number },
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

BeerSchema.statics.PRODUCERS = PRODUCERS;

module.exports = mongoose.model("Beer", BeerSchema);
