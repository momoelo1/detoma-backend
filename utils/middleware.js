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

const errorHandler = (error, req, res, next) => {
  if (error.name === "CastError") {
    return res.status(400).json({ error: error.message });
  } else if (error.name === "ValidationError") {
    return res.status(400).json({ error: error.message });
  } else if (
    error.name === "MongoServerError" &&
    error.message.includes("E11000 duplicate key error")
  ) {
    return res.status(400).json({ error: "duplicate key error" });
  } else if (error.name === "JsonWebTokenError") {
    return res.status(401).json({ error: error.message });
  }
  next(error);
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
