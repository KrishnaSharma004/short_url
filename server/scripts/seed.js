// Demo data: node scripts/seed.js   (login: demo@example.com / demo12345)
const bcrypt = require("bcryptjs");
const env = require("../src/config/env");
const { connectDB } = require("../src/config/db");
const User = require("../src/models/user");
const Url = require("../src/models/url");
const Click = require("../src/models/click");
const { randomBase62 } = require("../src/utils/base62");

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const refs = ["google.com", "twitter.com", "linkedin.com", "news.ycombinator.com", "Direct", "Direct", "reddit.com"];
const browsers = [["Chrome", "Windows", "desktop"], ["Chrome", "macOS", "desktop"], ["Safari", "macOS", "desktop"],
  ["Mobile Safari", "iOS", "mobile"], ["Chrome", "Android", "mobile"], ["Firefox", "Linux", "desktop"]];
const links = [
  ["https://github.com/vercel/next.js", "nextjs", 140], ["https://react.dev/learn", "react-docs", 90],
  ["https://www.mongodb.com/docs/manual/aggregation/", null, 55], ["https://roadmap.sh/nodejs", "node-roadmap", 30],
  ["https://developer.mozilla.org/en-US/docs/Web/HTTP", null, 12],
];

(async () => {
  await connectDB(env.mongoUri);
  let user = await User.findOne({ email: "demo@example.com" });
  if (!user) user = await User.create({ name: "Demo User", email: "demo@example.com", password: await bcrypt.hash("demo12345", 10) });
  await Click.deleteMany({ url: { $in: (await Url.find({ createdBy: user._id }).select("_id")).map((u) => u._id) } });
  await Url.deleteMany({ createdBy: user._id });

  for (const [originalUrl, alias, n] of links) {
    const u = await Url.create({ shortCode: alias || randomBase62(7), originalUrl, createdBy: user._id, isCustomAlias: !!alias, clickCount: n });
    const clicks = [];
    for (let i = 0; i < n; i++) {
      // more recent days get more traffic
      const daysAgo = Math.floor(Math.pow(Math.random(), 1.8) * 14);
      const ts = new Date(Date.now() - daysAgo * 864e5 - Math.random() * 864e5 * 0.9);
      const [browser, os, device] = pick(browsers);
      clicks.push({ url: u._id, shortCode: u.shortCode, timestamp: ts, day: ts.toISOString().slice(0, 10), referrer: pick(refs), browser, os, device });
    }
    await Click.insertMany(clicks);
    console.log(`${env.baseUrl}/${u.shortCode}  (${n} clicks)`);
  }
  console.log("\nLogin: demo@example.com / demo12345");
  process.exit(0);
})();
