const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
process.env.JWT_SECRET = 'test-secret-key';


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
};
