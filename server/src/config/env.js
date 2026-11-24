require("dotenv").config({ quiet: true });

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

if (!process.env.JWT_SECRET) {
  if (isProd) {
    throw new Error("JWT_SECRET is required in production (set it in .env)");
  }
  console.warn("[env] JWT_SECRET not set - using an insecure dev/test secret.");
}

const port = Number(process.env.PORT) || 8001;

module.exports = {
  isProd,
  isTest,
  port,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/url_shortener",
  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // Where the React dev server runs (CORS allow-list). Comma separated.
  clientUrl: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Public base used to build short links shown in the UI.
  baseUrl: (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, ""),
  redisUrl: process.env.REDIS_URL || "",
  // Anyone signing up with this email becomes ADMIN.
  adminEmail: (process.env.ADMIN_EMAIL || "").toLowerCase(),
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 3600,
  // --- ML malicious-URL detection ---
  threatEnabled: process.env.THREAT_DETECTION !== "off",
  threatFlagThreshold: Number(process.env.THREAT_FLAG_THRESHOLD) || 0.5, // warn (interstitial) at or above
  threatBlockThreshold: Number(process.env.THREAT_BLOCK_THRESHOLD) || 0.9, // refuse to create at or above
  // Hosts (and their sub-domains) that skip the model, comma separated.
  trustedDomains: (process.env.TRUSTED_DOMAINS || "csvtu.ac.in")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  // --- LLM features (optional; everything degrades gracefully without a key) ---
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
};
