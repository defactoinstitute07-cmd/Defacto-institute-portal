const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const jwt = require('jsonwebtoken');

// ── Auth Middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: 'No token provided' });
    try {
        const token = header.split(' ')[1];
        req.admin = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// ── GET /admin — Dashboard Data ──────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        // Core counts
        const [totalStudents, activeBatches, totalFeesPaid] = await Promise.all([
            Student.countDocuments(),
            Batch.countDocuments({ isActive: true }),
            Student.aggregate([{ $group: { _id: null, total: { $sum: '$feesPaid' } } }])
        ]);

        // Unique teachers from active batches
        const teachers = await Batch.distinct('teacher', { isActive: true, teacher: { $ne: '' } });

        // Recent admissions (last 5)
        const recentAdmissions = await Student.find()
            .sort({ joinedAt: -1 })
            .limit(5)
            .select('name rollNo joinedAt fees feesPaid')
            .populate('batchId', 'name');

        // Attendance trend — last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

        const attendanceTrend = await Attendance.aggregate([
            {
                $match: {
                    date: { $gte: sevenDaysAgo, $lte: today }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        status: '$status'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Build a clean 7-day array
        const trend = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const present = attendanceTrend.find(a => a._id.date === key && a._id.status === 'present')?.count || 0;
            const absent = attendanceTrend.find(a => a._id.date === key && a._id.status === 'absent')?.count || 0;
            trend.push({ date: key, present, absent });
        }

        res.json({
            totalStudents,
            activeBatches,
            totalTeachers: teachers.length,
            totalFeesPaid: totalFeesPaid[0]?.total || 0,
            recentAdmissions,
            attendanceTrend: trend
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
