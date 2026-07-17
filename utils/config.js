require("dotenv").config();

// Vars the app cannot run correctly without. Validated at boot so we fail
// fast with a clear message instead of crashing later with obscure errors.
const REQUIRED_ENV = ["MONGODB_URI", "SECRET", "CLIENT_URL"];

const validateEnv = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `See .env.example for the full list.`,
    );
  }
};

if (process.env.NODE_ENV !== "test") {
  validateEnv();
}

module.exports = {
  PORT: process.env.PORT || 3002,
  MONGODB_URI: process.env.MONGODB_URI,
  SECRET: process.env.SECRET,
};
