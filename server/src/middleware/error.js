const env = require("../config/env");

function notFound(req, res) {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
  res.status(404).type("html").send(page("404 - Link not found", "This short link does not exist."));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.code === 11000) return res.status(409).json({ error: "Already exists" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 && env.isProd ? "Internal server error" : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}

function page(title, msg) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center"><h1 style="margin:0 0 8px">${title}</h1><p style="color:#94a3b8">${msg}</p>
<a style="color:#818cf8" href="/">Go home</a></div></body>`;
}

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Interstitial for links the threat model rated "suspicious" (not bad enough to block). No click is recorded here.
function warnPage(code, destination) {
  let host = destination;
  try {
    host = new URL(destination).host;
  } catch { /* keep raw text */ }
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Warning - suspicious link</title><body style="font-family:system-ui;background:#0b1220;color:#e5e7eb;display:grid;place-items:center;height:100vh;margin:0">
<div style="text-align:center;max-width:520px;padding:24px"><h1 style="margin:0 0 8px;color:#fbbf24">Be careful: this link looks suspicious</h1>
<p style="color:#94a3b8">Our automated check rated this short link as potentially unsafe. It leads to <b style="color:#e5e7eb">${esc(host)}</b>.
Only continue if you trust whoever sent it.</p>
<p><a style="color:#818cf8;margin-right:16px" href="/">Take me to safety</a>
<a style="color:#f87171" href="/${encodeURIComponent(code)}?proceed=1">Continue anyway</a></p></div></body>`;
}

module.exports = { notFound, errorHandler, page, warnPage };
