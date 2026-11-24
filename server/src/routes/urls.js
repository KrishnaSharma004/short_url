
const v = require("../validators");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const c = require("../controllers/urlController");

module.exports = ({ createLimiter, aiLimiter }) => {
  const router = require("express").Router();
  router.use(requireAuth);
  router.post("/", createLimiter, validate(v.createUrl), c.create);
  router.post("/check", validate(v.checkUrl), c.check);
  router.post("/suggest-alias", aiLimiter, validate(v.checkUrl), c.suggestAlias);
  router.get("/", c.list);
  router.get("/:id/analytics", c.analytics);
  router.post("/:id/ask", aiLimiter, validate(v.ask), c.ask);
  router.patch("/:id", validate(v.updateUrl), c.update);
  router.delete("/:id", c.remove);
  return router;
};
