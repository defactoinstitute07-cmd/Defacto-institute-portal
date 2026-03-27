const mongoose = require('mongoose');

// Cache connection state for serverless environments (like Vercel)
let cachedConnection = null;
let connectPromise = null;

/**
 * Connects to MongoDB Atlas with retry logic and caching.
 * @param {number} retries - Number of retry attempts.
 * @param {number} delay - Delay between retries in milliseconds.
 */
const connectDB = async (retries = 3, delay = 2000) => {
    // If connection is already established, reuse it
    if (cachedConnection && mongoose.connection.readyState === 1) {
        console.log('Using existing MongoDB connection');
        return cachedConnection;
    }

    // If another request already started connecting, wait for it.
    if (connectPromise) {
        await connectPromise;
        if (cachedConnection && mongoose.connection.readyState === 1) {
            return cachedConnection;
        }
    }

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not defined in environment variables');
        throw new Error('MONGODB_URI is not defined');
    }

    const options = {
        serverSelectionTimeoutMS: 5000, // 5s to select a server
        socketTimeoutMS: 45000,         // 45s socket timeout
    };

    while (retries > 0) {
        try {
            console.log(`Connecting to MongoDB... (Attempts remaining: ${retries})`);

            connectPromise = mongoose.connect(MONGODB_URI, options);
            cachedConnection = await connectPromise;
            connectPromise = null;

            console.log('✅ MongoDB Connected Successfully');

            // Setup connection event listeners
            mongoose.connection.on('error', (err) => {
                console.error(`❌ MongoDB connection error: ${err}`);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
            });

            return cachedConnection;
        } catch (error) {
            connectPromise = null;
            retries -= 1;
            console.error(`❌ MongoDB connection failed: ${error.message}`);

            if (retries === 0) {
                console.error('Max retries reached. Database connection could not be established.');
                throw error;
            }

            console.log(`Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

module.exports = connectDB;
