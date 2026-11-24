const env = require("./config/env");
const { connectDB } = require("./config/db");
const { createApp } = require("./app");
const cache = require("./services/cache");

async function main() {
  await connectDB(env.mongoUri);
  console.log("Database connected");
  cache.init();
  const app = createApp();
  app.listen(env.port, () => console.log(`Server running at ${env.baseUrl}`));
}

main().catch((e) => {
  console.error("Failed to start:", e.message);
  process.exit(1);
});
