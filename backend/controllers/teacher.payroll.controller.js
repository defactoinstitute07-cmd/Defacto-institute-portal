const {
    TeacherSalaryProfile,
    TeacherExtraClass,
    TeacherLeave,
    TeacherBonus,
    TeacherSalary,
    TeacherPayment
} = require('../models/TeacherPayroll');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');


// ==========================================
// 1. SALARY PROFILES
// ==========================================

// Get a single teacher's profile
exports.getSalaryProfile = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const profile = await TeacherSalaryProfile.findOne({ teacherId }).populate('teacherId', 'name email phone status regNo department');
        if (!profile) return res.status(404).json({ message: 'Salary profile not found for this teacher.' });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create or update a salary profile
exports.upsertSalaryProfile = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { salaryType, baseSalary, bankDetails, status } = req.body;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        let profile = await TeacherSalaryProfile.findOne({ teacherId });

        if (profile) {
            profile.salaryType = salaryType || profile.salaryType;
            profile.baseSalary = baseSalary || profile.baseSalary;
            if (bankDetails) profile.bankDetails = bankDetails;
            if (status) profile.status = status;
            profile.updatedAt = Date.now();
            await profile.save();
        } else {
            profile = new TeacherSalaryProfile({ teacherId, salaryType, baseSalary, bankDetails, status });
            await profile.save();
        }

        res.json({ message: 'Salary profile saved successfully', profile });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ==========================================
// 2. EXTRA CLASSES & LEAVES
// ==========================================

