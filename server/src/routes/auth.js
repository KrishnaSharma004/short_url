
const v = require("../validators");
const validate = require("../middleware/validate");
const c = require("../controllers/authController");

module.exports = ({ authLimiter }) => {
  const router = require("express").Router();
  router.post("/signup", authLimiter, validate(v.signup), c.signup);
  router.post("/login", authLimiter, validate(v.login), c.login);
  router.post("/logout", c.logout);
  router.get("/me", c.me);
  return router;
};
