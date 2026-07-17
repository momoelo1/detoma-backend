const bcrypt = require("bcrypt");
const loginRouter = require("express").Router();
const User = require("../models/User");
const { generateToken, setCookies, clearCookies } = require("./auth");
const { tokenExtractor } = require("../utils/middleware");
const logger = require("../utils/logger");

// login con username + password
loginRouter.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const accessToken = generateToken(user._id);
      setCookies(res, accessToken);
      return res.status(200).json({
        id: user._id,
        username: user.username,
        email: user.email,
      });
    }
    return res.status(401).json({ error: "Credenziali non valide" });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// sessione corrente: permette al frontend di sapere se è già collegato
// (es. dopo un refresh della pagina)
loginRouter.get("/", tokenExtractor, (req, res) => {
  const { _id: id, username, email } = req.user;
  res.status(200).json({ id, username, email });
});

loginRouter.post("/logout", (req, res) => {
  clearCookies(res);
  res.status(204).end();
});

module.exports = loginRouter;
