const crypto = require("crypto");

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Cryptographically random base62 string. 62^7 ~= 3.5 trillion combinations,
// and unlike a counter the result is not guessable/enumerable.
function randomBase62(length = 7) {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[crypto.randomInt(62)];
  return out;
}

// Classic counter -> base62 encoder (kept for the counter-based approach / tests).
function encodeBase62(num) {
  if (num === 0) return ALPHABET[0];
  let n = BigInt(num);
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out;
}

module.exports = { ALPHABET, randomBase62, encodeBase62 };
