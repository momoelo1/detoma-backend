// Template di importazione per la categoria "bianchi": incolla i dati
// reali in BIANCHI e lancia lo script una volta. Rifiuta l'esecuzione
// se la categoria contiene già documenti (vedi guard sotto).
// Uso: node scripts/importBianchi.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const BIANCHI = [
  // incolla qui i dati reali (name, regione, description, ...)
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "bianchi" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} vini bianchi nel database — importazione annullata.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = BIANCHI.map((w) => ({ ...w, category: "bianchi" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} vini bianchi.`);

  await mongoose.disconnect();
};

run();
