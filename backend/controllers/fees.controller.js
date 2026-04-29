const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Admin = require('../models/Admin');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { CACHE_PREFIXES, invalidateRouteCaches } = require('../middleware/responseCache');
const { triggerAutomaticNotification, resolveNotificationTemplate } = require('../services/notificationService');
const { sendEmail } = require('../services/emailService');

// Helper to recalc pending & status
const recalcStatus = (feeDoc) => {
    const totalFee = Number(feeDoc.totalFee || 0);
    const amountPaid = Number(feeDoc.amountPaid || 0);
    const pending = Math.max(totalFee - amountPaid, 0);
    feeDoc.pendingAmount = pending;

    if (pending <= 0 && totalFee > 0) feeDoc.status = 'paid';
    else if (amountPaid > 0 && pending > 0) feeDoc.status = 'partial';
    else feeDoc.status = 'pending';
};

const formatCurrency = (value) => {
    const numValue = Number(value || 0);
    return numValue.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
};

const invalidateFeeReadCaches = () => invalidateRouteCaches([
    CACHE_PREFIXES.dashboard,
    CACHE_PREFIXES.fees,
    CACHE_PREFIXES.students
]);

const createFeeReceiptPdfBuffer = ({ fee, payment, admin }) => {
    const student = fee.studentId || {};
    const batch = fee.batchId || {};

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 0, compress: false });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = 595;
        const pageHeight = 842;
        const margin = 40;
        const contentWidth = pageWidth - (2 * margin);
        
        // ===== COLOR SCHEME =====
        const primaryColor = '#193466'; // Dark Blue
        const secondaryColor = '#FFC50F'; // Yellow
        const textColor = '#2b2e45'; // Dark Text
        const lightText = '#7a7f96'; // Muted Text
        const borderColor = '#e2e8f0'; // Light Border
        const rowBgColor = '#f9fafb'; // Very Light Background

        // ===== WATERMARK IMAGE (Background) =====
        try {
            const watermarkPath = path.join(__dirname, '../../frontend/public/assets/watermark/watermark.png');
            if (fs.existsSync(watermarkPath)) {
                doc.opacity(0.08);
                doc.image(watermarkPath, (pageWidth - 200) / 2, (pageHeight - 200) / 2, { width: 200, height: 200 });
                doc.opacity(1.0); // Reset opacity
            }
        } catch (err) {
            console.warn('[fees.createFeeReceiptPdfBuffer] Watermark image not found or error loading:', err.message);
        }

        // ===== HEADER SECTION WITH LOGO =====
        // Background Rectangle
        doc.rect(0, 0, pageWidth, 120).fill(primaryColor);

        // Logo or Placeholder (left side)
        const logoX = margin;
        const logoY = 20;
        const logoSize = 60;
        
        try {
            let logoAdded = false;
            if (admin?.instituteLogo) {
                // Resolve path from project root
                const logoPath = path.resolve(process.cwd(), admin.instituteLogo);
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
                    logoAdded = true;
                }
            }
            
            
        } catch (err) {
            console.warn('[fees.createFeeReceiptPdfBuffer] Logo image error:', err.message);
            // Fallback: show placeholder
            doc.rect(logoX, logoY, logoSize, logoSize)
                .stroke(secondaryColor);
            doc.fillColor('#ffffff')
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('LOGO', logoX, logoY + 20, {
                    width: logoSize,
                    align: 'center',
                    height: logoSize,
                    valign: 'center'
                });
        }

        // Institute Name & Title (center)
        const titleX = logoX + logoSize + 30;
        const titleWidth = pageWidth - titleX - margin;
        
        doc.fillColor(secondaryColor)
            .fontSize(22)
            .font('Helvetica-Bold')
            .text(String(admin?.coachingName || 'ERP ACADEMY').toUpperCase(), titleX, 28, {
                width: titleWidth,
                align: 'left',
                lineGap: -5
            });

        doc.fillColor('#ffffff')
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Fee Payment Receipt', titleX, 60, {
                width: titleWidth,
                align: 'left'
            });

        // ===== YELLOW SEPARATOR LINE =====
        doc.strokeColor(secondaryColor)
            .lineWidth(3)
            .moveTo(margin, 120)
            .lineTo(pageWidth - margin, 120)
            .stroke();

        let currentY = 140;

        // ===== RECEIPT HEADER INFO (2 COLUMNS) =====
        const colWidth = (contentWidth - 20) / 2;
        const col1X = margin;
        const col2X = margin + colWidth + 20;

        // Left Column: Receipt Info
        doc.fillColor(primaryColor)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('RECEIPT INFORMATION', col1X, currentY);
        currentY += 18;

        const drawInfoRow = (label, value, x, y) => {
            doc.fillColor(lightText)
                .fontSize(9)
                .font('Helvetica')
                .text(`${label}:`, x, y);
            doc.fillColor(textColor)
                .fontSize(9)
                .font('Helvetica-Bold')
                .text(value, x + 100, y);
            return y + 16;
        };

        currentY = drawInfoRow('Receipt No', payment.receiptNo || 'N/A', col1X, currentY);
        currentY = drawInfoRow('Date', new Date(payment.date || Date.now()).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }), col1X, currentY);

        // Right Column: Student Info
        let col2Y = 140;
        doc.fillColor(primaryColor)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('STUDENT INFORMATION', col2X, col2Y);
        col2Y += 18;

        col2Y = drawInfoRow('Name', student.name || 'N/A', col2X, col2Y);
        col2Y = drawInfoRow('Roll No', student.rollNo || 'N/A', col2X, col2Y);
        col2Y = drawInfoRow('Batch', batch.name || 'N/A', col2X, col2Y);

        currentY = Math.max(currentY, col2Y) + 20;

        // ===== FEE DETAILS TABLE =====
        const tableX = margin;
        const col1Width = 280;
        const col2Width = contentWidth - col1Width;
        const rowHeight = 28;
        const headerBgColor = primaryColor;
        const headerTextColor = secondaryColor;

        // Table Header
        doc.rect(tableX, currentY, col1Width, rowHeight).fill(headerBgColor);
        doc.rect(tableX + col1Width, currentY, col2Width, rowHeight).fill(headerBgColor);

        doc.fillColor(headerTextColor)
            .fontSize(11)
            .font('Helvetica-Bold')
            .text('Fee Type', tableX + 12, currentY + 8, { width: col1Width - 24 });

        doc.text('Amount', tableX + col1Width + 12, currentY + 8, { width: col2Width - 24, align: 'right' });

        currentY += rowHeight;

        // Table Rows
        const feeRows = [
            { label: `Tuition Fee (${fee.month} ${fee.year})`, value: fee.monthlyTuitionFee || 0 },
            { label: 'Discount', value: fee.discount || 0, isBold: true, bgColor: '#e8f5e9' },
            { label: 'Late Fine', value: fee.fine || 0 },
            { label: 'Payment Received', value: payment.paidAmount || 0, isBold: true, bgColor: '#e0f2f1' },
            { label: 'Pending Balance', value: Math.max(Number(fee.totalFee || 0) - Number(fee.amountPaid || 0), 0), isBold: true, bgColor: '#fff3e0' }
        ];

        feeRows.forEach((row, idx) => {
            const bgColor = row.bgColor || (idx % 2 === 0 ? rowBgColor : '#ffffff');
            
            doc.rect(tableX, currentY, col1Width, rowHeight).fill(bgColor);
            doc.rect(tableX + col1Width, currentY, col2Width, rowHeight).fill(bgColor);

            doc.fillColor(textColor)
                .fontSize(10)
                .font(row.isBold ? 'Helvetica-Bold' : 'Helvetica')
                .text(row.label, tableX + 12, currentY + 8, { width: col1Width - 24 });

            doc.fillColor(row.isBold ? primaryColor : textColor)
                .font(row.isBold ? 'Helvetica-Bold' : 'Helvetica')
                .text(formatCurrency(row.value), tableX + col1Width + 12, currentY + 8, { width: col2Width - 24, align: 'right' });

            currentY += rowHeight;
        });

        // ===== SEPARATOR LINE =====
        currentY += 16;
        doc.strokeColor(borderColor)
            .lineWidth(1)
            .moveTo(tableX, currentY)
            .lineTo(pageWidth - margin, currentY)
            .stroke();

        // ===== FOOTER =====
        currentY += 20;
        doc.fillColor(lightText)
            .fontSize(8)
            .font('Helvetica')
            .text('This fee receipt has been generated by Defacto\'s ERP system.', margin, currentY, {
                width: contentWidth,
                align: 'center'
            });

        currentY += 16;
        doc.fillColor(primaryColor)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(`Authorized by: ${admin?.adminName || 'Administrator'}`, margin, currentY, {
                width: contentWidth,
                align: 'center'
            });

        currentY += 14;
        doc.fillColor(lightText)
            .fontSize(7)
            .font('Helvetica-Oblique')
            .text(`Generated on: ${new Date().toLocaleString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })}`, margin, currentY, {
                width: contentWidth,
                align: 'center'
            });

        doc.end();
    });
};

