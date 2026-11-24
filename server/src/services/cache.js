const env = require("../config/env");

// shortCode -> redirect info. Uses Redis when REDIS_URL is set, otherwise an
// in-memory Map with TTL, so the app works with zero extra infrastructure.
let redis = null;
const mem = new Map();
const MAX_MEM_ENTRIES = 10000;
const stats = { hits: 0, misses: 0 };

function init() {
  if (!env.redisUrl || redis) return;
  const Redis = require("ioredis");
  redis = new Redis(env.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  redis.on("error", (e) => console.warn("[redis]", e.message));
  console.log("[cache] using Redis");
}

const key = (code) => `url:${code}`;

async function get(code) {
  let value = null;
  try {
    if (redis) {
      const raw = await redis.get(key(code));
      value = raw ? JSON.parse(raw) : null;
    } else {
      const hit = mem.get(code);
      if (hit && hit.exp > Date.now()) value = hit.value;
      else if (hit) mem.delete(code);
    }
  } catch (e) {
    value = null; // cache failure must never break redirects
  }
  value ? stats.hits++ : stats.misses++;
  return value;
}

async function set(code, value) {
  try {
    if (redis) {
      await redis.set(key(code), JSON.stringify(value), "EX", env.cacheTtlSeconds);
    } else {
      if (mem.size >= MAX_MEM_ENTRIES) mem.delete(mem.keys().next().value);
      mem.set(code, { value, exp: Date.now() + env.cacheTtlSeconds * 1000 });
    }
  } catch (e) {
    /* ignore */
  }
}

async function del(code) {
  try {
    if (redis) await redis.del(key(code));
    else mem.delete(code);
  } catch (e) {
    /* ignore */
  }
}

async function close() {
  if (redis) {
    await redis.quit().catch(() => {});
    redis = null;
  }
  mem.clear();
}

module.exports = { init, get, set, del, close, stats };
