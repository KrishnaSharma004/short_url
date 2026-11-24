const path = require("path");
const fs = require("fs");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const env = require("./config/env");
const { authenticate } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/error");
const { buildLimiters } = require("./middleware/rateLimit");
const { redirect } = require("./controllers/redirectController");
const cache = require("./services/cache");

function createApp(opts = {}) {
  const app = express();
  const limiters = buildLimiters({ enabled: !env.isTest, ...(opts.rateLimit || {}) });

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  if (!env.isTest) app.use(morgan(env.isProd ? "combined" : "dev"));
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());
  app.use(authenticate);

  app.get("/health", (req, res) => res.json({ ok: true, cache: cache.stats }));

  app.use("/api/auth", require("./routes/auth")(limiters));
  app.use("/api/urls", require("./routes/urls")(limiters));
  app.use("/api/admin", require("./routes/admin"));
  app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

  // Serve the built React app (single-port "combined" mode) when it exists.
  const dist = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(path.join(dist, "index.html"))) {
    app.use(express.static(dist, { index: false }));
    const spa = (req, res) => res.sendFile(path.join(dist, "index.html"));
    app.get(["/", "/login", "/signup", "/dashboard", "/create", "/admin", "/links/:id"], spa);
  }

  // Short-link redirect. Must come after the explicit routes above.
  app.get("/:code", redirect);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
