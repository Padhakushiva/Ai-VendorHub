const rateLimit = require('express-rate-limit');
const redis = require('../DB/redis');

class RedisRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.windowMs = 15 * 60 * 1000;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  key(key) {
    return `${this.prefix}:${key}`;
  }

  async get(key) {
    const rawClient = await redis.get(this.key(key));
    if (!rawClient) {
      return undefined;
    }

    try {
      return JSON.parse(rawClient);
    } catch (error) {
      return undefined;
    }
  }

  async increment(key) {
    const redisKey = this.key(key);
    const existingClient = await this.get(key);
    const resetTime = existingClient?.resetTime
      ? new Date(existingClient.resetTime)
      : new Date(Date.now() + this.windowMs);

    const client = {
      totalHits: (existingClient?.totalHits || 0) + 1,
      resetTime,
    };

    await redis.set(
      redisKey,
      JSON.stringify(client),
      'PX',
      Math.max(resetTime.getTime() - Date.now(), 1),
    );

    return client;
  }

  async decrement(key) {
    const existingClient = await this.get(key);
    if (!existingClient) {
      return;
    }

    const client = {
      ...existingClient,
      totalHits: Math.max(existingClient.totalHits - 1, 0),
    };

    await redis.set(
      this.key(key),
      JSON.stringify(client),
      'PX',
      Math.max(new Date(client.resetTime).getTime() - Date.now(), 1),
    );
  }

  async resetKey(key) {
    await redis.del(this.key(key));
  }
}

const authRateLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  store: new RedisRateLimitStore('auth_rate_limit'),
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

const emailRateLimiter = rateLimit({
  windowMs: Number(process.env.EMAIL_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.EMAIL_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  store: new RedisRateLimitStore('email_rate_limit'),
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many email requests. Please try again later.',
  },
});

module.exports = {
  authRateLimiter,
  emailRateLimiter,
};
