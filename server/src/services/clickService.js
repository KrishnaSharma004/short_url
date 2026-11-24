const { UAParser } = require("ua-parser-js");
const Click = require("../models/click");
const Url = require("../models/url");

function referrerHost(ref) {
  if (!ref) return "Direct";
  try {
    return new URL(ref).hostname.replace(/^www\./, "") || "Direct";
  } catch {
    return "Direct";
  }
}

function buildClick(info, code, req) {
  const ua = new UAParser(req.get("user-agent") || "").getResult();
  const now = new Date();
  return {
    url: info.id,
    shortCode: code,
    timestamp: now,
    day: now.toISOString().slice(0, 10),
    referrer: referrerHost(req.get("referer")),
    browser: ua.browser.name || "Unknown",
    os: ua.os.name || "Unknown",
    device: ua.device.type || "desktop",
  };
}

// Fire-and-forget: the redirect never waits on this.
function recordAsync(info, code, req) {
  const doc = buildClick(info, code, req);
  Promise.all([Click.create(doc), Url.updateOne({ _id: info.id }, { $inc: { clickCount: 1 } })]).catch((e) =>
    console.warn("[click] failed to record:", e.message)
  );
}

module.exports = { recordAsync, referrerHost };
