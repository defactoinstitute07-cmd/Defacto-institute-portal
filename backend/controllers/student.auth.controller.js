const Student = require('../models/Student');
const ExamResult = require('../models/ExamResult');
const Exam = require('../models/Exam');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queueNotification } = require('../services/emailService');

const { JWT_SECRET } = require('../middleware/auth.middleware');

// ── POST /api/student/login ───────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password are required' });

        const student = await Student.findOne({ email: email.toLowerCase().trim() });
        if (!student || !student.password)
            return res.status(401).json({ message: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, student.password);
        if (!valid)
            return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: student._id, role: 'student' }, JWT_SECRET, { expiresIn: '2h' });

        // Send profile without password
        const profile = student.toObject();
        delete profile.password;

        // Fire-and-forget login notification
        queueNotification({
            recipientEmail: student.email,
            recipientName: student.name,
            subject: 'New Login Alert',
            type: 'student_login',
            data: { time: new Date().toLocaleString(), ip: req.ip }
        }).catch(err => console.error("Login Notification Error:", err));

        res.json({
            message: 'Login successful',
            token,
            student: profile,
            // Prompt frontend if phone is missing
            phoneRequired: !student.contact,
        });
    } catch (err) {
        console.error('[student.login]', err);
        res.status(500).json({ message: err.message });
    }
};

// ── GET /api/student/profile ─────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.userId)
            .select('-password')
            .populate('batchId', 'name subject');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        res.json({
            student,
            phoneRequired: !student.contact,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── PATCH /api/student/phone ──────────────────────────────────────────────────
// Students may add their phone ONCE.
// If admin already set it (phoneLockedByAdmin === true), it is read-only.
exports.updatePhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !phone.trim())
            return res.status(400).json({ message: 'Phone number is required' });

        const student = await Student.findById(req.userId).select('contact phoneLockedByAdmin');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Blocked: admin locked it
        if (student.phoneLockedByAdmin)
            return res.status(403).json({
                message: 'Phone number is managed by the admin and cannot be changed',
            });

        // Blocked: student already set it once
        if (student.contact)
            return res.status(403).json({
                message: 'Phone number has already been set and cannot be changed',
            });

        student.contact = phone.trim();
        await student.save();

        res.json({ message: 'Phone number added successfully', phone: student.contact });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── GET /api/student/performance ──────────────────────────────────────────────
exports.getPerformance = async (req, res) => {
    try {
        const studentId = req.userId;
        const student = await Student.findById(studentId).lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const batchId = student.batchId;

        // 1. Fetch student's own results
        const myResults = await ExamResult.find({ studentId })
            .populate('examId')
            .sort({ 'examId.date': 1 })
            .lean();

        const history = myResults.map(r => ({
            testName: r.examId?.name || 'Unknown',
            subject: r.examId?.subject || 'Unknown',
            chapter: r.examId?.chapter || '',
            date: r.examId?.date,
            marks: r.marksObtained,
            maxMarks: r.examId?.totalMarks || 100,
            percentage: r.examId?.totalMarks ? (r.marksObtained / r.examId.totalMarks) * 100 : 0,
            isPresent: r.isPresent
        }));

        const presentTests = history.filter(h => h.isPresent);
        const percentages = presentTests.map(h => h.percentage);

        const avg = percentages.length ? (percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;

        let improvement = 0;
        if (presentTests.length >= 2) {
            const current = presentTests[presentTests.length - 1].percentage;
            const last = presentTests[presentTests.length - 2].percentage;
            improvement = parseFloat((current - last).toFixed(2));
        }

        // 2. Calculate Ranks (Overall and Subject-wise)
        // Fetch all results for this batch
        const batchResults = await ExamResult.find({ batchId, isPresent: true })
            .populate('examId')
            .lean();

        const studentAverages = {}; // studentId -> { totalPerc: 0, count: 0 }
        const subjectAverages = {}; // subject -> studentId -> { totalPerc: 0, count: 0 }

        batchResults.forEach(r => {
            if (!r.examId) return;
            const sid = r.studentId.toString();
            const subject = r.examId.subject;
            const maxMarks = r.examId.totalMarks || 100;
            const perc = (r.marksObtained / maxMarks) * 100;

            // Overall
            if (!studentAverages[sid]) studentAverages[sid] = { totalPerc: 0, count: 0 };
            studentAverages[sid].totalPerc += perc;
            studentAverages[sid].count += 1;

            // Subject-wise
            if (!subjectAverages[subject]) subjectAverages[subject] = {};
            if (!subjectAverages[subject][sid]) subjectAverages[subject][sid] = { totalPerc: 0, count: 0 };
            subjectAverages[subject][sid].totalPerc += perc;
            subjectAverages[subject][sid].count += 1;
        });

        // Calculate overall rank
        const overallAverages = Object.keys(studentAverages).map(sid => ({
            studentId: sid,
            avg: studentAverages[sid].totalPerc / studentAverages[sid].count
        })).sort((a, b) => b.avg - a.avg);

        const overallRank = overallAverages.findIndex(s => s.studentId === studentId.toString()) + 1;

        // Calculate subject-wise ranks
        const subjectRanks = {};
        Object.keys(subjectAverages).forEach(subject => {
            const subAvg = Object.keys(subjectAverages[subject]).map(sid => ({
                studentId: sid,
                avg: subjectAverages[subject][sid].totalPerc / subjectAverages[subject][sid].count
            })).sort((a, b) => b.avg - a.avg);

            const rank = subAvg.findIndex(s => s.studentId === studentId.toString()) + 1;
            if (rank > 0) {
                subjectRanks[subject] = rank;
            }
        });

        // Total active students in batch for context (e.g., Rank 5 of 40)
        const totalStudentsInBatch = await Student.countDocuments({ batchId, status: 'active' });

        res.json({
            history,
            stats: {
                avgScore: parseFloat(avg.toFixed(2)),
                totalTests: history.length,
                improvement
            },
            ranks: {
                overall: overallRank > 0 ? overallRank : null,
                subjects: subjectRanks
            },
            totalStudentsInBatch
        });

    } catch (err) {
        console.error('[student.getPerformance]', err);
        res.status(500).json({ message: err.message });
    }
};
