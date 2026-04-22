const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { triggerAutomaticNotification } = require('../services/notificationService');
const { CACHE_PREFIXES, invalidateRouteCaches } = require('../middleware/responseCache');
const { buildStudentRegistrationAttachments } = require('../services/studentProfileSetupPdf.service');

const getStudentPortalUrl = () =>
    process.env.STUDENT_PORTAL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

const getActivityConfig = () => ({
    onlineMinutes: Math.max(parseInt(process.env.ACTIVITY_ONLINE_MINUTES || '5', 10) || 5, 1),
    inactiveDays: Math.max(parseInt(process.env.ACTIVITY_INACTIVE_DAYS || '7', 10) || 7, 1)
});

const deriveActivityStatus = (student) => {
    const { onlineMinutes, inactiveDays } = getActivityConfig();
    const lastActiveAt = student.lastActiveAt || student.lastAppOpenAt || student.portalAccess?.lastLoginAt || null;

    if (!lastActiveAt) {
        return {
            status: 'inactive',
            lastActiveAt: null,
            lastAppOpenAt: student.lastAppOpenAt || null,
            device: student.lastDevice || {}
        };
    }

    const now = Date.now();
    const diffMs = now - new Date(lastActiveAt).getTime();
    const minutesSince = diffMs / (60 * 1000);
    const daysSince = diffMs / (24 * 60 * 60 * 1000);

    let status = 'offline';
    if (minutesSince <= onlineMinutes) status = 'online';
    if (daysSince >= inactiveDays) status = 'inactive';

    return {
        status,
        lastActiveAt,
        lastAppOpenAt: student.lastAppOpenAt || null,
        device: student.lastDevice || {}
    };
};

const getAttendanceDateRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const buildAttendanceSummaryMap = async (studentIds, { dateFrom, dateTo } = {}) => {
    if (!studentIds || studentIds.length === 0) return new Map();

    const match = { studentId: { $in: studentIds } };
    if (dateFrom || dateTo) {
        match.attendanceDate = {};
        if (dateFrom) match.attendanceDate.$gte = dateFrom;
        if (dateTo) match.attendanceDate.$lte = dateTo;
    }

    const rows = await Attendance.aggregate([
        { $match: match },
        {
            $group: {
                _id: { studentId: '$studentId', status: '$status' },
                count: { $sum: 1 }
            }
        }
    ]);

    const summaryMap = new Map();

    rows.forEach((row) => {
        const studentId = row._id.studentId.toString();
        if (!summaryMap.has(studentId)) {
            summaryMap.set(studentId, { total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
        }
        const summary = summaryMap.get(studentId);
        if (row._id.status === 'Present') summary.present = row.count;
        if (row._id.status === 'Absent') summary.absent = row.count;
        if (row._id.status === 'Late') summary.late = row.count;
    });

    summaryMap.forEach((summary) => {
        summary.total = summary.present + summary.absent + summary.late;
        summary.percentage = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
    });

    return summaryMap;
};

const toActivityFilters = (query = {}) => {
    const rawActivity = String(query.activityStatus || query.activity || '').toLowerCase();
    const statusParam = String(query.status || '').toLowerCase();
    let activityStatus = rawActivity;
    let studentStatus = query.studentStatus || '';

    if (!activityStatus && ['online', 'offline', 'inactive'].includes(statusParam)) {
        activityStatus = statusParam;
    } else if (!studentStatus && statusParam && !['online', 'offline', 'inactive'].includes(statusParam)) {
        studentStatus = statusParam;
    }

    return { activityStatus, studentStatus };
};

const runInBatches = async (items, batchSize, handler) => {
    for (let index = 0; index < items.length; index += batchSize) {
        const chunk = items.slice(index, index + batchSize);
        await Promise.all(chunk.map((item, chunkIndex) => handler(item, index + chunkIndex)));
    }
};

const createAdmissionFeeRecord = async ({ student, batchId, admissionDate, adminId }) => {
    if (!student?._id || !batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
        return null;
    }

    const effectiveDate = admissionDate ? new Date(admissionDate) : new Date();
    if (Number.isNaN(effectiveDate.getTime())) {
        return null;
    }

    const month = effectiveDate.toLocaleString('en-US', { month: 'long' });
    const year = String(effectiveDate.getFullYear());

    const existingFee = await Fee.findOne({ studentId: student._id, month, year }).select('_id').lean();
    if (existingFee) {
        return existingFee;
    }

    const batch = await Batch.findById(batchId).select('fees').lean();
    const monthlyTuitionFee = Number(batch?.fees ?? student.fees ?? 0);
    const registrationFee = Number(student.registrationFee || 0);
    const discount = Math.max(Number(student.discount || 0), 0);
    const totalFee = Math.max(monthlyTuitionFee + registrationFee - discount, 0);

    const dueDate = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, 0, 23, 59, 59, 999);

    let fee;
    try {
        fee = await Fee.create({
            studentId: student._id,
            batchId,
            month,
            year,
            monthlyTuitionFee,
            registrationFee,
            discount,
            fine: 0,
            totalFee,
            amountPaid: 0,
            pendingAmount: totalFee,
            status: 'pending',
            dueDate
        });
    } catch (error) {
        if (error?.code === 11000) {
            return Fee.findOne({ studentId: student._id, month, year }).select('_id').lean();
        }
        throw error;
    }

    triggerAutomaticNotification({
        eventType: 'feeGenerated',
        studentId: student._id,
        adminId: adminId || null,
        message: `New fee generated for ${month} ${year}. Due date: ${dueDate.toLocaleDateString('en-IN')}.`,
        data: {
            amount: totalFee,
            month,
            year,
            dueDate: dueDate.toLocaleDateString('en-IN')
        }
    }).catch(() => console.error('[students.createAdmissionFeeRecord.notification] Notification dispatch failed'));

    return fee;
};

const invalidateStudentReadCaches = () => invalidateRouteCaches([
    CACHE_PREFIXES.dashboard,
    CACHE_PREFIXES.students,
    CACHE_PREFIXES.batches,
    CACHE_PREFIXES.fees
]);

// GET /api/students/stats
exports.getStudentStats = async (req, res) => {
    try {
        const feePending = 0;

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { start, end } = getAttendanceDateRange();
        const [studentTotals, newAdmissions, attendanceRows] = await Promise.all([
            Student.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                            }
                        },
                        completed: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
                            }
                        }
                    }
                }
            ]),
            Student.countDocuments({ admissionDate: { $gte: startOfMonth } }),
            Attendance.aggregate([
                { $match: { attendanceDate: { $gte: start, $lte: end } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);

        const counts = studentTotals[0] || {};
        const presentCount = attendanceRows.find((row) => row._id === 'Present')?.count || 0;
        const totalCount = attendanceRows.reduce((sum, row) => sum + row.count, 0);
        const attendanceAvg = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

        res.json({
            total: counts.total || 0,
            active: counts.active || 0,
            completed: counts.completed || 0,
            feePending,
            newAdmissions,
            attendanceAvg
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching stats', error: err.message });
    }
};

// GET /api/students/activity
exports.getStudentActivity = async (req, res) => {
    try {
        const { search = '', batch = '', page = 1, limit = 20 } = req.query;
        const { activityStatus, studentStatus } = toActivityFilters(req.query);

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const safePage = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (safePage - 1) * safeLimit;

        const match = {};
        if (search) {
            match.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { rollNo: { $regex: search, $options: 'i' } }
            ];
        }

        if (batch && mongoose.Types.ObjectId.isValid(batch)) {
            match.batchId = new mongoose.Types.ObjectId(batch);
        }

        if (studentStatus) {
            match.status = studentStatus;
        }

        const { onlineMinutes, inactiveDays } = getActivityConfig();
        const now = new Date();
        const onlineThreshold = new Date(now.getTime() - onlineMinutes * 60 * 1000);
        const inactiveThreshold = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000);

        const pipeline = [
            { $match: match },
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
                                {
                                    case: { $gte: ['$activityAt', onlineThreshold] },
                                    then: 'online'
                                }
                            ],
                            default: 'offline'
                        }
                    }
                }
            }
        ];

        if (activityStatus) {
            pipeline.push({ $match: { activityStatus } });
        }

        pipeline.push({
            $facet: {
                data: [
                    { $sort: { activityAt: -1, name: 1 } },
                    { $skip: skip },
                    { $limit: safeLimit },
                    {
                        $project: {
                            name: 1,
                            rollNo: 1,
                            className: 1,
                            batchId: 1,
                            status: 1,
                            contact: 1,
                            email: 1,
                            portalAccess: 1,
                            lastActiveAt: 1,
                            lastAppOpenAt: 1,
                            lastDevice: 1,
                            activityStatus: 1,
                            activityAt: 1
                        }
                    }
                ],
                total: [{ $count: 'count' }]
            }
        });

        const [result] = await Student.aggregate(pipeline);
        const total = result?.total?.[0]?.count || 0;
        const students = (result?.data || []).map((student) => ({
            ...student,
            activity: {
                status: student.activityStatus,
                lastActiveAt: student.lastActiveAt || null,
                lastAppOpenAt: student.lastAppOpenAt || null,
                device: student.lastDevice || {}
            }
        }));

        res.json({
            students,
            total,
            page: safePage,
            pages: Math.ceil(total / safeLimit),
            thresholds: { onlineMinutes, inactiveDays }
        });
    } catch (err) {
        console.error('[getStudentActivity] Failed to fetch student activity');
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/students
exports.getAllStudents = async (req, res) => {
    try {
        const { search = '', batch = '', status = '', className = '', signupStatus = '', page = 1, limit = 20 } = req.query;

        const query = {};
        if (search) query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { rollNo: { $regex: search, $options: 'i' } }
        ];
        if (batch && mongoose.Types.ObjectId.isValid(batch)) query.batchId = batch;
        if (status) query.status = status;
        if (className) query.className = className;
        if (signupStatus) query['portalAccess.signupStatus'] = signupStatus;

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const safePage = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (safePage - 1) * safeLimit;
        const [total, students] = await Promise.all([
            Student.countDocuments(query),
            Student.find(query)
                .populate('batchId', 'name subjects fees capacity')
                .sort({ joinedAt: -1 })
                .skip(skip)
                .limit(safeLimit)
                .lean()
        ]);

        const { start, end } = getAttendanceDateRange();
        const attendanceMap = await buildAttendanceSummaryMap(
            students.map((student) => student._id),
            { dateFrom: start, dateTo: end }
        );

        const enriched = students.map((student) => ({
            ...student,
            activity: deriveActivityStatus(student),
            attendanceSummary: attendanceMap.get(student._id.toString()) || {
                total: 0,
                present: 0,
                absent: 0,
                late: 0,
                percentage: 0
            }
        }));

        res.json({ students: enriched, total, page: safePage, pages: Math.ceil(total / safeLimit) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/students
exports.createStudent = async (req, res) => {
    try {
        const data = req.body;
        if (!data.name) return res.status(400).json({ message: 'Name is required' });

        // Handle File Upload
        if (req.file) {
            data.profileImage = req.file.path;
        }

        if (!data.batchId) {
            delete data.batchId;
        }

        // Auto-generate roll number: STU + YEAR + 4-digit Sequential
        const currentYear = new Date().getFullYear() % 100;
        const yearPrefix = `STU${currentYear}`;

        // Find the last student admitted THIS year
        const lastStudent = await Student.findOne({ rollNo: new RegExp(`^${yearPrefix}`) }, 'rollNo').sort({ rollNo: -1 });

        let nextNum = 1;
        if (lastStudent && lastStudent.rollNo) {
            const numPart = lastStudent.rollNo.replace(yearPrefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) nextNum = num + 1;
        }
        const rollNo = `${yearPrefix}${String(nextNum).padStart(2, '0')}`;

        // Capacity check
        if (data.batchId) {
            const batch = await Batch.findById(data.batchId);
            if (batch && batch.capacity > 0) {
                const enrolled = await Student.countDocuments({ batchId: data.batchId });
                if (enrolled >= batch.capacity) {
                    return res.status(400).json({ message: 'Batch capacity reached' });
                }
            }
        }

        const studentData = {
            ...data,
            rollNo,
            password: data.password || 'student@123',
            phoneLockedByAdmin: !!(data.contact || data.phone),
            contact: data.contact || data.phone,
            portalAccess: { signupStatus: 'no' },
            fees: data.fees || 0,
            discount: Math.max(Number(data.discount || 0), 0),
            registrationFee: data.registrationFee || 0,
            fatherName: data.fatherName,
            motherName: data.motherName,
            parentPhone: data.parentPhone,
            currentYear: data.currentYear || '1',
            status: data.batchId ? 'active' : 'batch_pending'
        };

        const student = new Student(studentData);
        await student.save();

        if (student.batchId) {
            await createAdmissionFeeRecord({
                student,
                batchId: student.batchId,
                admissionDate: student.admissionDate,
                adminId: req.admin?.id
            });
        }

        // Send onboarding notification
        if (student) {
            const portalUrl = getStudentPortalUrl();
            const attachments = await buildStudentRegistrationAttachments({ portalUrl });

            await triggerAutomaticNotification({
                studentId: student._id,
                message: `Welcome ${student.name}! Your registration is successful. Roll No: ${student.rollNo}, Password: ${req.body.password || 'student@123'}. Please login to your portal to complete your profile.`,
                eventType: 'studentRegistration',
                adminId: req.admin?.id,
                data: {
                    password: req.body.password || 'student@123',
                    portalUrl
                },
                attachments
            });
        }

        const result = student.toObject();
        delete result.password;
        await invalidateStudentReadCaches();
        res.status(201).json({
            message: student.batchId ? 'Student created successfully' : 'Student created (Batch Pending)',
            student: result
        });
    } catch (err) {
        console.error('[createStudent] Failed to create student');
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/students/:id
exports.updateStudent = async (req, res) => {
    try {
        const data = req.body;

        if (req.file) {
            data.profileImage = req.file.path;
        }

        if (!data.batchId) {
            delete data.batchId;
        }

        const oldStudent = await Student.findById(req.params.id);
        if (!oldStudent) return res.status(404).json({ message: 'Student not found' });

        const discountChanged = data.discount !== undefined && Number(data.discount) !== oldStudent.discount;
        const isActivatingBatch = !oldStudent.batchId && data.batchId;

        if (data.password !== undefined) {
            if (String(data.password).trim()) {
                data.password = await bcrypt.hash(String(data.password).trim(), 10);
            } else {
                delete data.password;
            }
        }

        if (data.discount !== undefined) {
            const parsedDiscount = Math.max(Number(data.discount || 0), 0);
            data.discount = parsedDiscount;
        }

        if (isActivatingBatch && oldStudent.status === 'batch_pending') {
            data.status = 'active';
        }

        const student = await Student.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after' });

        if (discountChanged) {
            try {
                const newDiscount = Number(data.discount);
                const unpaidFees = await Fee.find({
                    studentId: student._id,
                    status: { $in: ['pending', 'partial', 'overdue'] }
                })
                    .select('_id monthlyTuitionFee registrationFee fine amountPaid')
                    .lean();

                const feeOps = unpaidFees.map((fee) => {
                    const totalFee = Math.max(
                        Number(fee.monthlyTuitionFee || 0) +
                        Number(fee.registrationFee || 0) +
                        Number(fee.fine || 0) -
                        newDiscount,
                        0
                    );

                    const amountPaid = Number(fee.amountPaid || 0);
                    const pendingAmount = Math.max(totalFee - amountPaid, 0);
                    let nextStatus = 'pending';

                    if (pendingAmount <= 0 && totalFee > 0) nextStatus = 'paid';
                    else if (amountPaid > 0 && pendingAmount > 0) nextStatus = 'partial';

                    return {
                        updateOne: {
                            filter: { _id: fee._id },
                            update: {
                                $set: {
                                    discount: newDiscount,
                                    totalFee,
                                    pendingAmount,
                                    status: nextStatus
                                }
                            }
                        }
                    };
                });

                if (feeOps.length > 0) {
                    await Fee.bulkWrite(feeOps, { ordered: false });
                }
            } catch (feeUpdateError) {
                console.error('[updateStudent.retroactiveDiscount] Failed to update unpaid fees:', feeUpdateError.message);
            }
        }

        if (isActivatingBatch) {
            if (student && data.batchId) {
                await createAdmissionFeeRecord({
                    student,
                    batchId: data.batchId,
                    admissionDate: student.admissionDate,
                    adminId: req.admin?.id
                });
            }
        }

        await invalidateStudentReadCaches();
        res.json({
            message: isActivatingBatch ? 'Batch assigned successfully' : 'Updated',
            student
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/students/:id
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        await invalidateStudentReadCaches();
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/students/delete-all
exports.deleteAllStudents = async (req, res) => {
    try {
        await Student.deleteMany({});

        await invalidateStudentReadCaches();
        res.json({ message: 'All students deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/students/bulk
exports.bulkUpload = async (req, res) => {
    try {
        const { students } = req.body;
        if (!Array.isArray(students) || students.length === 0)
            return res.status(400).json({ message: 'No students data provided' });

        const currentYear = new Date().getFullYear() % 100;
        const yearPrefix = `STU${currentYear}`;

        const lastStudent = await Student.findOne({ rollNo: new RegExp(`^${yearPrefix}`) }, 'rollNo').sort({ rollNo: -1 });
        let nextNum = 1;
        if (lastStudent && lastStudent.rollNo) {
            const numPart = lastStudent.rollNo.replace(yearPrefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) nextNum = num + 1;
        }

        let successCount = 0;
        let failedCount = 0;
        const errors = [];
        const portalUrl = getStudentPortalUrl();
        const registrationAttachments = await buildStudentRegistrationAttachments({ portalUrl });

        // Pre-fetch all active batches to build a fast memory map for name resolution
        const allBatches = await Batch.find({ isActive: true }).select('_id name');
        const batchMap = {};
        allBatches.forEach(b => {
            batchMap[b.name.toLowerCase().trim()] = b._id;
        });

        // Helper to safely parse naive "DD-MM-YYYY" or standard dates into JS Date objects
        const parseExcelDate = (dateVal) => {
            if (!dateVal) return undefined;
            if (dateVal instanceof Date) return dateVal;
            if (typeof dateVal === 'number') return new Date((dateVal - (25567 + 2)) * 86400 * 1000);
            if (typeof dateVal === 'string') {
                const parts = dateVal.split('-');
                if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
            }
            return new Date(dateVal);
        };

        // Using individual save() to ensure pre-save hooks (password hashing) trigger
        const bulkConcurrency = Math.max(parseInt(process.env.BULK_STUDENT_UPLOAD_CONCURRENCY || '10', 10) || 10, 1);

        await runInBatches(students, bulkConcurrency, async (s, i) => {
            try {
                // Flexible Field Mapping (Normalization)
                const getValue = (keys) => {
                    const match = keys.find(k => s[k] !== undefined);
                    return match !== undefined ? s[match] : undefined;
                };

                // Resolve text batchName to Mongo ID
                let resolvedBatchId = getValue(['batchId', 'BATCHNAME', 'Batch Name', 'Batch', 'batchName']);
                if (resolvedBatchId && !mongoose.Types.ObjectId.isValid(resolvedBatchId)) {
                    const cleanName = String(resolvedBatchId).toLowerCase().trim();
                    resolvedBatchId = batchMap[cleanName] || null;
                }

                const student = new Student({
                    name: String(getValue(['name', 'NAME', 'Student Name', 'STUDENT NAME']) || '').trim(),
                    rollNo: getValue(['rollNo', 'ROLL NO', 'Roll Number']) || `${yearPrefix}${String(nextNum + i).padStart(2, '0')}`,
                    batchId: resolvedBatchId,
                    className: String(getValue(['className', 'CLASSNAME', 'STANDARD / COURSE', 'Standard', 'Course', 'CLASS']) || '').trim(),
                    contact: String(getValue(['phone', 'PHONE', 'contact', 'CONTACT', 'MOBILE NUMBER', 'Mobile']) || '').trim(),
                    email: String(getValue(['email', 'EMAIL', 'EMAIL ADDRESS', 'Email Address']) || '').toLowerCase().trim() || undefined,
                    gender: (() => {
                        const g = String(getValue(['gender', 'GENDER']) || '').trim();
                        return g ? g.replace(/^\w/, c => c.toUpperCase()) : undefined;
                    })(),
                    address: String(getValue(['address', 'ADDRESS', 'FULL ADDRESS', 'Full Address']) || '').trim(),
                    dob: parseExcelDate(getValue(['dob', 'DOB', 'DATE OF BIRTH', 'Date of Birth'])),
                    admissionDate: parseExcelDate(getValue(['admissionDate', 'ADMISSION DATE', 'Admission Date'])) || new Date(),
                    session: String(getValue(['session', 'SESSION']) || '').trim(),
                    fees: Number(getValue(['fees', 'FEES', 'FEE'])) || 0,
                    discount: Math.max(Number(getValue(['discount', 'DISCOUNT'])) || 0, 0),
                    status: resolvedBatchId ? 'active' : 'batch_pending',
                    fatherName: String(getValue(['fatherName', 'FATHER NAME', "FATHER'S NAME", 'Father Name']) || '').trim(),
                    motherName: String(getValue(['motherName', 'MOTHER NAME', "MOTHER'S NAME", 'Mother Name']) || '').trim(),
                    parentPhone: String(getValue(['parentPhone', 'PARENT PHONE', 'Parent Phone', 'GUARDIAN CONTACT', 'Guardian Contact', 'PARENT CONTACT NUMBER']) || '').trim(),
                    currentYear: String(getValue(['currentYear', 'CURRENT YEAR']) || '1').trim(),
                    password: 'student@123',
                    portalAccess: { signupStatus: 'no' }
                });
                await student.save();

                if (student.batchId) {
                    await createAdmissionFeeRecord({
                        student,
                        batchId: student.batchId,
                        admissionDate: student.admissionDate,
                        adminId: req.admin?.id
                    });
                }

                // Send onboarding notification
                if (student) {
                    await triggerAutomaticNotification({
                        studentId: student._id,
                        message: `Welcome ${student.name}! Your registration is successful. Roll No: ${student.rollNo}, Password: student@123. Please login to your portal.`,
                        eventType: 'studentRegistration',
                        adminId: req.admin?.id,
                        data: {
                            password: 'student@123',
                            portalUrl
                        },
                        attachments: registrationAttachments.map((attachment) => ({ ...attachment }))
                    });
                }

                successCount++;
            } catch (err) {
                failedCount++;
                errors.push({ name: s.name || 'Unknown', error: err.message });
            }
        });

        await invalidateStudentReadCaches();
        res.status(201).json({
            message: `${successCount} students inserted, ${failedCount} failed.`,
            total: students.length,
            success: successCount,
            failed: failedCount,
            errors
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/students/export
exports.exportStudents = async (req, res) => {
    try {
        const { className, batchId } = req.query;
        const filter = {};
        if (className) filter.className = className;
        if (batchId) filter.batchId = batchId;

        const students = await Student.find(filter)
            .populate('batchId', 'name subjects')
            .sort({ joinedAt: -1 })
            .lean();
        res.json({ students });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET all batches
exports.getBatches = async (req, res) => {
    try {
        const [batches, enrollmentRows] = await Promise.all([
            Batch.find({ isActive: true }).select('name subjects fees capacity course').lean(),
            Student.aggregate([
                { $match: { batchId: { $ne: null } } },
                { $group: { _id: '$batchId', enrolled: { $sum: 1 } } }
            ])
        ]);

        const enrollmentMap = new Map(
            enrollmentRows.map((row) => [String(row._id), row.enrolled])
        );

        const batchDetails = batches.map((batch) => ({
            ...batch,
            enrolled: enrollmentMap.get(String(batch._id)) || 0
        }));

        res.json({ batches: batchDetails });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/students/:id
exports.getStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id)
            .populate('batchId', 'name subjects fees capacity course')
            .lean();

        if (!student) return res.status(404).json({ message: 'Student not found' });
        let feeBalance = null;
        let feePayments = [];

        const { start, end } = getAttendanceDateRange();
        const attendanceMap = await buildAttendanceSummaryMap([student._id], { dateFrom: start, dateTo: end });
        const attendanceSummary = attendanceMap.get(student._id.toString()) || {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            percentage: 0
        };

        res.json({
            student: { ...student, activity: deriveActivityStatus(student), attendanceSummary },
            feeBalance,
            feePayments,
            fees: feePayments
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
