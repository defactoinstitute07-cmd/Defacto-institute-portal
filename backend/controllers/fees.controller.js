const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Admin = require('../models/Admin');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
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

        const { status, batchId, course, month, year } = req.query;

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

        const total = await Fee.countDocuments(query);
        const fees = await Fee.find(query)
            .populate('studentId', 'name rollNo profileImage className session address')
            .populate('batchId', 'name course')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

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

        return res.status(201).json({ success: true, fee });
    } catch (err) {
        console.error('Error creating fee');
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/:id/pay
exports.recordPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amountPaid, mode, fine } = req.body;

        // Validate payment method
        const allowedModes = ['UPI', 'Cash'];
        const paymentMode = allowedModes.includes(mode) ? mode : 'Cash';

        const fee = await Fee.findById(id);
        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        const paid = Number(amountPaid || 0);
        const fineAmount = Number(fine || 0);
        if (paid <= 0 && fineAmount <= 0) {
            return res.status(400).json({ message: 'Payment amount must be greater than zero' });
        }

        if (fineAmount > 0) {
            fee.fine = Number(fee.fine || 0) + fineAmount;
            fee.totalFee = Number(fee.totalFee || 0) + fineAmount;
        }

        fee.amountPaid = Number(fee.amountPaid || 0) + paid;
        recalcStatus(fee);

        const receiptNo = `RCPT-${Date.now()}-${(fee.paymentHistory.length + 1).toString().padStart(3, '0')}`;

        fee.paymentHistory.push({
            paidAmount: paid,
            paymentMethod: paymentMode,
            remarks: '',
            receiptNo,
            date: new Date()
        });

        await fee.save();
        await fee.populate('batchId', 'name course');
        await fee.populate('studentId', 'name rollNo email');

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
        }

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

        const students = await Student.find({ status: 'active' }).populate('batchId');
        if (!students.length) {
            return res.json({ success: true, created: 0 });
        }

        const feesToCreate = [];
        const generatedFeeNotificationTargets = [];
        for (const student of students) {
            const exists = await Fee.findOne({ studentId: student._id, month, year });
            if (exists) continue;

            const baseFee = student.batchId?.fees || student.fees || 0;
            const registrationFee = Number(student.registrationFee || 0);
            const discount = Math.max(Number(student.discount || 0), 0);
            const totalFee = Math.max(Number(baseFee) + registrationFee - discount, 0);

            const fee = new Fee({
                studentId: student._id,
                batchId: student.batchId?._id,
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
                dueDate: new Date(dueDate)
            });
            feesToCreate.push(fee);
            generatedFeeNotificationTargets.push({
                studentId: student._id,
                amount: totalFee,
                month,
                year,
                dueDate: new Date(dueDate).toLocaleDateString('en-IN')
            });
        }

        if (feesToCreate.length) {
            await Fee.insertMany(feesToCreate);

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

        return res.json({ success: true, created: feesToCreate.length });
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
