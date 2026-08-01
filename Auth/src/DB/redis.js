const { Redis } = require('ioredis');

function createMemoryStore() {
    const store = new Map();

    return {
        async get(key) {
            const entry = store.get(key);
            if (!entry) return null;
            if (entry.expiresAt && entry.expiresAt <= Date.now()) {
                store.delete(key);
                return null;
            }
            return entry.value;
        },
        async set(key, value, mode, ttlSeconds) {
            const expiresAt = mode === 'EX' && Number(ttlSeconds)
                ? Date.now() + Number(ttlSeconds) * 1000
                : null;
            store.set(key, { value, expiresAt });
            return 'OK';
        },
        async del(key) {
            return store.delete(key) ? 1 : 0;
        },
    };
}

const memoryStore = createMemoryStore();

if (process.env.REDIS_ENABLED === 'false') {
    console.warn('Redis disabled. Using in-memory auth session store.');
    module.exports = memoryStore;
} else {
    let connected = false;
    let lastErrorMessage = '';

    const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        retryStrategy(times) {
            return Math.min(times * 500, 5000);
        },
    });

    redis.on('ready', () => {
        connected = true;
        lastErrorMessage = '';
        console.log('Connected to Redis');
    });

    redis.on('end', () => {
        connected = false;
    });

    redis.on('error', (err) => {
        connected = false;
        if (err.message !== lastErrorMessage) {
            lastErrorMessage = err.message;
            console.warn('Redis connection error:', err.message);
        }
    });

    async function runRedisCommand(command, fallback, ...args) {
        if (!connected) {
            return fallback(...args);
        }

        try {
            return await redis[command](...args);
        } catch (err) {
            console.warn(`Redis ${command} failed. Using in-memory auth session store:`, err.message);
            return fallback(...args);
        }
    }

    module.exports = {
        get(key) {
            return runRedisCommand('get', memoryStore.get, key);
        },
        set(key, value, mode, ttlSeconds) {
            return runRedisCommand('set', memoryStore.set, key, value, mode, ttlSeconds);
        },
        del(key) {
            return runRedisCommand('del', memoryStore.del, key);
        },
    };
}
