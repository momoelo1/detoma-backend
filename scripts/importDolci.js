// Template di importazione per la categoria "liquorosi": incolla i dati
// reali in DOLCI e lancia lo script una volta. Rifiuta l'esecuzione
// se la categoria contiene già documenti (vedi guard sotto).
// Uso: node scripts/importDolci.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const DOLCI = [
  // incolla qui i dati reali (name, regione, description, ...)
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "liquorosi" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} dolci/passiti nel database — importazione annullata.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = DOLCI.map((w) => ({ ...w, category: "liquorosi" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} dolci/passiti.`);

  await mongoose.disconnect();
};

run();
