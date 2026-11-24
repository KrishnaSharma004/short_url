const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/user");
const AppError = require("../utils/AppError");

const COOKIE = "token";

function cookieOptions() {
  return {
    httpOnly: true, // JS in the page can never read the token
    sameSite: "lax",
    secure: env.baseUrl.startsWith("https://"), // true when served over HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

// Populates req.user when a valid cookie is present; never rejects by itself.
async function authenticate(req, res, next) {
  req.user = null;
  const token = req.cookies?.[COOKIE];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select("-password").lean();
    if (user) req.user = user;
  } catch {
    /* invalid/expired token -> treated as logged out */
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return next(new AppError(401, "Please log in"));
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return next(new AppError(401, "Please log in"));
  if (req.user.role !== "ADMIN") return next(new AppError(403, "Admins only"));
  next();
}

module.exports = { COOKIE, cookieOptions, signToken, authenticate, requireAuth, requireAdmin };
