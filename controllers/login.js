const bcrypt = require("bcrypt");
const loginRouter = require("express").Router();
const User = require("../models/User");
const { generateToken, setCookies, clearCookies } = require("./auth");
const { tokenExtractor, optionalTokenExtractor } = require("../utils/middleware");
const logger = require("../utils/logger");

// login con username + password
loginRouter.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const accessToken = generateToken(user._id, user.tokenVersion);
      setCookies(res, accessToken);
      return res.status(200).json({
        id: user._id,
        username: user.username,
        email: user.email,
        token: accessToken,
      });
    }
    return res.status(401).json({ error: "Credenziali non valide" });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

loginRouter.get("/", tokenExtractor, (req, res) => {
  const { _id: id, username, email } = req.user;
  res.status(200).json({ id, username, email });
});

// `optionalTokenExtractor` e non `tokenExtractor`: uscire deve riuscire
// anche con un token già scaduto o assente, altrimenti l'unico modo di
// "chiudere" una sessione morta sarebbe un 401. Se invece il token è
// ancora buono, incrementiamo tokenVersion: da quel momento tutte le
// copie di quel token (cookie, localStorage, una eventualmente rubata)
// vengono rifiutate, non solo quella nel browser che sta uscendo.
loginRouter.post("/logout", optionalTokenExtractor, async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  }
  clearCookies(res);
  res.status(204).end();
});

module.exports = loginRouter;
