const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');

const normalizeBatchDate = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return value;
    }

    const text = String(value).trim();
    if (!text) return null;

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const monthIndex = Number(dateOnlyMatch[2]) - 1;
        const day = Number(dateOnlyMatch[3]);
        return new Date(Date.UTC(year, monthIndex, day));
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// GET /api/batches
exports.getAllBatches = async (req, res) => {
    try {
        const { search = '', course = '', status = '', page = 1, limit = 20 } = req.query;
        const query = {};
        if (search) query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { course: { $regex: search, $options: 'i' } }
        ];
        if (course) query.course = course;
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Batch.countDocuments(query);
        const batches = await Batch.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();

        // Student count per batch
        const batchIds = batches.map(b => b._id);
        const subjectDocs = await Subject.find({
            batchIds: { $in: batchIds },
            isActive: true
        }).select('_id name batchIds').lean();

        const subjectMap = {};
        subjectDocs.forEach((subject) => {
            const linkedBatchIds = Array.isArray(subject.batchIds)
                ? Array.from(new Set(subject.batchIds.map((id) => String(id))))
                : [];

            linkedBatchIds.forEach((key) => {
                if (!subjectMap[key]) subjectMap[key] = [];
                if (!subjectMap[key].some((item) => String(item._id) === String(subject._id))) {
                    subjectMap[key].push({ _id: subject._id, name: subject.name });
                }
            });
        });

        const counts = await Student.aggregate([
            { $match: { batchId: { $in: batchIds } } },
            { $group: { _id: '$batchId', count: { $sum: 1 }, totalFees: { $sum: '$feesPaid' } } }
        ]);
        const countMap = {};
        counts.forEach(c => { countMap[c._id.toString()] = { count: c.count, earnings: c.totalFees }; });

        const result = batches.map(b => {
            const details = subjectMap[b._id.toString()] || [];
            return {
                ...b,
                subjects: details.map((subject) => subject.name),
                subjectDetails: details,
            studentCount: countMap[b._id.toString()]?.count || 0,
            earnings: countMap[b._id.toString()]?.earnings || 0,
            };
        });

        res.json({ batches: result, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/batches
exports.createBatch = async (req, res) => {
    try {
        const {
            name,
            course,
            capacity,
            subjects,
            fees,
            startDate,
            endDate,
            classroom,
            schedule
        } = req.body;
        if (!name) return res.status(400).json({ message: 'Batch name is required' });

        const batch = new Batch({
            name,
            course,
            capacity,
            subjects,
            fees,
            startDate: normalizeBatchDate(startDate),
            endDate: normalizeBatchDate(endDate),
            classroom,
            schedule
        });
        await batch.save();
        res.status(201).json({ message: 'Batch created', batch });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/batches/:id  (protected by verifyAdminPassword middleware)
exports.updateBatch = async (req, res) => {
    try {
        const { adminPassword, ...updateData } = req.body;

        if (Object.prototype.hasOwnProperty.call(updateData, 'startDate')) {
            updateData.startDate = normalizeBatchDate(updateData.startDate);
        }
        if (Object.prototype.hasOwnProperty.call(updateData, 'endDate')) {
            updateData.endDate = normalizeBatchDate(updateData.endDate);
        }


        const batch = await Batch.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
        if (!batch) return res.status(404).json({ message: 'Batch not found' });


        res.json({ message: 'Batch updated', batch });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/batches/:id  (protected by verifyAdminPassword middleware)
exports.deleteBatch = async (req, res) => {
    try {
        const batch = await Batch.findByIdAndDelete(req.params.id);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });


        res.json({ message: 'Batch deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PATCH /api/batches/:id/toggle
exports.toggleStatus = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });
        batch.isActive = !batch.isActive;
        await batch.save();
        res.json({ message: `Batch ${batch.isActive ? 'activated' : 'deactivated'}`, batch });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


// GET /api/batches/export
exports.exportBatches = async (req, res) => {
    try {
        const batches = await Batch.find().sort({ createdAt: -1 }).lean();
        res.json({ batches });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/batches/:id
exports.getBatchById = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id).lean();
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        const subjectDocs = await Subject.find({
            isActive: true,
            batchIds: batch._id
        }).select('_id name').sort({ name: 1 }).lean();

        const uniqueSubjects = [];
        const seenSubjectIds = new Set();
        subjectDocs.forEach((subject) => {
            const key = String(subject._id);
            if (!seenSubjectIds.has(key)) {
                seenSubjectIds.add(key);
                uniqueSubjects.push(subject);
            }
        });

        // Get student list and stats
        const students = await Student.find({ batchId: batch._id, isDeleted: { $ne: true } })
            .select('name rollNo feesPaid status profileImage')
            .sort({ name: 1 })
            .lean();

        const stats = {
            studentCount: students.length,
            totalEarnings: students.reduce((sum, s) => sum + (s.feesPaid || 0), 0),
            activeCount: students.filter(s => s.status === 'active').length
        };

        res.json({
            batch: {
                ...batch,
                subjects: uniqueSubjects.map((subject) => subject.name),
                subjectDetails: uniqueSubjects,
                ...stats
            },
            students
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/batches/room-occupancy
exports.getRoomOccupancy = async (req, res) => {
    try {
        const { excludeBatchId } = req.query;
        const query = { isActive: true };
        if (excludeBatchId) {
            query._id = { $ne: excludeBatchId };
        }

        const batches = await Batch.find(query).select('name schedule').lean();

        const occupancy = {};
        batches.forEach(batch => {
            if (!batch.schedule) return;
            batch.schedule.forEach(slot => {
                if (!slot.room || !slot.day || !slot.time) return;

                const room = slot.room;
                const day = slot.day;
                const time = slot.time;

                if (!occupancy[room]) occupancy[room] = {};
                if (!occupancy[room][day]) occupancy[room][day] = {};

                if (!occupancy[room][day][time]) {
                    occupancy[room][day][time] = batch.name;
                } else {
                    occupancy[room][day][time] += `, ${batch.name}`;
                }
            });
        });

        res.json({ occupancy });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


