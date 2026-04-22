const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Batch = require('../models/Batch');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');

// GET /api/dashboard/overview
exports.getOverview = async (req, res) => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [totalStudents, activeBatches, totalTeachers, activityRows] = await Promise.all([
            Student.countDocuments(),
            Batch.countDocuments({ isActive: true }),
            Teacher.countDocuments(),
            Student.aggregate([
                {
                    $project: {
                        activityAt: {
                            $ifNull: [
                                '$lastActiveAt',
                                { $ifNull: ['$lastAppOpenAt', '$portalAccess.lastLoginAt'] }
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        studentsOnline: {
                            $sum: {
                                $cond: [{ $gte: ['$activityAt', fiveMinutesAgo] }, 1, 0]
                            }
                        },
                        studentsOffline: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $gte: ['$activityAt', sevenDaysAgo] },
                                            { $lt: ['$activityAt', fiveMinutesAgo] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        studentsInactive: {
                            $sum: {
                                $cond: [
                                    {
                                        $or: [
                                            { $eq: ['$activityAt', null] },
                                            { $lt: ['$activityAt', sevenDaysAgo] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ])
        ]);

        const activity = activityRows[0] || {};

        return res.json({
            totalStudents,
            activeBatches,
            totalTeachers,
            studentsOnline: activity.studentsOnline || 0,
            studentsOffline: activity.studentsOffline || 0,
            studentsInactive: activity.studentsInactive || 0
        });
    } catch (err) {
        console.error('Error fetching dashboard overview');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/dashboard/attendance-weekly
exports.getWeeklyAttendance = async (req, res) => {
    try {
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);

        const attendanceData = await Attendance.aggregate([
            {
                $match: {
                    attendanceDate: { $gte: currentWeekStart }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = {
            present: 0,
            absent: 0,
            late: 0
        };

        attendanceData.forEach(item => {
            if (item._id === 'Present') stats.present = item.count;
            else if (item._id === 'Absent') stats.absent = item.count;
            else if (item._id === 'Late') stats.late = item.count;
        });

        const total = stats.present + stats.absent + stats.late || 1;
        const presentPercentage = Math.round((stats.present / total) * 100);

        return res.json({
            present: stats.present,
            absent: stats.absent,
            late: stats.late,
            presentPercentage
        });
    } catch (err) {
        console.error('Error fetching weekly attendance', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/dashboard/attendance-trend
exports.getAttendanceTrend = async (req, res) => {
    try {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const attendanceByDay = await Attendance.aggregate([
            {
                $match: {
                    attendanceDate: { $gte: weekStart, $lte: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        $dayOfWeek: '$attendanceDate'
                    },
                    present: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Present'] }, 1, 0]
                        }
                    },
                    total: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const trendData = [];
        attendanceByDay.forEach(item => {
            const dayIndex = item._id - 1; // $dayOfWeek returns 1-7 (Sunday-Saturday)
            const dayName = days[dayIndex];
            const percentage = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
            trendData.push({ day: dayName, percentage });
        });

        // Fill in missing days with 0%
        const filledTrendData = days.map(day => {
            const existing = trendData.find(d => d.day === day);
            return existing || { day, percentage: 0 };
        });

        return res.json(filledTrendData.length > 0 ? filledTrendData : days.map(day => ({ day, percentage: 0 })));
    } catch (err) {
        console.error('Error fetching attendance trend', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/dashboard/recent-collections
exports.getRecentCollections = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 5;

        const collections = await Fee.find()
            .select('studentId batchId paymentHistory createdAt status')
            .populate('studentId', 'name rollNo')
            .populate('batchId', 'name course')
            .sort({ 'paymentHistory.0.date': -1 })
            .limit(limit)
            .lean();

        const recentCollections = collections.map(fee => ({
            _id: fee._id,
            studentName: fee.studentId?.name || 'Unknown',
            batchInfo: `${fee.batchId?.name || 'N/A'}`,
            amount: fee.paymentHistory?.[0]?.paidAmount || 0,
            date: fee.paymentHistory?.[0]?.date || fee.createdAt,
            status: fee.status
        }));

        return res.json(recentCollections);
    } catch (err) {
        console.error('Error fetching recent collections');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/dashboard/upcoming-exams
exports.getUpcomingExams = async (req, res) => {
    try {
        const now = new Date();
        const upcomingExams = await Exam.find({
            date: { $gte: now },
            status: 'scheduled'
        })
            .select('name subject chapter date totalMarks passingMarks batchId status')
            .populate('batchId', 'name')
            .sort({ date: 1 })
            .limit(5)
            .lean();

        return res.json(upcomingExams || []);
    } catch (err) {
        console.error('Error fetching upcoming exams');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};
