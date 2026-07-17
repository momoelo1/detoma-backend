const config = require("./utils/config");
const express = require("express");
const app = express();
require("express-async-errors");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const loginRouter = require("./controllers/login");
const userRouter = require("./controllers/users");
const wineRouter = require("./controllers/wines");
const middleware = require("./utils/middleware");
const logger = require("./utils/logger");

mongoose.set("strictQuery", false);

logger.info("connecting to", config.MONGODB_URI);
mongoose
  .connect(config.MONGODB_URI)
  .then(() => logger.info("connected to mongoDB"))
  .catch((e) => {
    logger.error("error connecting to mongoDB", e);
    process.exit(1);
  });

const toOrigin = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowed = [process.env.CLIENT_URL, process.env.CLIENT_URL_ALT]
        .filter(Boolean)
        .map(toOrigin)
        .filter(Boolean);

      if (allowed.includes(origin)) return callback(null, true);
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      if (/^http:\/\/(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+:5173$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet());
// 10kb bastava per login/account, ma il form vini incolla le foto come
// data URI dentro il JSON (spesso centinaia di KB, anche qualche MB) —
// serve un limite più permissivo per non rifiutare ogni salvataggio con foto
app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());
app.use(middleware.requestLogger);

// limita i tentativi sugli endpoint di credenziali (bruteforce)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Troppi tentativi. Riprova più tardi." },
});
app.use("/api/login", authLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/login", loginRouter);
app.use("/api/users", userRouter);
app.use("/api/wines", wineRouter);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

module.exports = app;
