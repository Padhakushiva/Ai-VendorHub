const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.EXPOSE_DEV_TOKENS = 'true';

// Mock Redis for testing - don't connect to production Redis
jest.mock('../DB/redis', () => {
    const store = new Map();
    const mockRedis = {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        on: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        __clear: () => store.clear(),
        __resetImplementations: () => {
            mockRedis.set.mockImplementation((key, value) => {
                store.set(key, value);
                return Promise.resolve('OK');
            });
            mockRedis.get.mockImplementation((key) => Promise.resolve(store.get(key) || null));
            mockRedis.del.mockImplementation((key) => {
                const existed = store.delete(key);
                return Promise.resolve(existed ? 1 : 0);
            });
            mockRedis.exists.mockImplementation((key) => Promise.resolve(store.has(key) ? 1 : 0));
            mockRedis.on.mockImplementation(() => {});
            mockRedis.connect.mockImplementation(() => Promise.resolve());
            mockRedis.disconnect.mockImplementation(() => {});
        },
    };

    mockRedis.__resetImplementations();
    return mockRedis;
});

beforeEach(() => {
    const redis = require('../DB/redis');
    if (redis.__resetImplementations) {
        redis.__resetImplementations();
    }
});

// Mock RabbitMQ Broker for testing - don't connect to RabbitMQ
jest.mock('../Broker/broker', () => {
    const mockBroker = {
        connect: jest.fn().mockResolvedValue(null),
        publishToQueue: jest.fn().mockResolvedValue(null),
        SubscribeToQueue: jest.fn().mockResolvedValue(null),
    };
    return mockBroker;
});

let mongoServer;

/**
 * Connect to the in-memory database
 */
module.exports.connect = async () => {
    mongoServer = await MongoMemoryServer.create({
        instance: {
            launchTimeout: 120000
        }
    });
    const mongoUri = mongoServer.getUri();
    
    mongoose.set('bufferTimeoutMS', 60000);
    await mongoose.connect(mongoUri);
    
    await new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) {
            resolve();
        } else {
            mongoose.connection.once('connected', resolve);
        }
    });
};

/**
 * Drop database, close the connection and stop mongo server
 */
module.exports.closeDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
};

/**
 * Clear all test data after every test suite
 */
module.exports.clearDatabase = async () => {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
    }
    const redis = require('../DB/redis');
    if (redis.__clear) {
        redis.__clear();
    }
};
