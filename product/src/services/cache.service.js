const crypto = require("crypto");

const DEFAULT_TTL_SECONDS = Number(process.env.PRODUCT_CACHE_TTL_SECONDS) || 300;
const MEMORY_SWEEP_INTERVAL_MS = 60 * 1000;

let Redis;
try {
  ({ Redis } = require("ioredis"));
} catch (error) {
  Redis = null;
}

class ProductCache {
  constructor() {
    this.memoryStore = new Map();
    this.redis = null;
    this.redisReady = false;

    if (Redis && process.env.NODE_ENV !== "test" && process.env.REDIS_HOST) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      this.redis.on("connect", () => {
        this.redisReady = true;
        console.log("Product cache connected to Redis");
      });

      this.redis.on("error", (error) => {
        this.redisReady = false;
        console.warn("Product cache Redis error:", error.message);
      });
    }

    if (process.env.NODE_ENV !== "test") {
      this.sweepInterval = setInterval(() => this.sweepExpiredMemoryKeys(), MEMORY_SWEEP_INTERVAL_MS);
      this.sweepInterval.unref?.();
    }
  }

  buildKey(namespace, value = {}) {
    const stableValue = this.stableStringify(value);
    const hash = crypto.createHash("sha1").update(stableValue).digest("hex");
    return `${namespace}:${hash}`;
  }

  async get(key) {
    if (!this.isEnabled()) return null;

    const redisValue = await this.getFromRedis(key);
    if (redisValue !== null) return redisValue;

    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    if (!this.isEnabled()) return;

    await this.setInRedis(key, value, ttlSeconds);
    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(keyOrPrefix) {
    if (!this.isEnabled()) return;

    await this.deleteFromRedis(keyOrPrefix);

    for (const key of this.memoryStore.keys()) {
      if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`)) {
        this.memoryStore.delete(key);
      }
    }
  }

  async clear() {
    this.memoryStore.clear();
  }

  isEnabled() {
    if (process.env.PRODUCT_CACHE_ENABLED === "false") return false;
    if (process.env.NODE_ENV === "test" && process.env.PRODUCT_CACHE_ENABLED !== "true") return false;
    return true;
  }

  async getFromRedis(key) {
    if (!this.redis) return null;

    try {
      if (!this.redisReady) await this.redis.connect();
      const raw = await this.redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      this.redisReady = false;
      return null;
    }
  }

  async setInRedis(key, value, ttlSeconds) {
    if (!this.redis) return;

    try {
      if (!this.redisReady) await this.redis.connect();
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      this.redisReady = false;
    }
  }

  async deleteFromRedis(keyOrPrefix) {
    if (!this.redis) return;

    try {
      if (!this.redisReady) await this.redis.connect();
      await this.redis.del(keyOrPrefix);

      let cursor = "0";
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          "MATCH",
          `${keyOrPrefix}:*`,
          "COUNT",
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) await this.redis.del(...keys);
      } while (cursor !== "0");
    } catch (error) {
      this.redisReady = false;
    }
  }

  sweepExpiredMemoryKeys() {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt <= now) this.memoryStore.delete(key);
    }
  }

  stableStringify(value) {
    if (!value || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;

    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`)
      .join(",")}}`;
  }
}

module.exports = new ProductCache();
