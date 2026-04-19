const {Redis}= require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 5000,
    maxRetriesPerRequest: 2,
    retryStrategy: (times) => {
        if (times > 3) {
            console.warn('Redis connection failed after retries');
            return null;
        }
        return times * 500;
    }
});

redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('error', (err) => {
    console.warn('Redis connection error:', err.message);
});

module.exports = redis;