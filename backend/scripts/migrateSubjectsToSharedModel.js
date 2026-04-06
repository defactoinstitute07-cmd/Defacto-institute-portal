require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is missing in environment variables.');

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000
    });

    const db = mongoose.connection.db;
    const subjectsCol = db.collection('subjects');
    const batchesCol = db.collection('batches');

    const subjects = await subjectsCol.find({}).toArray();
    if (subjects.length === 0) {
        console.log('No subjects found. Nothing to migrate.');
        return;
    }

    const batchIds = Array.from(
        new Set(subjects.map((subject) => subject.batchId).filter(Boolean).map((id) => String(id)))
    ).map((id) => new mongoose.Types.ObjectId(id));

    const batches = await batchesCol.find({ _id: { $in: batchIds } }).project({ _id: 1, course: 1 }).toArray();
    const batchCourseMap = new Map(batches.map((batch) => [String(batch._id), batch.course || 'General']));

    const groups = new Map();

    subjects.forEach((subject) => {
        const classLevel = String(subject.classLevel || batchCourseMap.get(String(subject.batchId || '')) || 'General').trim() || 'General';
        const name = String(subject.name || '').trim();
        const code = subject.code ? String(subject.code).trim().toUpperCase() : '';

        const key = `${classLevel.toLowerCase()}::${name.toLowerCase()}::${code.toLowerCase()}`;
        if (!groups.has(key)) {
            groups.set(key, {
                classLevel,
                name,
                code,
                batchIds: new Set(),
                latest: subject,
                docs: []
            });
        }

        const group = groups.get(key);
        group.docs.push(subject);
        if (subject.batchId) group.batchIds.add(String(subject.batchId));
        if (Array.isArray(subject.batchIds)) {
            subject.batchIds.forEach((id) => group.batchIds.add(String(id)));
        }

        if (new Date(subject.updatedAt || subject.createdAt || 0).getTime() > new Date(group.latest.updatedAt || group.latest.createdAt || 0).getTime()) {
            group.latest = subject;
        }
    });

    let mergedGroups = 0;
    let updatedDocs = 0;
    let deletedDuplicates = 0;

    for (const [, group] of groups.entries()) {
        const keep = group.latest;
        const keepId = keep._id;
        const normalizedBatchIds = Array.from(group.batchIds)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        await subjectsCol.updateOne(
            { _id: keepId },
            {
                $set: {
                    classLevel: group.classLevel,
                    code: group.code || keep.code || null,
                    batchIds: normalizedBatchIds,
                    batchId: normalizedBatchIds[0] || keep.batchId || null,
                    updatedAt: new Date()
                }
            }
        );

        updatedDocs += 1;

        const duplicateIds = group.docs
            .map((doc) => doc._id)
            .filter((id) => String(id) !== String(keepId));

        if (duplicateIds.length > 0) {
            await subjectsCol.deleteMany({ _id: { $in: duplicateIds } });
            deletedDuplicates += duplicateIds.length;
            mergedGroups += 1;
        }
    }

    await subjectsCol.updateMany(
        { syllabus: { $exists: false } },
        {
            $set: {
                syllabus: {
                    originalName: '',
                    url: '',
                    mimeType: '',
                    uploadedAt: null,
                    status: 'pending'
                }
            }
        }
    );

    console.log(`Subjects migration complete. Updated docs: ${updatedDocs}, Merged groups: ${mergedGroups}, Removed duplicates: ${deletedDuplicates}`);
};

run()
    .then(async () => {
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error('Failed to migrate subjects:', error.message);
        try {
            await mongoose.disconnect();
        } catch (_e) {
            // noop
        }
        process.exit(1);
    });
