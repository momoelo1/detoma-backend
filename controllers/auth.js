const jwt = require("jsonwebtoken");

// 8 ore: pensato per una sessione di lavoro (catalogare vini), non per
// il carrello di un cliente — qui non serve la scadenza aggressiva a 15m
const TOKEN_TTL = "8h";
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000;

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.SECRET, { expiresIn: TOKEN_TTL });

// L'hosting non imposta sempre NODE_ENV=production di default, ma le
// piattaforme si annunciano con le proprie variabili (RENDER=true,
// VERCEL=1) — usiamo tutte così il cookie cross-site (frontend su
// GitHub Pages, backend su un altro dominio) funziona a prescindere
// da come sia configurato NODE_ENV sul dashboard.
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER === "true" ||
  process.env.VERCEL === "1";

const setCookies = (res, accessToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "strict",
    secure: isProduction,
    maxAge: COOKIE_MAX_AGE,
  });
};

const clearCookies = (res) => {
  res.clearCookie("accessToken");
};

module.exports = { generateToken, setCookies, clearCookies };
