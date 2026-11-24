// Lexical URL features for the malicious-URL classifier.
// This is a line-by-line port of ml/urlfeatures.py - the training script. The two MUST stay identical;
// tests/threat.test.js compares them on held-out URLs. Only the URL text is inspected (no network access).

const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.\-]*:\/\//;
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const PORT_RE = /^(.*):(\d+)$/;

const RISKY_TLDS = new Set(["tk", "ml", "ga", "cf", "gq", "xyz", "top", "info", "biz", "ru", "cn", "pw", "cc", "ws", "su"]);
const KEYWORDS = [
  "login", "signin", "verify", "secure", "account", "update", "bank", "paypal", "confirm", "password",
  "webscr", "ebay", "free", "bonus", "lucky", "download", "install", "crack", "serial", "keygen",
  "porn", "xxx", "casino", "viagra",
];

const FEATURE_NAMES = [
  "len_url", "len_host", "len_path", "len_query",
  "dots", "hyphens", "underscores", "slashes", "digits", "specials", "amps", "equals", "percents",
  "has_at", "digit_ratio", "letter_ratio", "upper_ratio",
  "host_is_ip", "host_labels", "host_digits", "host_hyphens", "tld_len", "tld_risky", "has_port",
  "path_depth", "entropy", "keyword_hits",
  "ext_exe", "ext_zip", "ext_php", "ext_js", "ext_html", "ext_asp", "ext_txt",
  "long_token",
];

const cpLen = (s) => Array.from(s).length; // length in code points, like Python's len()
const lower = (s) => s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32)); // ASCII-only
const count = (s, needle) => s.split(needle).length - 1;
const countWhere = (s, re) => Array.from(s).filter((c) => re.test(c)).length;

function entropy(s) {
  const chars = Array.from(s);
  if (!chars.length) return 0;
  const counts = new Map();
  for (const ch of chars) counts.set(ch, (counts.get(ch) || 0) + 1);
  let h = 0;
  for (const c of counts.values()) {
    const p = c / chars.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function extract(url) {
  const s = String(url).trim().replace(SCHEME_RE, "");
  const low = lower(s);
  const m = s.search(/[/?#]/);
  const hostport = m >= 0 ? s.slice(0, m) : s;
  const rest = m >= 0 ? s.slice(m) : "";
  const hasAt = hostport.includes("@") ? 1 : 0;
  let host = hostport.slice(hostport.lastIndexOf("@") + 1);
  let hasPort = 0;
  const pm = host.match(PORT_RE);
  if (pm) {
    host = pm[1];
    hasPort = 1;
  }
  host = lower(host).replace(/^www\./, "");

  const q = rest.search(/[?#]/);
  const path = q >= 0 ? rest.slice(0, q) : rest;
  const query = q >= 0 ? rest.slice(q + 1) : "";

  const labels = host ? host.split(".") : [];
  const tld = labels.length > 1 ? labels[labels.length - 1] : "";
  const n = Math.max(cpLen(s), 1);
  const digits = countWhere(s, /[0-9]/);
  const letters = countWhere(s, /[A-Za-z]/);
  const uppers = countWhere(s, /[A-Z]/);
  const specials = countWhere(s, /[^A-Za-z0-9]/);
  const tokens = low.split(/[^a-z0-9]+/);

  return [
    cpLen(s), cpLen(host), cpLen(path), cpLen(query),
    count(s, "."), count(s, "-"), count(s, "_"), count(s, "/"), digits, specials, count(s, "&"), count(s, "="), count(s, "%"),
    hasAt, digits / n, letters / n, uppers / n,
    IPV4_RE.test(host) ? 1 : 0, labels.length, countWhere(host, /[0-9]/), count(host, "-"), cpLen(tld),
    RISKY_TLDS.has(tld) ? 1 : 0, hasPort,
    path.split("/").filter(Boolean).length, entropy(low), KEYWORDS.reduce((a, k) => a + count(low, k), 0),
    low.includes(".exe") ? 1 : 0, low.includes(".zip") ? 1 : 0, low.includes(".php") ? 1 : 0, low.includes(".js") ? 1 : 0,
    low.includes(".html") || low.includes(".htm") ? 1 : 0, low.includes(".asp") ? 1 : 0, low.includes(".txt") ? 1 : 0,
    Math.max(0, ...tokens.map((t) => t.length)),
  ];
}

module.exports = { extract, FEATURE_NAMES };
