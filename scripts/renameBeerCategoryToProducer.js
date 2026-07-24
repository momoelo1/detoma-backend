// Migrazione UNA TANTUM: i 36 documenti birra già in produzione hanno
// ancora il campo `category` (nome vecchio); lo schema ora usa `producer`.
// Rinomina il campo sui documenti esistenti senza toccare i dati.
// Uso: node scripts/renameBeerCategoryToProducer.js
require("dotenv").config();
const mongoose = require("mongoose");
const config = require("../utils/config");

const run = async () => {
  await mongoose.connect(config.MONGODB_URI);

  const result = await mongoose.connection.db
    .collection("beers")
    .updateMany({ category: { $exists: true } }, { $rename: { category: "producer" } });
  console.log(`Rinominato "category" -> "producer" su ${result.modifiedCount} documenti.`);

  await mongoose.disconnect();
};

run();
