const Teacher = require('../models/Teacher');
const { triggerAutomaticNotification } = require('../services/notificationService');
const { logNotificationEvent } = require('../services/activityLogService');

// GET /api/teachers
exports.getAllTeachers = async (req, res) => {
    try {
        const { status = '', search = '', page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (search) query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { regNo: { $regex: search, $options: 'i' } },
        ];

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Teacher.countDocuments(query);
        const teachers = await Teacher.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.json({ teachers, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/teachers/summary
exports.getSummary = async (req, res) => {
    try {
        const teachers = await Teacher.find().lean();
        const activeTeachers = teachers.filter(t => t.status === 'active');
        const inactiveTeachers = teachers.filter(t => t.status !== 'active');
        res.json({
            totalFaculty: teachers.length,
            activeFaculty: activeTeachers.length,
            inactiveFaculty: inactiveTeachers.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/teachers
exports.createTeacher = async (req, res) => {
    try {
        const {
            name, dob, gender, email, phone,
            joiningDate, status, password
        } = req.body;

        if (!name) return res.status(400).json({ message: 'Teacher name is required' });

        const currentYear = new Date().getFullYear() % 100;
        const yearPrefix = `TCH${currentYear}`;

        const lastTeacher = await Teacher.findOne({ regNo: new RegExp(`^${yearPrefix}`) }, 'regNo').sort({ regNo: -1 });
        let nextNum = 1;
        if (lastTeacher && lastTeacher.regNo) {
            const numPart = lastTeacher.regNo.replace(yearPrefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) nextNum = num + 1;
        }
        const TCHregNo = `${yearPrefix}${String(nextNum).padStart(2, '0')}`;

        const profileImage = req.file ? req.file.path : null;
        const teacherPassword = password || 'teacher@123';

        const teacher = new Teacher({
            name, dob, gender, email, phone,
            profileImage,
            regNo: TCHregNo || undefined,
            joiningDate: joiningDate || undefined,
            password: teacherPassword,
            systemRole: 'Teacher',
            status
        });

        await teacher.save();

        // Log teacher onboarding activity instead of sending email.
        if (teacher.email) {
            triggerAutomaticNotification({
                eventType: 'teacherRegistration',
                teacherId: teacher._id,
                message: `Your faculty account has been created. Reg No: ${teacher.regNo}`,
                data: {
                    password: teacherPassword,
                           portalUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
                           teacherPortalUrl: process.env.TEACHER_PORTAL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
                }
            });

            logNotificationEvent({
                recipientEmail: teacher.email,
                recipientName: teacher.name,
                subject: `Welcome to Institute — Your Faculty Account`,
                type: 'teacher_registration',
                data: {
                    regNo: teacher.regNo
                }
            }).catch(() => console.error('[TeacherNotificationLog] Admission logging failed'));
        }

        res.status(201).json({ message: 'Teacher created', teacher });
    } catch (err) {
        console.error('[createTeacher] Failed to create teacher');
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue || {})[0] || 'field';
            return res.status(400).json({ message: `Duplicate value: ${field} already exists` });
        }
        res.status(500).json({ message: err.message || 'Server error' });
    }
};

// PUT /api/teachers/:id  (protected by verifyAdminPassword)
exports.updateTeacher = async (req, res) => {
    try {
        const {
            adminPassword, password,
            name, dob, gender, email, phone,
            joiningDate, status
        } = req.body;

        const update = {
            name,
            dob,
            gender,
            email,
            phone,
            joiningDate,
            status
        };

        if (req.file) {
            update.profileImage = req.file.path;
        }

        if (password) {
            update.password = password; // hashing is handled by pre-save hook
        }

        const teacher = await Teacher.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        res.json({ message: 'Teacher updated', teacher });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/teachers/:id  (protected by verifyAdminPassword)
exports.deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        res.json({ message: 'Teacher deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/teachers/bulk-update
exports.bulkUpdate = async (req, res) => {
    try {
        const { ids, updates } = req.body;
        if (!ids || !ids.length) return res.status(400).json({ message: 'No IDs provided' });
        if (!updates || typeof updates !== 'object') return res.status(400).json({ message: 'No updates provided' });
        const allowedFields = ['status'];
        const cleanUpdates = {};

        allowedFields.forEach(field => {
            if (updates[field] !== undefined && updates[field] !== '') {
                cleanUpdates[field] = String(updates[field]).trim();
            }
        });

        if (Object.keys(cleanUpdates).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update' });
        }

        await Teacher.updateMany({ _id: { $in: ids } }, { $set: cleanUpdates });
        res.json({ message: `Successfully updated ${ids.length} faculty members.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/teachers/bulk
exports.bulkUpload = async (req, res) => {
    try {
        const { teachers } = req.body;
        if (!Array.isArray(teachers) || teachers.length === 0)
            return res.status(400).json({ message: 'No teacher data provided' });

        const currentYear = new Date().getFullYear() % 100;
        const yearPrefix = `TCH${currentYear}`;

        const lastTeacher = await Teacher.findOne({ regNo: new RegExp(`^${yearPrefix}`) }, 'regNo').sort({ regNo: -1 });
        let nextNum = 1;
        if (lastTeacher && lastTeacher.regNo) {
            const numPart = lastTeacher.regNo.replace(yearPrefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) nextNum = num + 1;
        }

        let successCount = 0;
        let failedCount = 0;
        const errors = [];

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

        const defaultPassword = 'teacher@123';

        await Promise.all(teachers.map(async (t, i) => {
            try {
                const getValue = (keys) => {
                    const match = keys.find(k => t[k] !== undefined);
                    return match !== undefined ? t[match] : undefined;
                };

                const teacher = new Teacher({
                    name: String(getValue(['name', 'NAME', 'Teacher Name', 'TEACHER NAME']) || '').trim(),
                    email: String(getValue(['email', 'EMAIL', 'EMAIL ADDRESS', 'Email Address']) || '').toLowerCase().trim() || undefined,
                    phone: String(getValue(['phone', 'PHONE', 'MOBILE NUMBER', 'Mobile']) || '').trim() || undefined,
                    gender: String(getValue(['gender', 'GENDER']) || '').trim().replace(/^\w/, c => c.toUpperCase()),
                    dob: parseExcelDate(getValue(['dob', 'DOB', 'DATE OF BIRTH', 'Date of Birth'])),
                    joiningDate: parseExcelDate(getValue(['joiningDate', 'JOINING DATE', 'Joining Date'])) || new Date(),
                    regNo: `${yearPrefix}${String(nextNum + i).padStart(2, '0')}`,
                    password: defaultPassword,
                    systemRole: 'Teacher',
                    status: 'active'
                });

                await teacher.save();

                // Trigger Automatic Email Notification
                if (teacher.email) {
                    triggerAutomaticNotification({
                        eventType: 'teacherRegistration',
                        teacherId: teacher._id,
                        message: `Welcome to Institute. Your faculty account has been created.`,
                        data: {
                            password: defaultPassword,
                            portalUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
                            teacherPortalUrl: process.env.TEACHER_PORTAL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
                        }
                    });
                }

                successCount++;
            } catch (err) {
                failedCount++;
                errors.push({ name: t.name || 'Unknown', error: err.message });
            }
        }));

        res.status(201).json({
            message: `${successCount} teachers inserted, ${failedCount} failed.`,
            total: teachers.length,
            success: successCount,
            failed: failedCount,
            errors
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


