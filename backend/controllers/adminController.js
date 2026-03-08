const Admin = require('../models/Admin');
const EmailTemplate = require('../models/EmailTemplate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth.middleware');

// Check if admin exists
exports.checkAdmin = async (req, res) => {
    try {
        const adminCount = await Admin.countDocuments();
        res.status(200).json({ exists: adminCount > 0 });
    } catch (error) {
        console.error('[CheckAdminError]', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Signup Logic
exports.signup = async (req, res) => {
    try {
        const {
            adminName, coachingName, email, password, roomsAvailable,
            registrationNumber, classesOffered, phone, bio,
            instituteAddress, instituteEmail, institutePhone
        } = req.body;

        // 1. Check if admin already exists
        const adminExists = await Admin.countDocuments() > 0;
        if (adminExists) {
            return res.status(400).json({ message: 'Admin already exists. Please login.' });
        }

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let instituteLogo = '';
        if (req.file) {
            instituteLogo = req.file.path;
        }

        // Parse stringified arrays if sent from FormData
        let parsedClasses = [];
        try { if (classesOffered) parsedClasses = JSON.parse(classesOffered); } catch (e) { }

        // 3. Create Admin
        const admin = new Admin({
            adminName,
            coachingName,
            email,
            phone: phone || '',
            bio: bio || '',
            password: hashedPassword,
            roomsAvailable: Number(roomsAvailable) || 0,
            registrationNumber: registrationNumber || undefined,
            classesOffered: parsedClasses,
            instituteLogo,
            instituteAddress: instituteAddress || '',
            instituteEmail: instituteEmail || '',
            institutePhone: institutePhone || ''
        });

        await admin.save();
        res.status(201).json({ message: 'Admin account created successfully' });
    } catch (error) {
        console.error('[SignupError]', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login Logic
exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        // 1. Find admin by name or email
        console.log('[Login] Attempt for identifier:', identifier);
        const admin = await Admin.findOne({
            $or: [{ adminName: identifier }, { email: identifier }]
        });

        if (!admin) {
            console.warn('[Login] Admin not found for:', identifier);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.warn('[Login] Password mismatch for:', identifier);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        console.log('[Login] Success for:', identifier);

        // 3. Generate JWT
        const token = jwt.sign(
            { id: admin._id },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.status(200).json({
            token,
            admin: {
                adminName: admin.adminName,
                coachingName: admin.coachingName,
                email: admin.email,
                instituteLogo: admin.instituteLogo
            }
        });
    } catch (error) {
        console.error('[LoginError]', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get Admin Profile
exports.getProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password');
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        res.json(admin);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update Admin Profile
exports.updateProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const {
            adminName, coachingName, email, phone, bio, adminPassword,
            roomsAvailable, registrationNumber, classesOffered,
            instituteAddress, instituteEmail, institutePhone, emailNotificationsEnabled
        } = req.body;

        // Verify password for sensitive changes
        const valid = await bcrypt.compare(adminPassword, admin.password);
        if (!valid) return res.status(401).json({ message: 'Incorrect password' });

        // Parse classes
        let parsedClasses = admin.classesOffered;
        try { if (classesOffered) parsedClasses = JSON.parse(classesOffered); } catch (e) { }

        // Update fields
        if (adminName) admin.adminName = adminName;
        if (coachingName) admin.coachingName = coachingName;
        if (email !== undefined) admin.email = email;
        if (phone !== undefined) admin.phone = phone;
        if (bio !== undefined) admin.bio = bio;
        if (roomsAvailable) admin.roomsAvailable = roomsAvailable;
        if (registrationNumber !== undefined) admin.registrationNumber = registrationNumber || undefined;
        admin.classesOffered = parsedClasses;

        // New Institute Fields
        if (instituteAddress !== undefined) admin.instituteAddress = instituteAddress;
        if (instituteEmail !== undefined) admin.instituteEmail = instituteEmail;
        if (institutePhone !== undefined) admin.institutePhone = institutePhone;

        // Settings Toggle
        if (emailNotificationsEnabled !== undefined) {
            admin.emailNotificationsEnabled = emailNotificationsEnabled === 'true' || emailNotificationsEnabled === true;
        }

        // Update Logo if provided
        if (req.file) {
            admin.instituteLogo = req.file.path;
        }

        await admin.save();

        // Return updated safe object
        const updatedAdmin = admin.toObject();
        delete updatedAdmin.password;

        res.json({ message: 'Profile updated successfully', admin: updatedAdmin });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update Settings
exports.updateSettings = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const { emailNotificationsEnabled } = req.body;

        if (emailNotificationsEnabled !== undefined) {
            admin.emailNotificationsEnabled = emailNotificationsEnabled === 'true' || emailNotificationsEnabled === true;
        }

        await admin.save();

        const updatedAdmin = admin.toObject();
        delete updatedAdmin.password;

        res.json({ message: 'Settings updated successfully', admin: updatedAdmin });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get Database Stats
exports.getDatabaseStats = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const stats = await mongoose.connection.db.stats();

        // MongoDB Atlas Free Tier (M0) is 512MB
        const atlasLimitMB = 512;
        const storageSizeMB = (stats.storageSize / (1024 * 1024)).toFixed(2);
        const dataSizeMB = (stats.dataSize / (1024 * 1024)).toFixed(2);
        const usagePercentage = ((storageSizeMB / atlasLimitMB) * 100).toFixed(2);

        res.json({
            dbName: stats.db,
            collections: stats.collections,
            objects: stats.objects,
            dataSizeMB,
            storageSizeMB,
            limitMB: atlasLimitMB,
            usagePercentage: Math.min(usagePercentage, Number(usagePercentage)) > 100 ? 100 : usagePercentage
        });
    } catch (error) {
        console.error('[DBStatsError]', error);
        res.status(500).json({ message: 'Failed to fetch database stats', error: error.message });
    }
};

// --- Email Template Controllers ---

// Get all templates
exports.getAllEmailTemplates = async (req, res) => {
    try {
        let templates = await EmailTemplate.find();

        // If no templates exist, seed default ones
        if (templates.length === 0) {
            const defaults = [
                { event: 'student_registration', displayName: 'Student Registration', subject: 'Welcome to DeFacto Institute', body: '<p>Hello {{recipientName}}, welcome!</p><p>Your Roll No: {{data.rollNo}}</p><p>Password: {{data.password}}</p>', variables: ['recipientName', 'data.rollNo', 'data.password'] },
                { event: 'student_login', displayName: 'Student Login Alert', subject: 'Security Alert: New Login', body: '<p>Hi {{recipientName}}, a new login was detected on your account at {{data.time}}.</p>', variables: ['recipientName', 'data.time', 'data.ip'] },
                { event: 'exam_result_published', displayName: 'Test Result Published', subject: 'Your Exam Results are Out!', body: '<p>Hi {{recipientName}}, your results for {{data.examName}} are available.</p><p>Marks: {{data.marksObtained}} / {{data.totalMarks}}</p>', variables: ['recipientName', 'data.examName', 'data.marksObtained', 'data.totalMarks'] },
                { event: 'test_scheduled', displayName: 'New Test Scheduled', subject: 'New Test Scheduled: {{data.examName}}', body: '<p>Hi {{recipientName}}, a new test has been scheduled.</p><p>Subject: {{data.subject}}</p><p>Date: {{data.date}}</p>', variables: ['recipientName', 'data.examName', 'data.subject', 'data.date'] },
                { event: 'fee_generated', displayName: 'Fee Invoice Generated', subject: 'Fee Invoice Generated', body: '<p>Hello {{recipientName}}, your fee for {{data.month}} {{data.year}} has been generated.</p><p>Amount: ₹{{data.amount}}</p>', variables: ['recipientName', 'data.month', 'data.year', 'data.amount'] },
                { event: 'fee_paid', displayName: 'Fee Payment Confirmation', subject: 'Payment Confirmation', body: '<p>Hi {{recipientName}}, we received your payment of ₹{{data.amountPaid}}.</p><p>Receipt: {{data.receiptNo}}</p>', variables: ['recipientName', 'data.amountPaid', 'data.receiptNo'] },
                { event: 'teacher_registration', displayName: 'Teacher Registration', subject: 'Welcome to Faculty', body: '<p>Welcome {{recipientName}}! Your faculty account is ready.</p><p>Reg No: {{data.regNo}}</p>', variables: ['recipientName', 'data.regNo'] },
                { event: 'teacher_login', displayName: 'Teacher Login Alert', subject: 'Faculty Portal Login', body: '<p>Faculty login alert for {{recipientName}} at {{data.time}}.</p>', variables: ['recipientName', 'data.time'] },
                { event: 'teacher_salary_paid', displayName: 'Teacher Salary Paid', subject: 'Salary Credited', body: '<p>Hi {{recipientName}}, your salary for {{data.monthYear}} has been processed.</p><p>Amount: ₹{{data.amountPaid}}</p>', variables: ['recipientName', 'data.amountPaid', 'data.monthYear'] },
                { event: 'password_reset', displayName: 'Password Reset', subject: 'Password Reset Request', body: '<p>Hi {{recipientName}}, use the link below to reset your password.</p><p>{{data.resetUrl}}</p>', variables: ['recipientName', 'data.resetUrl', 'data.token'] }
            ];
            await EmailTemplate.insertMany(defaults);
            templates = await EmailTemplate.find();
        }

        res.json(templates);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching templates', error: err.message });
    }
};

// Update a template
exports.updateEmailTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled, subject, body } = req.body;

        const template = await EmailTemplate.findByIdAndUpdate(
            id,
            { enabled, subject, body },
            { new: true }
        );

        if (!template) return res.status(404).json({ message: 'Template not found' });
        res.json({ message: 'Template updated', template });
    } catch (err) {
        res.status(500).json({ message: 'Error updating template', error: err.message });
    }
};
