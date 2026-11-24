const Url = require("../models/url");
const Click = require("../models/click");
const AppError = require("../utils/AppError");
const { randomBase62 } = require("../utils/base62");
const cache = require("./cache");
const threat = require("./threatService");
const ai = require("./aiService");

const RESERVED = new Set([
  "api", "login", "signup", "dashboard", "admin", "assets", "create", "links",
  "health", "favicon.ico", "robots.txt", "static", "logout",
]);
const CODE_RE = /^[A-Za-z0-9_-]{3,30}$/;

const isReserved = (code) => RESERVED.has(code.toLowerCase());
const isValidCode = (code) => CODE_RE.test(code) && !isReserved(code);

async function createUrl({ userId, originalUrl, alias, expiresAt }) {
  // 1) ML threat check: refuse clearly malicious links, remember the score of borderline ones.
  const risk = threat.assess(originalUrl);
  if (risk.level === "blocked") {
    throw new AppError(422, "This link was blocked because it looks like a phishing or malware URL", {
      riskScore: risk.score,
      reasons: risk.reasons,
    });
  }
  const extra = {
    riskScore: risk.score,
    riskLevel: risk.level === "suspicious" ? "suspicious" : "safe",
    category: ai.heuristicCategory(originalUrl),
  };
  const doc = await insert({ userId, originalUrl, alias, expiresAt, extra });
  doc.$locals.risk = risk;
  refineCategory(doc); // fire-and-forget, only does anything when an LLM key is configured
  return doc;
}

// Improve the keyword category with the LLM in the background; the response never waits on it.
function refineCategory(doc) {
  if (!ai.isEnabled()) return;
  ai.llmCategory(doc.originalUrl)
    .then((category) => Url.updateOne({ _id: doc._id }, { category }))
    .catch((e) => console.warn("[ai] categorise failed:", e.message));
}

async function insert({ userId, originalUrl, alias, expiresAt, extra }) {
  if (alias) {
    if (!CODE_RE.test(alias)) throw new AppError(400, "Alias must be 3-30 characters: letters, numbers, - or _");
    if (isReserved(alias)) throw new AppError(400, "That alias is reserved");
    try {
      return await Url.create({
        shortCode: alias, originalUrl, createdBy: userId, isCustomAlias: true, expiresAt: expiresAt || null, ...extra,
      });
    } catch (e) {
      if (e.code === 11000) throw new AppError(409, "That alias is already taken");
      throw e;
    }
  }

  // Random base62 code; the unique index guarantees correctness, we just retry on a collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortCode = randomBase62(7);
    if (isReserved(shortCode)) continue;
    try {
      return await Url.create({ shortCode, originalUrl, createdBy: userId, expiresAt: expiresAt || null, ...extra });
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
  }
  throw new AppError(503, "Could not generate a unique short code, please retry");
}

// Resolve a code for redirecting: cache first, DB on a miss.
async function resolve(code) {
  let info = await cache.get(code);
  if (!info) {
    const doc = await Url.findOne({ shortCode: code }).lean();
    if (!doc) return null;
    info = {
      id: String(doc._id),
      originalUrl: doc.originalUrl,
      isActive: doc.isActive,
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
      riskLevel: doc.riskLevel || "safe",
    };
    await cache.set(code, info);
  }
  return info;
}

async function findOwned(id, user) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw new AppError(404, "Link not found");
  const doc = await Url.findById(id);
  if (!doc) throw new AppError(404, "Link not found");
  if (user.role !== "ADMIN" && String(doc.createdBy) !== String(user._id)) {
    throw new AppError(404, "Link not found");
  }
  return doc;
}

async function updateUrl(id, user, { isActive, expiresAt }) {
  const doc = await findOwned(id, user);
  if (isActive !== undefined) doc.isActive = isActive;
  if (expiresAt !== undefined) doc.expiresAt = expiresAt; // null clears expiry
  await doc.save();
  await cache.del(doc.shortCode);
  return doc;
}

async function deleteUrl(id, user) {
  const doc = await findOwned(id, user);
  await Promise.all([Url.deleteOne({ _id: doc._id }), Click.deleteMany({ url: doc._id }), cache.del(doc.shortCode)]);
}

// Alias suggestions: LLM when configured, otherwise heuristics; always filtered to valid, unused codes.
async function suggestAliases(url) {
  let candidates = [];
  let source = "heuristic";
  if (ai.isEnabled()) {
    try {
      candidates = await ai.llmAliases(url);
      source = "ai";
    } catch (e) {
      console.warn("[ai] alias suggestion failed:", e.message);
    }
  }
  candidates = [...candidates, ...ai.heuristicAliases(url)];
  const unique = [...new Set(candidates.filter((c) => isValidCode(c)))];
  const taken = new Set((await Url.find({ shortCode: { $in: unique } }).select("shortCode").lean()).map((d) => d.shortCode));
  const suggestions = unique.filter((c) => !taken.has(c)).slice(0, 5);
  return { source: suggestions.length && source === "ai" ? "ai" : "heuristic", suggestions };
}

module.exports = { suggestAliases, createUrl, resolve, findOwned, updateUrl, deleteUrl, isValidCode, isReserved, RESERVED };
