const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

// GET /api/fees — all fees with optional filters
exports.getAllFees = async (req, res) => {
    try {
        const { search = '', status = '', batchId = '', course = '', page = 1, limit = 20 } = req.query;

        const query = { isDeleted: { $ne: true } };
        if (status) query.status = status;
        if (batchId) query.batchId = batchId;

        // If search or course filtering is needed, find matching students first
        if (search || course) {
            const studentQuery = {};
            if (search) {
                studentQuery.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { rollNo: { $regex: search, $options: 'i' } }
                ];
            }
            if (course) {
                studentQuery.className = course;
            }
            const students = await Student.find(studentQuery).select('_id');
            query.studentId = { $in: students.map(s => s._id) };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Fee.countDocuments(query);
        const fees = await Fee.find(query)
            .populate('studentId', 'name rollNo className fatherName motherName address session')
            .populate('batchId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.json({ fees, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/fees/metrics — summary numbers for the top cards
exports.getMetrics = async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long' });
        const currentYear = now.getFullYear();

        const [totals, studentCount, pendingFeeStudents, fullyPaidStudents] = await Promise.all([
            Fee.aggregate([
                {
                    $group: {
                        _id: '$status',
                        billed: { $sum: '$totalFee' }, // updated from explicit calculation
                        paid: { $sum: '$amountPaid' },
                        pending: { $sum: '$pendingAmount' }, // updated from subtraction
                        count: { $sum: 1 }
                    }
                }
            ]),
            Student.countDocuments({ status: 'active' }),
            Fee.distinct('studentId', { status: { $in: ['pending', 'partial', 'overdue'] } }),
            Fee.distinct('studentId', { status: 'paid', month: currentMonth, year: currentYear })
        ]);

        // 1. Get totals from ALL existing Fee records (this covers previous months and current month if invoices exist)
        // (Handled by the aggregate query above)

        // 2. Identify students who DO NOT have ANY fee invoice (paid or unpaid) for the current month
        // We need to add their default monthly fees because they technically owe for the current month.
        const studentsWithInvoicesThisMonth = await Fee.distinct('studentId', { month: currentMonth, year: currentYear });

        const studentsWithoutInvoicesThisMonth = await Student.find({
            status: 'active',
            _id: { $nin: studentsWithInvoicesThisMonth }
        }).select('fees registrationFee').lean();

        let assumedPendingFromUnpaid = 0;
        studentsWithoutInvoicesThisMonth.forEach(s => {
            assumedPendingFromUnpaid += (s.fees || 0) + (s.registrationFee || 0);
        });

        // Unique students with pending/overdue invoices across ALL time
        const studentsWithPendingInvoices = new Set(pendingFeeStudents.map(id => id.toString()));

        // Add students who have no invoice this month (they are pending for this month)
        studentsWithoutInvoicesThisMonth.forEach(s => studentsWithPendingInvoices.add(s._id.toString()));

        const pendingHeadcount = studentsWithPendingInvoices.size;

        const stats = {
            totalCollected: 0,
            totalPending: 0,
            overdueAmount: 0,
            monthlyCollection: 0,
            totalStudents: studentCount,
            pendingStudents: pendingHeadcount
        };

        totals.forEach(t => {
            stats.totalCollected += t.paid;
            stats.totalPending += t.pending;
            if (t._id === 'overdue') stats.overdueAmount += t.pending;
        });

        // Add the assumed pending amounts for students without explicit fee records this month
        stats.totalPending += assumedPendingFromUnpaid;

        // Get monthly collection specifically
        const monthlyData = await Fee.aggregate([
            { $unwind: '$paymentHistory' },
            {
                $match: {
                    'paymentHistory.date': {
                        $gte: new Date(now.getFullYear(), now.getMonth(), 1)
                    }
                }
            },
            { $group: { _id: null, total: { $sum: '$paymentHistory.paidAmount' } } }
        ]);
        stats.monthlyCollection = monthlyData[0]?.total || 0;

        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees — create a fee record manually
exports.createFee = async (req, res) => {
    try {
        const { studentId, batchId, amount, registrationFee, dueDate, month, year } = req.body;
        const currentYear = year || new Date().getFullYear();

        // Hardened Validation
        if (!studentId) return res.status(400).json({ message: 'Student selection is required.' });

        // Duplicate payment protection
        const existingFee = await Fee.findOne({ studentId, month, year: currentYear });
        if (existingFee) {
            return res.status(409).json({ message: "This month's tuition fee is already created." });
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount < 0) {
            return res.status(400).json({ message: 'A valid numeric fee amount is required.' });
        }

        const fee = new Fee({
            studentId,
            batchId,
            monthlyTuitionFee: numericAmount,
            registrationFee: parseFloat(registrationFee) || 0,
            dueDate,
            month,
            year: currentYear
        });

        await fee.save();

        if (req.admin && req.admin.id) {
            await AuditLog.create({
                userId: req.admin.id,
                userModel: 'Admin',
                action: 'CREATE_FEE',
                entity: 'Fee',
                entityId: fee._id,
                details: { month, year: currentYear, amount: numericAmount },
                ipAddress: req.ip
            });
        }

        res.status(201).json({ message: 'Fee record created successfully', fee });
    } catch (err) {
        console.error('Create Fee Error:', err);
        // Clean duplicate key error for {studentId, month, year}
        if (err.code === 11000) {
            return res.status(400).json({ message: 'A fee record already exists for this student in this month and year.' });
        }
        res.status(500).json({ message: 'Internal server error while creating fee', error: err.message });
    }
};

// POST /api/fees/:id/expense — Add other expense
exports.addOtherExpense = async (req, res) => {
    try {
        const { title, amount, date, description } = req.body;
        if (!title || !amount) {
            return res.status(400).json({ message: 'Title and amount are required for other expenses.' });
        }

        const fee = await Fee.findById(req.params.id);
        if (!fee) return res.status(404).json({ message: 'Fee record not found.' });

        fee.otherExpenses.push({
            title,
            amount: parseFloat(amount),
            date: date ? new Date(date) : new Date(),
            description
        });

        await fee.save(); // pre-save calculates pending amount and totals
        res.json({ message: 'Special expense added successfully', fee });
    } catch (err) {
        console.error('Add Expense Error:', err);
        res.status(500).json({ message: 'Internal server error while adding expense', error: err.message });
    }
};

// POST /api/fees/:id/pay — capture payment (installment)
exports.capturePayment = async (req, res) => {
    try {
        const { amountPaid, mode, transactionId, remarks, fine, bankName, journalNo } = req.body;
        const fee = await Fee.findById(req.params.id);
        if (!fee) return res.status(404).json({ message: 'Fee record not found' });

        // Hardened Validation
        const paid = parseFloat(amountPaid);
        if (isNaN(paid) || paid <= 0) {
            return res.status(400).json({ message: 'Please enter a valid payment amount greater than 0.' });
        }

        const lateFine = parseFloat(fine) || 0;
        if (isNaN(lateFine) || lateFine < 0) {
            return res.status(400).json({ message: 'Late fine must be a valid non-negative number.' });
        }

        // --- NEW STRICT VALIDATION BOUNDS ---
        if (paid > fee.pendingAmount) {
            return res.status(400).json({
                message: `Payment amount (₹${paid}) exceeds remaining balance (₹${fee.pendingAmount}).`
            });
        }

        const receiptNo = `RCP-${Date.now().toString(36).toUpperCase()}`;

        // SHA256 Tamper Protection Hash
        const hashString = `${fee.studentId.toString()}-${paid}-${new Date().toISOString()}`;
        const receiptHash = crypto.createHash('sha256').update(hashString).digest('hex');

        fee.fine = (parseFloat(fee.fine) || 0) + lateFine;

        fee.paymentHistory.push({
            paidAmount: paid,
            paymentMethod: mode || 'Cash',
            transactionId: transactionId || '',
            paymentId: `PAY-${Date.now().toString(16).toUpperCase()}`,
            receiptNo,
            receiptHash, // Embedded Non-repudiation
            bankName,
            journalNo,
            remarks: remarks || '',
            date: new Date()
        });

        // The pre-save hook computes `pendingAmount`, `amountPaid` and updates status correctly instead of doing it manually here.
        await fee.save();

        // Update student's aggregate
        await Student.findByIdAndUpdate(fee.studentId, { $inc: { feesPaid: paid } });

        // Audit Trail
        const actorId = (req.admin && req.admin.id) ? req.admin.id : fee.studentId;
        const actorModel = (req.admin && req.admin.id) ? 'Admin' : 'Student';
        await AuditLog.create({
            userId: actorId,
            userModel: actorModel,
            action: 'CAPTURE_PAYMENT',
            entity: 'Fee',
            entityId: fee._id,
            details: { paidAmount: paid, receiptNo, receiptHash },
            ipAddress: req.ip
        });

        res.json({ message: 'Payment recorded successfully', fee, receiptNo });
    } catch (err) {
        console.error('Capture Payment Error:', err);
        res.status(500).json({ message: 'Internal server error while recording payment', error: err.message });
    }
};

// Internal helper to generate fee records for a list of students
async function _generateFeeRecords(students, month, year, dueDate) {
    if (!students || students.length === 0) return 0;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = monthNames.indexOf(month);
    const startOfTargetMonth = new Date(year, monthIndex, 1);
    const endOfTargetMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);

    const eligibleStudents = students.filter(s => {
        if (s.admissionDate && s.admissionDate > endOfTargetMonth) return false;
        if (s.batchId) {
            const bStart = s.batchId.startDate;
            const bEnd = s.batchId.endDate;
            if (bStart && bStart > endOfTargetMonth) return false;
            if (bEnd && bEnd < startOfTargetMonth) return false;
        }
        return true;
    });

    if (eligibleStudents.length === 0) return 0;

    const feeRecords = eligibleStudents.map(s => {
        const baseAmount = s.batchId?.fees || s.fees || 0;

        // Include registration fee ONLY if billing month/year matches admission month/year
        let regFee = 0;
        if (s.registrationFee && s.admissionDate) {
            const admDate = new Date(s.admissionDate);
            const admMonth = admDate.toLocaleString('default', { month: 'long' });
            const admYear = admDate.getFullYear();

            if (admMonth === month && admYear === year) {
                regFee = s.registrationFee;
            }
        }

        return {
            studentId: s._id,
            batchId: s.batchId?._id,
            monthlyTuitionFee: baseAmount,
            registrationFee: regFee,
            totalFee: baseAmount + regFee,
            pendingAmount: baseAmount + regFee,
            amountPaid: 0,
            month: month,
            year: year,
            dueDate: dueDate || new Date(year, monthIndex, 10),
            status: 'pending'
        };
    });

    let count = 0;
    try {
        const result = await Fee.insertMany(feeRecords, { ordered: false });
        count = result.length;
    } catch (error) {
        count = error.result?.nInserted || 0;
    }
    return count;
}

// POST /api/fees/generate — Bulk generate monthly fees
exports.generateFees = async (req, res) => {
    try {
        const { month, year, dueDate } = req.body;
        const now = new Date();
        const targetMonth = month || now.toLocaleString('default', { month: 'long' });
        const targetYear = parseInt(year) || now.getFullYear();

        const students = await Student.find({ status: 'active' }).populate('batchId');
        const count = await _generateFeeRecords(students, targetMonth, targetYear, dueDate ? new Date(dueDate) : null);

        res.status(201).json({
            message: count > 0
                ? `Successfully generated ${count} fee records for ${targetMonth} ${targetYear}.`
                : `No new fee records were generated for this period.`,
            count
        });
    } catch (err) {
        res.status(500).json({ message: 'Bulk generation failed', error: err.message });
    }
};

/**
 * Ensures a specific list of students have fee records for the current month.
 * Used during new student admission.
 */
exports.ensureMonthlyFeeForStudents = async (studentIds) => {
    try {
        const now = new Date();
        const month = now.toLocaleString('default', { month: 'long' });
        const year = now.getFullYear();

        const students = await Student.find({ _id: { $in: studentIds } }).populate('batchId');
        return await _generateFeeRecords(students, month, year, null);
    } catch (err) {
        console.error('[ensureMonthlyFeeForStudents] Error:', err);
        return 0;
    }
};

// DELETE /api/fees/:id
exports.deleteFee = async (req, res) => {
    try {
        const feeId = req.params.id;
        const fee = await Fee.findById(feeId);
        if (!fee) return res.status(404).json({ message: 'Fee record not found' });

        fee.isDeleted = true;
        await fee.save();

        if (req.admin && req.admin.id) {
            await AuditLog.create({
                userId: req.admin.id,
                userModel: 'Admin',
                action: 'DELETE_FEE',
                entity: 'Fee',
                entityId: fee._id,
                details: { status: 'soft_deleted', previousTotal: fee.totalFee },
                ipAddress: req.ip
            });
        }

        res.json({ message: 'Fee record deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
