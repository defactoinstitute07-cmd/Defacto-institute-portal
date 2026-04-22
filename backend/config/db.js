const mongoose = require('mongoose');

const globalCache = globalThis.__erpMongooseCache || (globalThis.__erpMongooseCache = {
    connection: null,
    promise: null,
    listenersAttached: false
});

function attachConnectionListeners() {
    if (globalCache.listenersAttached) {
        return;
    }

    globalCache.listenersAttached = true;

    mongoose.connection.on('error', () => {
        console.error('MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
        globalCache.connection = null;
        console.warn('MongoDB disconnected');
    });
}

/**
 * Connects to MongoDB Atlas with retry logic and process-level caching.
 * This avoids duplicate connections across warm serverless invocations.
 */
const connectDB = async (retries = 3, delay = 2000) => {
    if (mongoose.connection.readyState === 1 && globalCache.connection) {
        return globalCache.connection;
    }

    if (globalCache.promise) {
        await globalCache.promise;
        return globalCache.connection;
    }

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        console.error('MONGODB_URI is not defined in environment variables');
        throw new Error('MONGODB_URI is not defined');
    }

    const options = {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: Math.max(parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10) || 10, 1),
        minPoolSize: 0,
        maxIdleTimeMS: Math.max(parseInt(process.env.MONGODB_MAX_IDLE_MS || '10000', 10) || 10000, 1000)
    };

    while (retries > 0) {
        try {
            globalCache.promise = mongoose.connect(MONGODB_URI, options);
            globalCache.connection = await globalCache.promise;
            globalCache.promise = null;

            attachConnectionListeners();

            return globalCache.connection;
        } catch (error) {
            globalCache.promise = null;
            globalCache.connection = null;
            retries -= 1;
            console.error('MongoDB connection failed');

            if (retries === 0) {
                console.error('Max retries reached. Database connection could not be established.');
                throw error;
            }

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    return globalCache.connection;
};

module.exports = connectDB;