exports.logExtraClass = async (req, res) => {
    try {
        const { teacherId, date, className, hours, ratePerHour } = req.body;
        if (!teacherId || !date || !hours || !ratePerHour) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const monthRecord = new Date(date).toISOString().slice(0, 7); // YYYY-MM
        const amount = hours * ratePerHour;

        const extraClass = new TeacherExtraClass({
            teacherId, date, className, hours, ratePerHour, amount, monthRecord
        });

        await extraClass.save();
        res.status(201).json({ message: 'Extra class logged successfully', extraClass });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.logLeave = async (req, res) => {
    try {
        const { teacherId, date, reason, isHalfDay } = req.body;
        if (!teacherId || !date) return res.status(400).json({ message: 'Missing required fields' });

        const monthRecord = new Date(date).toISOString().slice(0, 7); // YYYY-MM

        const leave = new TeacherLeave({
            teacherId, date, reason, isHalfDay, monthRecord
        });

        await leave.save();
        res.status(201).json({ message: 'Leave logged successfully', leave });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.logBonus = async (req, res) => {
    try {
        const { teacherId, date, reason, amount } = req.body;
        if (!teacherId || !date || !amount) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const monthRecord = new Date(date).toISOString().slice(0, 7); // YYYY-MM

        const bonus = new TeacherBonus({
            teacherId, date, reason, amount, monthRecord
        });

        await bonus.save();
        res.status(201).json({ message: 'Bonus logged successfully', bonus });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// ==========================================
// 3. MONTHLY SALARY CALCULATION ENGINE
// ==========================================

// Helper function to calculate one teacher's salary for a specific month
const calculateSalaryForTeacher = async (teacherId, monthYear) => {
    const profile = await TeacherSalaryProfile.findOne({ teacherId, status: 'Active' });
    if (!profile) return null; // Inactive or no profile = skip generation

    const baseSalary = profile.baseSalary || 0;

    // 1. Calculate Extra Classes
    const extraClasses = await TeacherExtraClass.find({ teacherId, monthRecord: monthYear });
    const extraClassesAmount = extraClasses.reduce((sum, record) => sum + record.amount, 0);

    // 2. Calculate Leaves
    const leaves = await TeacherLeave.find({ teacherId, monthRecord: monthYear });
    let totalLeaveDays = leaves.reduce((sum, leave) => sum + (leave.isHalfDay ? 0.5 : 1), 0);

    // Leave Deduction = (Base / 30) * Leave Days
    const dailyRate = baseSalary / 30;
    const leaveDeductions = Math.round(dailyRate * totalLeaveDays);

    // 3. Calculate Bonuses
    const bonuses = await TeacherBonus.find({ teacherId, monthRecord: monthYear });
    const bonusAmount = bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);

    // Net = Base + Extra + Bonus - Leaves
    let netSalary = baseSalary + extraClassesAmount + bonusAmount - leaveDeductions;
    if (netSalary < 0) netSalary = 0;

    return {
        teacherId,
        monthYear,
        baseSalary,
        extraClassesAmount,
        leaveDeductions,
        advanceDeductions: 0,
        bonusAmount,
        netSalary,
        status: 'Pending'
    };
};

// Manual trigger for a specific teacher & month (or bulk generate)
exports.generateMonthlySalaries = async (req, res) => {
    try {
        const { monthYear } = req.body; // YYYY-MM
        if (!monthYear) return res.status(400).json({ message: 'monthYear (YYYY-MM) is required' });

        // Find all active profiles
        const profiles = await TeacherSalaryProfile.find({ status: 'Active' });
        let generatedCount = 0;

        for (const p of profiles) {
            // Check if already generated for this month
            const existing = await TeacherSalary.findOne({ teacherId: p.teacherId, monthYear });
            if (existing) continue; // Skip if already there

            const salaryData = await calculateSalaryForTeacher(p.teacherId, monthYear);
            if (salaryData) {
                const newSalary = new TeacherSalary(salaryData);
                await newSalary.save();
                generatedCount++;
            }
        }

        res.json({ message: `Successfully generated ${generatedCount} salary records for ${monthYear}` });
    } catch (error) {
        res.status(500).json({ message: 'Server error during generation', error: error.message });
    }
};


// ==========================================
// 4. PAYMENTS & LEDGER
// ==========================================

exports.markSalaryPaid = async (req, res) => {
    try {
        const { salaryRecordId } = req.params;
        const { paidAmount, paymentMethod, transactionId, notes } = req.body;

        const salary = await TeacherSalary.findById(salaryRecordId);
        if (!salary) return res.status(404).json({ message: 'Salary record not found' });

        if (salary.status === 'Paid') return res.status(400).json({ message: 'Salary already marked as paid' });

        const payment = new TeacherPayment({
            salaryRecordId,
            teacherId: salary.teacherId,
            paidAmount,
            paymentMethod,
            transactionId: transactionId || `PAY-${salary.monthYear.replace('-', '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            notes
        });
        await payment.save();

        // Update salary record status and synchronized fields
        salary.status = 'Paid';
        salary.paymentMethod = paymentMethod;
        salary.transactionId = payment.transactionId; // Use the generated/provided ID from payment doc
        salary.paymentDate = new Date(); // Use server date
        salary.notes = notes;

        // Capture UPI ID used if applicable
        if (paymentMethod === 'UPI') {
            const profile = await TeacherSalaryProfile.findOne({ teacherId: salary.teacherId });
            salary.upiId = profile?.bankDetails?.upiId;
        }

        await salary.save();

        res.json({ message: 'Payment recorded successfully', payment });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ==========================================
// 5. DASHBOARD STATS
// ==========================================
exports.getPayrollDashboardStats = async (req, res) => {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2023-10"

        const totalTeachers = await Teacher.countDocuments({ status: 'active' });
        const activeProfiles = await TeacherSalaryProfile.countDocuments({ status: 'Active' });

        // Salaries for current month
        const currentMonthSalaries = await TeacherSalary.find({ monthYear: currentMonth });

        let totalLiability = 0;
        let totalPaid = 0;
        let totalPending = 0;

        currentMonthSalaries.forEach(s => {
            totalLiability += s.netSalary;
            if (s.status === 'Paid') {
                totalPaid += s.netSalary;
            } else {
                totalPending += s.netSalary;
            }
        });

        res.json({
            totalTeachers,
            teachersWithProfiles: activeProfiles,
            currentMonth,
            totalLiability,
            totalPaid,
            totalPending
        });

    } catch (error) {
        res.status(500).json({ message: 'Dashboard stats error', error: error.message });
    }
};

// Get history of salaries for grid view
exports.getAllSalaries = async (req, res) => {
    try {
        const { monthYear, teacherId } = req.query; // optional filters
        const query = {};
        if (monthYear) query.monthYear = monthYear;
        if (teacherId) query.teacherId = teacherId;
        const salaries = await TeacherSalary.find(query)
            .populate('teacherId', 'name email profileImage regNo department')
            .sort({ createdAt: -1 });

        res.json(salaries);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
