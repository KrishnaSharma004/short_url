const bcrypt = require("bcryptjs");
const User = require("../models/user");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const { COOKIE, cookieOptions, signToken } = require("../middleware/auth");

const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role });

async function signup(req, res) {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError(409, "An account with this email already exists");
  const hash = await bcrypt.hash(password, 10);
  const role = env.adminEmail && email === env.adminEmail ? "ADMIN" : "NORMAL";
  const user = await User.create({ name, email, password: hash, role });
  res.cookie(COOKIE, signToken(user), cookieOptions());
  res.status(201).json({ user: publicUser(user) });
}

// Same message for unknown email and wrong password (no account enumeration).
async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) throw new AppError(401, "Invalid email or password");
  res.cookie(COOKIE, signToken(user), cookieOptions());
  res.json({ user: publicUser(user) });
}

function logout(req, res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE, opts);
  res.json({ ok: true });
}

function me(req, res) {
  res.json({ user: req.user ? publicUser(req.user) : null });
}

module.exports = { signup, login, logout, me };
