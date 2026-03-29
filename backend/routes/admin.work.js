const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const Exam = require('../models/Exam');
const jwt = require('jsonwebtoken');
const { requireEnv } = require('../config/env');

const JWT_SECRET = requireEnv('JWT_SECRET');
const DASHBOARD_TIMEZONE = process.env.DASHBOARD_TIMEZONE || process.env.ATTENDANCE_TIMEZONE || 'Asia/Kolkata';

const formatDateKey = (value, timeZone = DASHBOARD_TIMEZONE) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(value);
};

const getActivityConfig = () => ({
    onlineMinutes: Math.max(parseInt(process.env.ACTIVITY_ONLINE_MINUTES || '5', 10) || 5, 1),
    inactiveDays: Math.max(parseInt(process.env.ACTIVITY_INACTIVE_DAYS || '7', 10) || 7, 1)
});

// ── Auth Middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: 'No token provided' });
    try {
        const token = header.split(' ')[1];
        req.admin = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// ── GET /admin — Dashboard Data ──────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const { onlineMinutes, inactiveDays } = getActivityConfig();
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const onlineThreshold = new Date(now.getTime() - onlineMinutes * 60 * 1000);
        const inactiveThreshold = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000);

        // Core counts
        const [totalStudents, totalTeachers, activeBatches, activityStats, feeTotals] = await Promise.all([
            Student.countDocuments(),
            require('../models/Teacher').countDocuments(),
            Batch.countDocuments({ isActive: true }),
            Student.aggregate([
                {
                    $addFields: {
                        activityAt: {
                            $ifNull: [
                                '$lastActiveAt',
                                { $ifNull: ['$lastAppOpenAt', '$portalAccess.lastLoginAt'] }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        activityStatus: {
                            $switch: {
                                branches: [
                                    {
                                        case: {
                                            $or: [
                                                { $eq: ['$activityAt', null] },
                                                { $lte: ['$activityAt', inactiveThreshold] }
                                            ]
                                        },
                                        then: 'inactive'
                                    },
                                    { case: { $gte: ['$activityAt', onlineThreshold] }, then: 'online' }
                                ],
                                default: 'offline'
                            }
                        }
                    }
                },
                { $group: { _id: '$activityStatus', count: { $sum: 1 } } }
            ]),
            Fee.aggregate([
                {
                    $group: {
                        _id: null,
                        totalFeesPaid: { $sum: '$amountPaid' }
                    }
                }
            ])
        ]);

        const totalFeesPaid = feeTotals?.[0]?.totalFeesPaid || 0;

        // Recent admissions (last 5)
        const recentAdmissions = await Student.find()
            .sort({ joinedAt: -1 })
            .limit(5)
            .select('name rollNo joinedAt fees feesPaid')
            .populate('batchId', 'name');

        // Attendance trend — last 7 days (inclusive)
        const today = new Date();
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        const startOfSevenDaysAgo = new Date(today);
        startOfSevenDaysAgo.setDate(today.getDate() - 6);
        startOfSevenDaysAgo.setHours(0, 0, 0, 0);

        const attendanceTrend = await Attendance.aggregate([
            {
                $match: {
                    attendanceDate: { $gte: startOfSevenDaysAgo, $lte: endOfToday }
                }
            },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$attendanceDate',
                                timezone: DASHBOARD_TIMEZONE
                            }
                        },
                        status: { $toLower: '$status' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Build a clean 7-day array
        const trend = [];
        let weeklyPresent = 0;
        let weeklyAbsent = 0;
        let weeklyLate = 0;

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = formatDateKey(d);
            const present = attendanceTrend.find(a => a._id.date === key && a._id.status === 'present')?.count || 0;
            const absent = attendanceTrend.find(a => a._id.date === key && a._id.status === 'absent')?.count || 0;
            const late = attendanceTrend.find(a => a._id.date === key && a._id.status === 'late')?.count || 0;

            weeklyPresent += present;
            weeklyAbsent += absent;
            weeklyLate += late;

            trend.push({ date: key, present, absent, late });
        }

        const weeklyTotal = weeklyPresent + weeklyAbsent + weeklyLate;
        const weeklyAttendance = {
            present: weeklyPresent,
            absent: weeklyAbsent,
            late: weeklyLate,
            total: weeklyTotal,
            presentRate: weeklyTotal > 0 ? Math.round((weeklyPresent / weeklyTotal) * 100) : 0
        };

        const monthlyAttendanceTrend = trend.map((item) => {
            const dayTotal = item.present + item.absent + item.late;
            const date = new Date(`${item.date}T00:00:00`);
            return {
                key: item.date,
                label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
                percentage: dayTotal > 0 ? Math.round((item.present / dayTotal) * 100) : 0
            };
        });

        // Recent fee collection activity for dashboard card
        const recentFeeDocs = await Fee.find({ amountPaid: { $gt: 0 } })
            .sort({ updatedAt: -1 })
            .limit(20)
            .populate('studentId', 'name className')
            .populate('batchId', 'name')
            .lean();

        const recentFeeActivity = recentFeeDocs
            .map((fee) => {
                const lastPayment = Array.isArray(fee.paymentHistory) && fee.paymentHistory.length > 0
                    ? fee.paymentHistory[fee.paymentHistory.length - 1]
                    : null;

                return {
                    _id: String(fee._id),
                    studentName: fee.studentId?.name || 'Student',
                    className: fee.studentId?.className || '',
                    batchName: fee.batchId?.name || '',
                    amountPaid: lastPayment?.paidAmount || fee.amountPaid || 0,
                    totalFee: fee.totalFee || 0,
                    status: fee.status || 'pending',
                    activityAt: lastPayment?.date || fee.updatedAt || fee.createdAt
                };
            })
            .sort((a, b) => new Date(b.activityAt || 0) - new Date(a.activityAt || 0))
            .slice(0, 5);

        // Upcoming exam list (with fallback to most recent exams if upcoming is sparse)
        const scheduledUpcoming = await Exam.find({
            status: 'scheduled',
            date: { $gte: startOfToday }
        })
            .sort({ date: 1, createdAt: -1 })
            .limit(5)
            .populate('batchId', 'name')
            .lean();

        let upcomingExams = scheduledUpcoming.map((exam) => ({
            _id: String(exam._id),
            name: exam.name || '',
            subject: exam.subject || '',
            date: exam.date || null,
            status: exam.status || 'scheduled',
            batchName: exam.batchId?.name || ''
        }));

        if (upcomingExams.length < 5) {
            const existingIds = upcomingExams.map((exam) => exam._id);
            const fallbackExams = await Exam.find({
                _id: { $nin: existingIds },
                status: { $in: ['scheduled', 'completed'] }
            })
                .sort({ date: -1, createdAt: -1 })
                .limit(5 - upcomingExams.length)
                .populate('batchId', 'name')
                .lean();

            upcomingExams = upcomingExams.concat(
                fallbackExams.map((exam) => ({
                    _id: String(exam._id),
                    name: exam.name || '',
                    subject: exam.subject || '',
                    date: exam.date || null,
                    status: exam.status || 'scheduled',
                    batchName: exam.batchId?.name || ''
                }))
            );
        }

        const activitySummary = {
            online: activityStats.find((item) => item._id === 'online')?.count || 0,
            offline: activityStats.find((item) => item._id === 'offline')?.count || 0,
            inactive: activityStats.find((item) => item._id === 'inactive')?.count || 0
        };

        res.json({
            totalStudents,
            activeBatches,
            totalTeachers,
            totalFeesPaid,
            recentAdmissions,
            weeklyAttendance,
            monthlyAttendanceTrend,
            attendanceTrend: trend,
            recentFeeActivity,
            upcomingExams,
            activitySummary,
            activityThresholds: { onlineMinutes, inactiveDays }
        });
    } catch (error) {
        console.error('[admin.work] Failed to load dashboard data');
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


module.exports = router;
