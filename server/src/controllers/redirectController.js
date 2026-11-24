const urlService = require("../services/urlService");
const { recordAsync } = require("../services/clickService");
const { page, warnPage } = require("../middleware/error");

async function redirect(req, res) {
  const code = req.params.code;
  if (!urlService.isValidCode(code)) return res.status(404).type("html").send(page("404 - Link not found", "This short link does not exist."));

  const info = await urlService.resolve(code);
  if (!info || !info.isActive) {
    return res.status(404).type("html").send(page("404 - Link not found", "This short link does not exist or was disabled."));
  }
  if (info.expiresAt && new Date(info.expiresAt) <= new Date()) {
    return res.status(410).type("html").send(page("Link expired", "This short link has expired."));
  }

  // Borderline links the ML model flagged: show a warning first; clicking "continue" adds ?proceed=1.
  if (info.riskLevel === "suspicious" && req.query.proceed !== "1") {
    res.set("Cache-Control", "no-store");
    return res.status(200).type("html").send(warnPage(code, info.originalUrl));
  }

  recordAsync(info, code, req); // async, redirect does not wait for the DB write
  res.set("Cache-Control", "no-store"); // keep analytics accurate
  res.redirect(302, info.originalUrl); // 302 (not 301) so every click reaches the server
}

module.exports = { redirect };