// GET /api/fees
exports.getFees = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const { search, status, batchId, course, month, year } = req.query;

        const query = {};
        if (status) query.status = status;
        if (batchId) query.batchId = batchId;
        if (month) query.month = month;
        if (year) query.year = String(year);

        // If course filter is provided, resolve batches for that course
        if (course) {
            const batches = await Batch.find({ course }).select('_id');
            const batchIds = batches.map(b => b._id);
            query.batchId = { $in: batchIds };
        }
        
        if (search) {
            const regex = new RegExp(search, 'i');
            const matchingStudents = await Student.find({
                $or: [{ name: regex }, { rollNo: regex }, { phone: regex }]
            }).select('_id');
            query.studentId = { $in: matchingStudents.map(s => s._id) };
        }

        const [total, fees] = await Promise.all([
            Fee.countDocuments(query),
            Fee.find(query)
                .populate('studentId', 'name rollNo profileImage className session address')
                .populate('batchId', 'name course')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        return res.json({
            success: true,
            total,
            pages: Math.ceil(total / limit) || 1,
            currentPage: page,
            fees
        });
    } catch (err) {
        console.error('Error fetching fees');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/fees/metrics
exports.getMetrics = async (req, res) => {
    try {
        const [aggOverall] = await Fee.aggregate([
            {
                $group: {
                    _id: null,
                    totalCollected: { $sum: '$amountPaid' },
                    totalPending: { $sum: '$pendingAmount' }
                }
            }
        ]);

        const [aggOverdue] = await Fee.aggregate([
            { $match: { status: 'overdue' } },
            { $group: { _id: null, overdueAmount: { $sum: '$pendingAmount' } } }
        ]);

        const pendingStudents = await Fee.distinct('studentId', {
            status: { $in: ['pending', 'partial', 'overdue'] }
        });

        return res.json({
            totalCollected: aggOverall ? aggOverall.totalCollected : 0,
            totalPending: aggOverall ? aggOverall.totalPending : 0,
            overdueAmount: aggOverdue ? aggOverdue.overdueAmount : 0,
            pendingStudents: pendingStudents.length
        });
    } catch (err) {
        console.error('Error fetching fee metrics');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees
exports.createFee = async (req, res) => {
    try {
        const { studentId, batchId, amount, month, year, dueDate } = req.body;

        if (!studentId || !amount || !month || !year || !dueDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existing = await Fee.findOne({ studentId, month, year });
        if (existing) {
            return res.status(409).json({ message: 'Fee already exists for this month', feeId: existing._id });
        }

        const student = await Student.findById(studentId).populate('batchId');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const resolvedBatchId = batchId || (student.batchId && student.batchId._id);

        const monthlyTuitionFee = Number(amount || 0);
        const registrationFee = Number(student.registrationFee || 0);
        const discount = Math.max(Number(student.discount || 0), 0);
        const fine = 0;
        const totalFee = Math.max(monthlyTuitionFee + registrationFee + fine - discount, 0);

        const fee = new Fee({
            studentId,
            batchId: resolvedBatchId,
            month,
            year,
            monthlyTuitionFee,
            registrationFee,
            discount,
            fine,
            totalFee,
            amountPaid: 0,
            pendingAmount: totalFee,
            status: 'pending',
            dueDate: new Date(dueDate)
        });

        await fee.save();

        triggerAutomaticNotification({
            eventType: 'feeGenerated',
            studentId: student._id,
            adminId: req.admin?.id || null,
            message: `New fee generated for ${month} ${year}. Due date: ${new Date(dueDate).toLocaleDateString('en-IN')}.`,
            data: {
                amount: totalFee,
                month,
                year,
                dueDate: new Date(dueDate).toLocaleDateString('en-IN')
            }
        }).catch(() => console.error('[fees.createFee.notification] Notification dispatch failed'));

        await invalidateFeeReadCaches();
        return res.status(201).json({ success: true, fee });
    } catch (err) {
        console.error('Error creating fee');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/create-multi-month
exports.createMultiMonthFee = async (req, res) => {
    try {
        const { studentId, batchId, months, year, dueDate, discount: rawDiscount } = req.body;

        if (!studentId || !months || !Array.isArray(months) || months.length === 0 || !year || !dueDate) {
            return res.status(400).json({ message: 'Missing required fields: studentId, months[], year, dueDate' });
        }

        const student = await Student.findById(studentId).populate('batchId');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const resolvedBatchId = batchId || (student.batchId && student.batchId._id);
        let monthlyFee = 0;

        if (resolvedBatchId) {
            const batch = await Batch.findById(resolvedBatchId).select('fees').lean();
            monthlyFee = Number(batch?.fees || 0);
        }

        if (monthlyFee <= 0) {
            monthlyFee = Number(student.fees || 0);
        }

        const totalDiscount = Math.max(Number(rawDiscount || 0), 0);
        const perMonthDiscount = months.length > 0 ? Math.round((totalDiscount / months.length) * 100) / 100 : 0;
        const registrationFee = Number(student.registrationFee || 0);

        // Check for existing fee records
        const existingFees = await Fee.find({
            studentId,
            month: { $in: months },
            year: String(year)
        }).select('month').lean();
        const existingMonthSet = new Set(existingFees.map(f => f.month));

        const normalizedDueDate = new Date(dueDate);
        const feesToCreate = [];
        const skippedMonths = [];

        for (const month of months) {
            if (existingMonthSet.has(month)) {
                skippedMonths.push(month);
                continue;
            }

            const isFirstMonth = feesToCreate.length === 0;
            const regFee = isFirstMonth ? registrationFee : 0;
            const totalFee = Math.max(monthlyFee + regFee - perMonthDiscount, 0);

            feesToCreate.push({
                studentId,
                batchId: resolvedBatchId || null,
                month,
                year: String(year),
                paymentType: 'yearly',
                monthlyTuitionFee: monthlyFee,
                registrationFee: regFee,
                discount: perMonthDiscount,
                fine: 0,
                totalFee,
                amountPaid: 0,
                pendingAmount: totalFee,
                status: 'pending',
                dueDate: normalizedDueDate
            });
        }

        let createdCount = 0;
        if (feesToCreate.length > 0) {
            await Fee.insertMany(feesToCreate, { ordered: false });
            createdCount = feesToCreate.length;

            // Trigger notifications for each
            const dueDateLabel = normalizedDueDate.toLocaleDateString('en-IN');
            feesToCreate.forEach(feeData => {
                triggerAutomaticNotification({
                    eventType: 'feeGenerated',
                    studentId: student._id,
                    adminId: req.admin?.id || null,
                    message: `New fee generated for ${feeData.month} ${year}. Due date: ${dueDateLabel}.`,
                    data: {
                        amount: feeData.totalFee,
                        month: feeData.month,
                        year,
                        dueDate: dueDateLabel
                    }
                }).catch(() => console.error('[fees.createMultiMonthFee.notification] Notification dispatch failed'));
            });
        }

        const subtotal = monthlyFee * months.length;
        const grandTotal = feesToCreate.reduce((sum, f) => sum + f.totalFee, 0);

        await invalidateFeeReadCaches();
        return res.status(201).json({
            success: true,
            created: createdCount,
            skipped: skippedMonths,
            summary: {
                monthlyFee,
                selectedMonths: months.length,
                subtotal,
                discount: totalDiscount,
                registrationFee,
                grandTotal
            }
        });
    } catch (err) {
        console.error('Error creating multi-month fees');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/fees/:id  — Edit a monthly fee record
exports.updateFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { monthlyTuitionFee, discount, dueDate, month, year, fine } = req.body;

        const fee = await Fee.findById(id);
        if (!fee) return res.status(404).json({ message: 'Fee record not found' });

        if (fee.paymentType === 'yearly') {
            return res.status(400).json({ message: 'Cannot edit yearly fee records individually. Use the yearly view instead.' });
        }

        if (monthlyTuitionFee !== undefined) fee.monthlyTuitionFee = Number(monthlyTuitionFee);
        if (discount !== undefined) fee.discount = Math.max(Number(discount), 0);
        if (fine !== undefined) fee.fine = Math.max(Number(fine), 0);
        if (dueDate) fee.dueDate = new Date(dueDate);
        if (month) fee.month = month;
        if (year) fee.year = String(year);

        // Recalculate totals
        fee.totalFee = Math.max((fee.monthlyTuitionFee || 0) + (fee.registrationFee || 0) + (fee.fine || 0) - (fee.discount || 0), 0);
        fee.pendingAmount = Math.max(fee.totalFee - (fee.amountPaid || 0), 0);

        if (fee.pendingAmount <= 0 && fee.totalFee > 0) {
            fee.status = 'paid';
        } else if (fee.amountPaid > 0) {
            fee.status = 'partial';
        } else {
            fee.status = 'pending';
        }

        await fee.save();
        await invalidateFeeReadCaches();

        return res.json({ success: true, fee });
    } catch (err) {
        console.error('Error updating fee');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/:id/pay
exports.recordPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amountPaid, mode, fine, date, discount } = req.body;

        // Validate payment method
        const allowedModes = ['UPI', 'Cash'];
        const paymentMode = allowedModes.includes(mode) ? mode : 'Cash';

        const fee = await Fee.findById(id);
        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        const paid = Number(amountPaid || 0);
        const fineAmount = Number(fine || 0);
        const discAmount = Number(discount || 0);

        if (paid < 0 || fineAmount < 0 || discAmount < 0) {
            return res.status(400).json({ message: 'Payment, fine, and discount amounts cannot be negative' });
        }

        if (paid <= 0 && fineAmount <= 0 && discAmount <= 0) {
            return res.status(400).json({ message: 'Payment or discount amount must be greater than zero' });
        }

        const updatedTotalFee = Math.max(Number(fee.totalFee || 0) + fineAmount - discAmount, 0);
        const remainingBeforePayment = Math.max(updatedTotalFee - Number(fee.amountPaid || 0), 0);

        if (paid > remainingBeforePayment) {
            return res.status(400).json({
                message: `Payment amount cannot exceed remaining balance of Rs ${formatCurrency(remainingBeforePayment)}`
            });
        }

        if (fineAmount > 0) {
            fee.fine = Number(fee.fine || 0) + fineAmount;
            fee.totalFee = Number(fee.totalFee || 0) + fineAmount;
        }

        if (discAmount > 0) {
            fee.discount = Number(fee.discount || 0) + discAmount;
            fee.totalFee = Math.max(Number(fee.totalFee || 0) - discAmount, 0);
        }

        fee.amountPaid = Number(fee.amountPaid || 0) + paid;
        recalcStatus(fee);

        const receiptNo = `RCPT-${Date.now()}-${(fee.paymentHistory.length + 1).toString().padStart(3, '0')}`;

        fee.paymentHistory.push({
            paidAmount: paid,
            paymentMethod: paymentMode,
            remarks: '',
            receiptNo,
            date: date ? new Date(date) : new Date()
        });

        await fee.save();
        await Promise.all([
            fee.populate('batchId', 'name course'),
            fee.populate('studentId', 'name rollNo email')
        ]);

        const latestPayment = fee.paymentHistory[fee.paymentHistory.length - 1] || null;

        if (latestPayment) {
            const recipientEmail = fee.studentId?.email || '';
            if (recipientEmail) {
                try {
                    const admin = await Admin.findById(req.admin?.id).lean() || await Admin.findOne().lean();
                    const receiptBuffer = await createFeeReceiptPdfBuffer({
                        fee,
                        payment: latestPayment,
                        admin
                    });
                    const { subjectEmail, bodyEmail } = await resolveNotificationTemplate({
                        eventType: 'feePayment',
                        recipient: {
                            name: fee.studentId?.name,
                            email: recipientEmail,
                            rollNo: fee.studentId?.rollNo || ''
                        },
                        recipientType: 'student',
                        admin,
                        fallbackMessage: `We have successfully received your payment of ${formatCurrency(latestPayment.paidAmount)}. Your receipt ${latestPayment.receiptNo} is attached with this email.`,
                        fallbackSubjectEmail: `Fee Payment Received - Receipt ${latestPayment.receiptNo}`,
                        data: {
                            amountPaid: latestPayment.paidAmount,
                            receiptNo: latestPayment.receiptNo
                        }
                    });

                    await sendEmail({
                        student: {
                            name: fee.studentId?.name,
                            email: recipientEmail
                        },
                        admin,
                        subjectOverride: subjectEmail,
                        message: bodyEmail,
                        messageType: 'success',
                        eventType: 'feePayment',
                        recipientRole: 'student',
                        attachments: [{
                            filename: `Receipt_${latestPayment.receiptNo}.pdf`,
                            content: receiptBuffer,
                            contentType: 'application/pdf'
                        }]
                    });
                } catch (emailError) {
                    console.error('[fees.recordPayment.email] Failed to send receipt email', emailError?.message || emailError);
                }
            }

            // Trigger Push Notification
            triggerAutomaticNotification({
                eventType: 'feePayment',
                studentId: fee.studentId._id,
                adminId: req.admin?.id || null,
                message: `We have successfully received your payment of Rs ${formatCurrency(latestPayment.paidAmount)}. Receipt No: ${latestPayment.receiptNo}`,
                data: {
                    amountPaid: latestPayment.paidAmount,
                    receiptNo: latestPayment.receiptNo
                }
            }).catch(() => console.error('[fees.recordPayment.notification] Push notification dispatch failed'));
        }

        await invalidateFeeReadCaches();
        return res.json({ success: true, receiptNo, fee });
    } catch (err) {
        console.error('Error recording payment');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/generate
exports.generateFeesBulk = async (req, res) => {
    try {
        const { month, year, dueDate } = req.body;
        if (!month || !year || !dueDate) {
            return res.status(400).json({ message: 'Month, year and due date are required' });
        }

        const students = await Student.find({ status: 'active' })
            .select('_id batchId fees registrationFee discount paymentMode')
            .lean();
        if (!students.length) {
            return res.json({ success: true, created: 0 });
        }

        const batchIds = Array.from(new Set(
            students
                .map((student) => String(student.batchId || '').trim())
                .filter(Boolean)
        ));

        const [batches, existingFees] = await Promise.all([
            batchIds.length > 0
                ? Batch.find({ _id: { $in: batchIds } }).select('_id fees').lean()
                : [],
            Fee.find({
                month,
                year,
                studentId: { $in: students.map((student) => student._id) }
            })
                .select('studentId')
                .lean()
        ]);

        const batchFeeMap = new Map(
            batches.map((batch) => [String(batch._id), Number(batch.fees || 0)])
        );
        const existingFeeStudentIds = new Set(
            existingFees.map((fee) => String(fee.studentId))
        );

        const normalizedDueDate = new Date(dueDate);
        const dueDateLabel = normalizedDueDate.toLocaleDateString('en-IN');
        const feesToCreate = [];
        const generatedFeeNotificationTargets = [];
        let skippedYearly = 0;
        for (const student of students) {
            if (existingFeeStudentIds.has(String(student._id))) continue;

            // Skip students on full/yearly payment mode — their fees are managed via multi-month flow
            if (student.paymentMode === 'full') {
                skippedYearly++;
                continue;
            }

            const baseFee = batchFeeMap.get(String(student.batchId || '')) ?? Number(student.fees || 0);
            const registrationFee = Number(student.registrationFee || 0);
            const discount = Math.max(Number(student.discount || 0), 0);
            const totalFee = Math.max(Number(baseFee) + registrationFee - discount, 0);

            feesToCreate.push({
                studentId: student._id,
                batchId: student.batchId || null,
                month,
                year,
                monthlyTuitionFee: Number(baseFee),
                registrationFee,
                discount,
                fine: 0,
                totalFee,
                amountPaid: 0,
                pendingAmount: totalFee,
                status: 'pending',
                dueDate: normalizedDueDate
            });
            generatedFeeNotificationTargets.push({
                studentId: student._id,
                amount: totalFee,
                month,
                year,
                dueDate: dueDateLabel
            });
        }

        if (feesToCreate.length) {
            await Fee.insertMany(feesToCreate, { ordered: false });

            generatedFeeNotificationTargets.forEach((target) => {
                triggerAutomaticNotification({
                    eventType: 'feeGenerated',
                    studentId: target.studentId,
                    adminId: req.admin?.id || null,
                    message: `New fee generated for ${target.month} ${target.year}. Due date: ${target.dueDate}.`,
                    data: {
                        amount: target.amount,
                        month: target.month,
                        year: target.year,
                        dueDate: target.dueDate
                    }
                }).catch(() => console.error('[fees.generateFeesBulk.notification] Notification dispatch failed'));
            });
        }

        if (feesToCreate.length > 0) {
            await invalidateFeeReadCaches();
        }
        return res.json({ success: true, created: feesToCreate.length, skippedYearly });
    } catch (err) {
        console.error('Error generating bulk fees');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/remind-overdue
exports.remindOverdue = async (req, res) => {
    try {
        const now = new Date();

        const overdueFees = await Fee.find({
            pendingAmount: { $gt: 0 },
            dueDate: { $lt: now },
            status: { $in: ['pending', 'partial', 'overdue'] }
        }).select('_id studentId month year pendingAmount dueDate status').lean();

        if (!overdueFees.length) {
            return res.json({ success: true, overdueCount: 0, notified: 0, message: 'No overdue fees found.' });
        }

        const overdueIds = overdueFees.map((fee) => fee._id);
        await Fee.updateMany(
            { _id: { $in: overdueIds }, status: { $in: ['pending', 'partial'] } },
            { $set: { status: 'overdue' } }
        );

        overdueFees.forEach((fee) => {
            triggerAutomaticNotification({
                eventType: 'feeOverdue',
                studentId: fee.studentId,
                adminId: req.admin?.id || null,
                message: `Fee overdue alert for ${fee.month} ${fee.year}. Pending amount: Rs ${fee.pendingAmount}.`,
                data: {
                    pendingAmount: fee.pendingAmount,
                    month: fee.month,
                    year: fee.year,
                    dueDate: fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '',
                    deadline: now.toLocaleDateString('en-IN')
                }
            }).catch(() => console.error('[fees.remindOverdue.notification] Notification dispatch failed'));
        });

        await invalidateFeeReadCaches();
        return res.json({
            success: true,
            overdueCount: overdueFees.length,
            notified: overdueFees.length,
            message: `Overdue reminders triggered for ${overdueFees.length} fee records.`
        });
    } catch (err) {
        console.error('Error sending overdue reminders');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/fees/:id
exports.deleteFee = async (req, res) => {
    try {
        const { id } = req.params;
        const fee = await Fee.findByIdAndDelete(id);
        if (!fee) return res.status(404).json({ message: 'Fee record not found' });
        await invalidateFeeReadCaches();
        res.json({ success: true, message: 'Fee record deleted successfully' });
    } catch (err) {
        console.error('[fees.deleteFee] Error deleting fee record');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};
