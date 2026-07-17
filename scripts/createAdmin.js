// Crea l'UNICO utente ammesso al pannello. Va eseguito una sola volta.
// Uso: node scripts/createAdmin.js <username> <email> <password>
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const PASSWORD_RULES =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const run = async () => {
  const [username, email, password] = process.argv.slice(2);
  if (!username || !email || !password) {
    console.error("Uso: node scripts/createAdmin.js <username> <email> <password>");
    process.exit(1);
  }
  if (!PASSWORD_RULES.test(password)) {
    console.error(
      "La password deve avere almeno 8 caratteri e includere maiuscola, minuscola, numero e carattere speciale.",
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({});
  if (existing) {
    console.error(
      `Esiste già un utente (${existing.username}). Questo backend ammette un solo account.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await new User({ username, email, passwordHash }).save();
  console.log(`Utente creato: ${user.username} (${user.email})`);

  await mongoose.disconnect();
};

run();
