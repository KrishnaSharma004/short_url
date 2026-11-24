const Url = require("../models/url");
const env = require("../config/env");
const urlService = require("../services/urlService");
const { getAnalytics } = require("../services/analyticsService");
const threat = require("../services/threatService");
const ai = require("../services/aiService");

function serialize(doc, owner) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(d._id),
    shortCode: d.shortCode,
    shortUrl: `${env.baseUrl}/${d.shortCode}`,
    originalUrl: d.originalUrl,
    isCustomAlias: d.isCustomAlias,
    isActive: d.isActive,
    expiresAt: d.expiresAt,
    expired: !!d.expiresAt && new Date(d.expiresAt) <= new Date(),
    clickCount: d.clickCount,
    riskScore: d.riskScore ?? 0,
    riskLevel: d.riskLevel || "safe",
    category: d.category || "Other",
    createdAt: d.createdAt,
    ...(owner ? { owner } : {}),
  };
}

async function create(req, res) {
  const doc = await urlService.createUrl({
    userId: req.user._id,
    originalUrl: req.body.url,
    alias: req.body.alias,
    expiresAt: req.body.expiresAt,
  });
  const risk = doc.$locals.risk;
  res.status(201).json({ url: serialize(doc), ...(risk && risk.level === "suspicious" ? { warning: { score: risk.score, reasons: risk.reasons } } : {}) });
}

// Preview the ML verdict for a URL before creating a link.
async function check(req, res) {
  res.json({ risk: threat.assess(req.body.url) });
}

async function suggestAlias(req, res) {
  res.json(await urlService.suggestAliases(req.body.url));
}

async function ask(req, res) {
  const doc = await urlService.findOwned(req.params.id, req.user);
  const data = await getAnalytics(doc, 30);
  res.json({ answer: await ai.askAboutAnalytics(doc, data, req.body.question) });
}

async function list(req, res) {
  const docs = await Url.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ urls: docs.map((d) => serialize(d)) });
}

async function update(req, res) {
  const doc = await urlService.updateUrl(req.params.id, req.user, req.body);
  res.json({ url: serialize(doc) });
}

async function remove(req, res) {
  await urlService.deleteUrl(req.params.id, req.user);
  res.json({ ok: true });
}

async function analytics(req, res) {
  const doc = await urlService.findOwned(req.params.id, req.user);
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);
  res.json({ url: serialize(doc), analytics: await getAnalytics(doc, days) });
}

module.exports = { create, list, update, remove, analytics, serialize, check, suggestAlias, ask };
