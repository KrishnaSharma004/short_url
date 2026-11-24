"""Lexical feature extraction for malicious-URL detection.

The same logic is re-implemented in JavaScript (server/src/ml/features.js). A parity
test compares both implementations on thousands of URLs, so keep them in sync.
Only the URL string is inspected - no network request is ever made.
"""
import math
import re

SCHEME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://")
IPV4_RE = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")
PORT_RE = re.compile(r"^(.*):(\d+)$")

RISKY_TLDS = {"tk", "ml", "ga", "cf", "gq", "xyz", "top", "info", "biz", "ru", "cn", "pw", "cc", "ws", "su"}
KEYWORDS = [
    "login", "signin", "verify", "secure", "account", "update", "bank", "paypal", "confirm", "password",
    "webscr", "ebay", "free", "bonus", "lucky", "download", "install", "crack", "serial", "keygen",
    "porn", "xxx", "casino", "viagra",
]
EXTENSIONS = [".exe", ".zip", ".php", ".js", ".html", ".htm", ".asp", ".txt"]

FEATURE_NAMES = [
    "len_url", "len_host", "len_path", "len_query",
    "dots", "hyphens", "underscores", "slashes", "digits", "specials", "amps", "equals", "percents",
    "has_at", "digit_ratio", "letter_ratio", "upper_ratio",
    "host_is_ip", "host_labels", "host_digits", "host_hyphens", "tld_len", "tld_risky", "has_port",
    "path_depth", "entropy", "keyword_hits",
    "ext_exe", "ext_zip", "ext_php", "ext_js", "ext_html", "ext_asp", "ext_txt",
    "long_token",
]


def _lower(s):
    """ASCII-only lower-casing so the JavaScript port behaves identically."""
    return "".join(chr(ord(c) + 32) if "A" <= c <= "Z" else c for c in s)


def _entropy(s):
    if not s:
        return 0.0
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def extract(url):
    s = SCHEME_RE.sub("", url.strip())
    low = _lower(s)
    m = re.search(r"[/?#]", s)
    hostport = s[: m.start()] if m else s
    rest = s[m.start():] if m else ""
    has_at = 1 if "@" in hostport else 0
    host = hostport.rsplit("@", 1)[-1]
    has_port = 0
    pm = PORT_RE.match(host)
    if pm:
        host, has_port = pm.group(1), 1
    host = re.sub(r"^www\.", "", _lower(host))

    q = re.search(r"[?#]", rest)
    path = rest[: q.start()] if q else rest
    query = rest[q.start() + 1:] if q else ""

    labels = host.split(".") if host else []
    tld = labels[-1] if len(labels) > 1 else ""
    n = max(len(s), 1)
    digits = sum("0" <= c <= "9" for c in s)
    letters = sum(("a" <= c <= "z") or ("A" <= c <= "Z") for c in s)
    uppers = sum(("A" <= c <= "Z") for c in s)
    specials = sum(not (c.isascii() and c.isalnum()) for c in s)

    tokens = re.split(r"[^a-z0-9]+", low)
    return [
        len(s), len(host), len(path), len(query),
        s.count("."), s.count("-"), s.count("_"), s.count("/"), digits, specials, s.count("&"), s.count("="), s.count("%"),
        has_at, digits / n, letters / n, uppers / n,
        1 if IPV4_RE.match(host) else 0, len(labels), sum("0" <= c <= "9" for c in host), host.count("-"), len(tld),
        1 if tld in RISKY_TLDS else 0, has_port,
        len([p for p in path.split("/") if p]), _entropy(low), sum(low.count(k) for k in KEYWORDS),
        1 if ".exe" in low else 0, 1 if ".zip" in low else 0, 1 if ".php" in low else 0, 1 if ".js" in low else 0,
        1 if (".html" in low or ".htm" in low) else 0, 1 if ".asp" in low else 0, 1 if ".txt" in low else 0,
        max((len(t) for t in tokens), default=0),
    ]
