const router = require("express").Router();
const { requireAdmin } = require("../middleware/auth");
const c = require("../controllers/adminController");

router.use(requireAdmin);
router.get("/urls", c.listAllUrls);
router.get("/stats", c.stats);

module.exports = router;
