const Url = require("../models/url");
const User = require("../models/user");
const Click = require("../models/click");
const { serialize } = require("./urlController");

async function listAllUrls(req, res) {
  const docs = await Url.find({}).sort({ createdAt: -1 }).limit(500).populate("createdBy", "name email").lean();
  res.json({
    urls: docs.map((d) => serialize(d, d.createdBy ? { name: d.createdBy.name, email: d.createdBy.email } : null)),
  });
}

async function stats(req, res) {
  const [users, urls, clicks] = await Promise.all([User.countDocuments(), Url.countDocuments(), Click.countDocuments()]);
  res.json({ users, urls, clicks });
}

module.exports = { listAllUrls, stats };
