const env = require("../config/env");
const { extract, FEATURE_NAMES } = require("../ml/features");
const { predictProba } = require("../ml/gbm");

const idx = Object.fromEntries(FEATURE_NAMES.map((n, i) => [n, i]));

// Human-readable signals shown next to the score. They explain the verdict; the verdict itself comes from the model.
function signals(x) {
  const f = (n) => x[idx[n]];
  const out = [];
  if (f("host_is_ip")) out.push("Uses a raw IP address instead of a domain name");
  if (f("has_at")) out.push("Contains an '@' sign, which can hide the real destination");
  if (f("tld_risky")) out.push("Uses a top-level domain often abused for spam and phishing");
  if (f("keyword_hits") >= 2) out.push("Contains several sensitive words such as login, verify, account or free");
  if (f("host_labels") >= 5) out.push("Has an unusually long chain of sub-domains");
  if (f("host_hyphens") >= 3) out.push("Has many hyphens in the domain name");
  if (f("ext_exe") || f("ext_zip")) out.push("Points to an executable or archive download");
  if (f("len_url") > 120) out.push("Unusually long URL");
  if (f("entropy") > 4.6) out.push("Contains long random-looking character sequences");
  return out;
}

function isTrusted(hostname) {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return env.trustedDomains.some((d) => h === d || h.endsWith("." + d));
}

// assess(url) -> { score, level: "safe" | "suspicious" | "blocked", reasons: string[], trusted }
function assess(url) {
  if (!env.threatEnabled) return { score: 0, level: "safe", reasons: [], trusted: false };
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    /* validators already guarantee a parsable URL; keep scoring anyway */
  }
  if (hostname && isTrusted(hostname)) return { score: 0, level: "safe", reasons: [], trusted: true };

  const x = extract(url);
  const score = Math.round(predictProba(x) * 1000) / 1000;
  let level = "safe";
  if (score >= env.threatBlockThreshold) level = "blocked";
  else if (score >= env.threatFlagThreshold) level = "suspicious";
  return { score, level, reasons: level === "safe" ? [] : signals(x), trusted: false };
}

module.exports = { assess };
