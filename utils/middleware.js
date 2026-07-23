const jwt = require("jsonwebtoken");
const logger = require("./logger");
const User = require("../models/User");

const getTokenFrom = async (req) => {
  const accessCookie = req.cookies?.accessToken;
  const authHeader = req.headers?.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const token = accessCookie || bearerToken;
  if (!token) return null;

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET);
    if (!decodedToken?.userId) return null;
    return await User.findById(decodedToken.userId);
  } catch (error) {
    logger.error("Failed to verify access token", error);
    return null;
  }
};

const requestLogger = (req, res, next) => {
  logger.info("Method:", req.method, "Path:", req.path);
  next();
};

const unknownEndpoint = (req, res) => {
  res.status(404).json({ error: "unknown endpoint" });
};

// messaggi in italiano semplice per l'admin: il messaggio grezzo di
// Mongoose ("Wine validation failed: annate.0.anno: Path `anno` is
// required.") non significa nulla per chi non programma
const FRIENDLY_FIELD_MESSAGES = {
  name: "Il nome del vino è obbligatorio.",
  category: "La categoria del vino non è valida.",
  "annate.anno": "Manca l'annata su una delle righe di prezzo.",
  "annate.prezzo": "Manca il prezzo su una delle righe.",
  username: "Lo username non è valido.",
  email: "L'email non è valida.",
  password: "La password non rispetta i requisiti richiesti.",
};

const friendlyValidationMessage = (error) => {
  // la chiave in error.errors porta il percorso completo ("annate.0.anno"),
  // ma detail.path è relativo al subdocument (solo "anno") — serve la chiave
  const firstKey = Object.keys(error.errors)[0];
  const segments = firstKey.split(".");
  const field = segments[segments.length - 1];
  const lookupKey = segments[0] === "annate" ? `annate.${field}` : field;
  return FRIENDLY_FIELD_MESSAGES[lookupKey] || `Il campo "${field}" non è valido.`;
};

const errorHandler = (error, req, res, next) => {
  if (error.name === "CastError") {
    return res.status(400).json({ error: "Dato non valido nella richiesta." });
  } else if (error.name === "ValidationError") {
    return res.status(400).json({ error: friendlyValidationMessage(error) });
  } else if (
    error.name === "MongoServerError" &&
    error.message.includes("E11000 duplicate key error")
  ) {
    return res.status(400).json({ error: "Esiste già un elemento con questi dati." });
  } else if (error.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Sessione non valida, accedi di nuovo." });
  }
  logger.error("Unhandled error", error);
  return res.status(500).json({ error: "Errore del server. Riprova più tardi." });
};

// C'è un solo utente possibile: essere autenticati equivale a essere
// il titolare. Nessuna logica di ruoli/permessi, a differenza di KoZmo.
const tokenExtractor = async (req, res, next) => {
  const user = await getTokenFrom(req);
  if (!user) {
    return res.status(401).json({ error: "authentication required" });
  }
  req.user = user;
  next();
};

const optionalTokenExtractor = async (req, res, next) => {
  req.user = (await getTokenFrom(req)) || null;
  next();
};

module.exports = {
  requestLogger,
  errorHandler,
  unknownEndpoint,
  tokenExtractor,
  optionalTokenExtractor,
  getTokenFrom,
};
