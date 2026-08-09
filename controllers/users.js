const bcrypt = require("bcrypt");
const userRouter = require("express").Router();
const User = require("../models/User");
const { tokenExtractor } = require("../utils/middleware");
const { generateToken, setCookies } = require("./auth");

const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

userRouter.post("/", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: "username, email and password required" });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: "username must be at least 3 characters" });
  }

  if (!PASSWORD_RULES.test(password)) {
    return res.status(400).json({ error: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character" });
  }

  // questo backend ammette un solo account: una volta creato, la rotta
  // di creazione si chiude da sola
  const anyUser = await User.findOne({});
  if (anyUser) {
    return res.status(403).json({ error: "an account already exists — this backend allows only one" });
  }

  const userExist = await User.findOne({ email });

  if (userExist) {
    return res.status(400).json({ error: "username and email must be unique" });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const user = new User({ username, email, passwordHash });
  const savedUser = await user.save();

  res.status(201).json(savedUser);
});

// aggiorna username/email/password dell'unico account — richiede di
// essere già autenticati, e solo sul proprio account
userRouter.put("/:id", tokenExtractor, async (req, res) => {
  if (req.params.id !== req.user.id) {
    return res.status(403).json({ error: "you can only update your own account" });
  }

  const { username, email, password } = req.body;
  const update = {};

  if (username) {
    if (username.length < 3) {
      return res.status(400).json({ error: "username must be at least 3 characters" });
    }
    update.username = username;
  }

  if (email) update.email = email;

  // cambiare password revoca tutte le sessioni: è il gesto con cui si
  // reagisce a "credo che qualcuno sia entrato", e senza l'incremento di
  // tokenVersion i token già emessi resterebbero validi fino alla
  // scadenza naturale — cioè la password nuova non servirebbe a niente.
  const passwordChanged = Boolean(password);

  if (password) {
    if (!PASSWORD_RULES.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character" });
    }
    update.passwordHash = await bcrypt.hash(password, 10);
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    passwordChanged ? { $set: update, $inc: { tokenVersion: 1 } } : update,
    { new: true, runValidators: true },
  );

  if (!passwordChanged) {
    return res.status(200).json(updatedUser);
  }

  // la revoca appena fatta vale anche per il token con cui è arrivata
  // questa richiesta: senza un token nuovo, chi cambia la password si
  // troverebbe buttato fuori dal proprio pannello a metà lavoro. Stessa
  // coppia del login — cookie httpOnly + token in chiaro nel corpo, che
  // il client rispecchia in localStorage (Safari/ITP, vedi services/auth.js).
  const accessToken = generateToken(updatedUser._id, updatedUser.tokenVersion);
  setCookies(res, accessToken);
  res.status(200).json({ ...updatedUser.toJSON(), token: accessToken });
});

module.exports = userRouter;