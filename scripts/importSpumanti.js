// Template di importazione per la categoria "spumanti": incolla i dati
// reali in SPUMANTI e lancia lo script una volta. Rifiuta l'esecuzione
// se la categoria contiene già documenti (vedi guard sotto).
// Uso: node scripts/importSpumanti.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const SPUMANTI = [
  // incolla qui i dati reali (name, regione, description, ...)
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "spumanti" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} spumanti nel database — importazione annullata.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = SPUMANTI.map((w) => ({ ...w, category: "spumanti" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} spumanti.`);

  await mongoose.disconnect();
};

run();
