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

    const batches = mongoose.connection.collection('batches');

    const docsWithLegacyField = await batches.countDocuments({ subjectIds: { $exists: true } });
    if (docsWithLegacyField === 0) {
        console.log('No legacy subjectIds fields found in batches.');
        return;
    }

    const result = await batches.updateMany(
        { subjectIds: { $exists: true } },
        { $unset: { subjectIds: '' } }
    );

    console.log(`Legacy cleanup complete. Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`);
};

run()
    .then(async () => {
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error('Failed to remove legacy batch subjectIds:', error.message);
        try {
            await mongoose.disconnect();
        } catch (_e) {
            // noop
        }
        process.exit(1);
    });