const DEFAULT_TTL_SECONDS = Number(process.env.CART_CACHE_TTL_SECONDS) || 1800;

class CartCache {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(keyOrPrefix) {
    for (const key of this.store.keys()) {
      if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`)) {
        this.store.delete(key);
      }
    }
  }

  async clear() {
    this.store.clear();
  }
}

module.exports = new CartCache();
