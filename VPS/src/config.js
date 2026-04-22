const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).toLowerCase() === "true";
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

const config = {
  nodeEnv,
  isProduction,
  port: parseInteger(process.env.PORT, 8080),
  autoMigrate: parseBoolean(process.env.AUTO_MIGRATE, true),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:5432/tallybackup_license",
  dbSsl: parseBoolean(process.env.DB_SSL, false),
  jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret-change-me",
  jwtIssuer: process.env.JWT_ISSUER || "tallybackup-pro-license",
  jwtAudience: process.env.JWT_AUDIENCE || "tallybackup-pro-desktop",
  tokenTtlHours: parseInteger(process.env.TOKEN_TTL_HOURS, 168),
  adminApiKey: process.env.ADMIN_API_KEY || "dev-admin-key-change-me"
};

if (isProduction && config.jwtSecret === "dev-jwt-secret-change-me") {
  throw new Error("JWT_SECRET must be set in production.");
}

if (isProduction && config.adminApiKey === "dev-admin-key-change-me") {
  throw new Error("ADMIN_API_KEY must be set in production.");
}

module.exports = config;

