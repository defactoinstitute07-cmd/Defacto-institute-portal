require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is missing in environment variables.');
    }

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });

    const subjects = mongoose.connection.collection('subjects');
    const docsWithLegacyField = await subjects.countDocuments({ batchId: { $exists: true } });

    if (docsWithLegacyField === 0) {
        console.log('No legacy batchId fields found in subjects.');
        return;
    }

    const result = await subjects.updateMany(
        { batchId: { $exists: true } },
        { $unset: { batchId: '' } }
    );

    console.log(`Subject legacy cleanup complete. Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`);
};

run()
    .then(async () => {
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error('Failed to remove legacy subject batchId:', error.message);
        try {
            await mongoose.disconnect();
        } catch (_e) {
            // noop
        }
        process.exit(1);
    });
