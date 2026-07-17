// Template di importazione per la categoria "champagne": incolla i dati
// reali in CHAMPAGNE e lancia lo script una volta. Rifiuta l'esecuzione
// se la categoria contiene già documenti (vedi guard sotto).
// Uso: node scripts/importChampagne.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const CHAMPAGNE = [
  // incolla qui i dati reali (name, regione, description, ...)
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "champagne" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} champagne nel database — importazione annullata.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = CHAMPAGNE.map((w) => ({ ...w, category: "champagne" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} champagne.`);

  await mongoose.disconnect();
};

run();
