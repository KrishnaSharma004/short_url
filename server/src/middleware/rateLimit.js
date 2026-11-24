const rateLimit = require("express-rate-limit");

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: message },
  });

function buildLimiters({ authMax = 20, createMax = 30, aiMax = 15, enabled = true } = {}) {
  if (!enabled) {
    const pass = (req, res, next) => next();
    return { authLimiter: pass, createLimiter: pass, aiLimiter: pass };
  }
  return {
    authLimiter: make(15 * 60 * 1000, authMax, "Too many attempts, please try again later"),
    createLimiter: make(60 * 1000, createMax, "You are creating links too fast, slow down"),
    aiLimiter: make(60 * 1000, aiMax, "Too many AI requests, please wait a minute"),
  };
}

module.exports = { buildLimiters };
