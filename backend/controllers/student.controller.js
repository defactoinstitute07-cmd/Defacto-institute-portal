const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Admin = require('../models/Admin');
const Fee = require('../models/Fee');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const feeController = require('./fee.controller');

// GET /api/students/stats
exports.getStudentStats = async (req, res) => {
    try {
        const total = await Student.countDocuments();
        const active = await Student.countDocuments({ status: 'active' });
        const completed = await Student.countDocuments({ status: 'completed' });

        // Fee pending: students who have at least one fee record that is not 'paid'
        const pendingStudents = await Fee.distinct('studentId', { status: { $in: ['pending', 'partial', 'overdue'] } });
        const feePending = pendingStudents.length;

        // New admissions this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const newAdmissions = await Student.countDocuments({ admissionDate: { $gte: startOfMonth } });

        res.json({
            total,
            active,
            completed,
            feePending,
            newAdmissions,
            attendanceAvg: 85 // Mock value as attendance system is separate
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching stats', error: err.message });
    }
};

// GET /api/students
exports.getAllStudents = async (req, res) => {
    try {
        const { search = '', batch = '', status = '', className = '', page = 1, limit = 20 } = req.query;

        const query = {};
        if (search) query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { rollNo: { $regex: search, $options: 'i' } }
        ];
        if (batch && mongoose.Types.ObjectId.isValid(batch)) query.batchId = batch;
        if (status) query.status = status;
        if (className) query.className = className;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Student.countDocuments(query);
        const students = await Student.find(query)
            .populate('batchId', 'name subjects fees capacity')
            .sort({ joinedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.json({ students, total, page: parseInt(page), pages: Math.ceil(total / limit) });
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
            fees: data.fees || 0,
            registrationFee: data.registrationFee || 0,
            fatherName: data.fatherName,
            motherName: data.motherName,
            currentYear: data.currentYear || '1'
        };

        const student = new Student(studentData);
        await student.save();

        // Automatically ensure fee for current month
        await feeController.ensureMonthlyFeeForStudents([student._id]);

        const result = student.toObject();
        delete result.password;
        res.status(201).json({ message: 'Student created and fee generated', student: result });
    } catch (err) {
        console.error('[createStudent]', err);
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

        if (data.password && data.password.trim() !== '') {
            data.password = await bcrypt.hash(data.password, 10);
        } else {
            delete data.password;
        }

        const student = await Student.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json({ message: 'Updated', student });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/students/:id (Admin password required)
exports.deleteStudent = async (req, res) => {
    try {
        const { adminPassword } = req.body;
        if (!adminPassword) return res.status(400).json({ message: 'Admin password required' });

        const admin = await Admin.findOne();
        const valid = await bcrypt.compare(adminPassword, admin.password);
        if (!valid) return res.status(401).json({ message: 'Incorrect admin password' });

        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/students/delete-all (Admin password required)
exports.deleteAllStudents = async (req, res) => {
    try {
        const { adminPassword } = req.body;
        if (!adminPassword) return res.status(400).json({ message: 'Admin password required' });

        const admin = await Admin.findOne();
        const valid = await bcrypt.compare(adminPassword, admin.password);
        if (!valid) return res.status(401).json({ message: 'Incorrect admin password' });

        await Student.deleteMany({});
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
        const newStudentIds = [];

        // Pre-fetch all active batches to build a fast memory map for name resolution
        const allBatches = await Batch.find({ isActive: true }).select('_id name');
        const batchMap = {};
        allBatches.forEach(b => {
            batchMap[b.name.toLowerCase().trim()] = b._id;
        });

        // Using individual save() to ensure pre-save hooks (password hashing) trigger
        await Promise.all(students.map(async (s, i) => {
            try {
                // Resolve text batchName to Mongo ID
                let resolvedBatchId = s.batchId;
                if (!resolvedBatchId && s.batchName) {
                    const cleanName = String(s.batchName).toLowerCase().trim();
                    resolvedBatchId = batchMap[cleanName] || null;
                }

                // Helper to safely parse naive "DD-MM-YYYY" or standard dates into JS Date objects
                const parseExcelDate = (dateVal) => {
                    if (!dateVal) return undefined;

                    // If it's already a JS Date
                    if (dateVal instanceof Date) return dateVal;

                    // If it's an Excel serial date number (e.g. 40314 = 15-May-2010 approx)
                    if (typeof dateVal === 'number') {
                        return new Date((dateVal - (25567 + 2)) * 86400 * 1000);
                    }

                    // If it's a string like "15-05-2010"
                    if (typeof dateVal === 'string') {
                        const parts = dateVal.split('-');
                        if (parts.length === 3) {
                            // Convert DD-MM-YYYY to YYYY-MM-DD for standard parsing
                            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
                        }
                    }
                    return new Date(dateVal); // final fallback
                };

                const student = new Student({
                    name: s.name,
                    rollNo: s.rollNo || `${yearPrefix}${String(nextNum + i).padStart(2, '0')}`,
                    batchId: resolvedBatchId,
                    className: s.className,
                    contact: String(s.phone || s.contact || ''),
                    email: s.email,
                    gender: s.gender,
                    address: s.address,
                    dob: parseExcelDate(s.dob),
                    admissionDate: parseExcelDate(s.admissionDate) || new Date(),
                    session: s.session,
                    fees: s.fees ? Number(s.fees) : 0,
                    status: s.status ? String(s.status).toLowerCase().trim() : 'active',
                    fatherName: s.fatherName,
                    motherName: s.motherName,
                    currentYear: s.currentYear || '1',
                    password: await require('bcryptjs').hash('student@123', 10)
                });
                await student.save();
                newStudentIds.push(student._id);
                successCount++;
            } catch (err) {
                failedCount++;
                errors.push({ name: s.name || 'Unknown', error: err.message });
            }
        }));

        // Generate fees for all successfully added students
        if (newStudentIds.length > 0) {
            await feeController.ensureMonthlyFeeForStudents(newStudentIds);
        }

        res.status(201).json({
            message: `${successCount} students inserted, ${failedCount} failed. Fees generated for new admissions.`,
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
        const students = await Student.find()
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
        const batches = await Batch.find({ isActive: true }).select('name subjects fees capacity course');
        // Count enrolled for each batch
        const batchDetails = await Promise.all(batches.map(async b => {
            const enrolled = await Student.countDocuments({ batchId: b._id });
            return {
                ...b.toObject(),
                enrolled
            };
        }));
        res.json({ batches: batchDetails });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

