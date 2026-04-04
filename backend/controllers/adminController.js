const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Batch = require('../models/Batch');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const emailService = require('../services/emailService');
const connectDB = require('../config/db');

// Check if admin exists
exports.checkAdmin = async (req, res) => {
    try {
        const adminCount = await Admin.countDocuments();
        res.status(200).json({ exists: adminCount > 0 });
    } catch (error) {
        console.error('[CheckAdminError] Unable to check admin status');
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

        if (!adminName || !coachingName || !password) {
            return res.status(400).json({ message: 'adminName, coachingName and password are required.' });
        }
        
        // Ensure DB is ready. On serverless cold starts the first request can arrive before connectDB() finishes.
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            try {
                await connectDB(5, 1500);
            } catch (dbErr) {
                console.error('[SignupError] MongoDB reconnect attempt failed');
                return res.status(503).json({ message: 'Database unavailable. Please try again in a few seconds.' });
            }
        }

        if (mongoose.connection.readyState !== 1) {
            console.error('[SignupError] MongoDB not connected after retry');
            return res.status(503).json({ message: 'Database connecting, please try again in a few seconds.', status: mongoose.connection.readyState });
        }

        const adminExists = await Admin.countDocuments() > 0;
        if (adminExists) {
            return res.status(400).json({ message: 'Admin already exists. Please login.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let instituteLogo = '';
        if (req.file) {
            instituteLogo = req.file.path || '';
        }

        let parsedClasses = [];
        if (classesOffered) {
            try {
                const parsed = JSON.parse(classesOffered);
                parsedClasses = Array.isArray(parsed) ? parsed : [];
            } catch (parseErr) {
                return res.status(400).json({ message: 'classesOffered must be a valid JSON array.' });
            }
        }

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
        console.error('[SignupError] Failed to create admin account');

        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyValue || {})[0] || 'field';
            return res.status(400).json({ message: `Duplicate value for ${duplicateField}.` });
        }

        if (error.name === 'ValidationError') {
            const details = Object.values(error.errors || {}).map((e) => e.message).join(', ');
            return res.status(400).json({ message: details || 'Validation failed.' });
        }

        if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
            return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
        }

        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login Logic
exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        const admin = await Admin.findOne({
            $or: [{ adminName: identifier }, { email: identifier }]
        });

        if (!admin) {
            console.warn('[Login] Admin not found');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.warn('[Login] Password mismatch');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin._id, role: 'admin' },
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
        console.error('[LoginError] Authentication failed');
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
            instituteAddress, instituteEmail, institutePhone
        } = req.body;

        const valid = await bcrypt.compare(adminPassword, admin.password);
        if (!valid) return res.status(401).json({ message: 'Incorrect password' });

        let parsedClasses = admin.classesOffered;
        try { if (classesOffered) parsedClasses = JSON.parse(classesOffered); } catch (e) { }

        if (adminName) admin.adminName = adminName;
        if (coachingName) admin.coachingName = coachingName;
        if (email !== undefined) admin.email = email;
        if (phone !== undefined) admin.phone = phone;
        if (bio !== undefined) admin.bio = bio;
        if (roomsAvailable) admin.roomsAvailable = roomsAvailable;
        if (registrationNumber !== undefined) admin.registrationNumber = registrationNumber || undefined;
        admin.classesOffered = parsedClasses;

        if (instituteAddress !== undefined) admin.instituteAddress = instituteAddress;
        if (instituteEmail !== undefined) admin.instituteEmail = instituteEmail;
        if (institutePhone !== undefined) admin.institutePhone = institutePhone;

        if (req.file) {
            admin.instituteLogo = req.file.path;
        }

        await admin.save();

        const updatedAdmin = admin.toObject();
        delete updatedAdmin.password;

        res.json({ message: 'Profile updated successfully', admin: updatedAdmin });
    } catch (err) {
        res.status(500).json({
            message: err.message || 'An unexpected error occurred',
            error: process.env.NODE_ENV === 'production' ? err.message : err.message, // Explicitly show message
            stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
        });
    }
};

// Update Settings
exports.updateSettings = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password');
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const { notificationsEnabled, emailEvents, pushEvents, receiptSettings } = req.body;

        if (notificationsEnabled !== undefined) admin.notificationsEnabled = notificationsEnabled;
        if (emailEvents !== undefined) {
            admin.emailEvents = { ...admin.emailEvents, ...emailEvents };
        }
        if (pushEvents !== undefined) {
            admin.pushEvents = { ...admin.pushEvents, ...pushEvents };
        }
        if (receiptSettings !== undefined) {
            admin.receiptSettings = { ...admin.receiptSettings, ...receiptSettings };
        }

        await admin.save();

        res.json({ message: 'Settings updated successfully', admin });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getDatabaseStorageStats = async (_req, res) => {
    try {
        const stats = await mongoose.connection.db.stats();
        const atlasLimitMB = Math.max(Number(process.env.MONGODB_ATLAS_LIMIT_MB) || 512, 1);
        const toMB = (value) => Number(((Number(value) || 0) / (1024 * 1024)).toFixed(2));
        const dataSizeMB = toMB(stats.dataSize);
        const storageSizeMB = toMB(stats.storageSize);
        const indexSizeMB = toMB(stats.indexSize);
        const usagePercentage = Number(Math.min((storageSizeMB / atlasLimitMB) * 100, 100).toFixed(2));

        return res.json({
            dbName: stats.db,
            collections: Number(stats.collections) || 0,
            objects: Number(stats.objects) || 0,
            dataSizeMB,
            storageSizeMB,
            indexSizeMB,
            atlasLimitMB,
            usagePercentage
        });
    } catch (error) {
        console.error('[DBStorageStatsError] Failed to fetch MongoDB Atlas stats');
        return res.status(500).json({
            message: 'Failed to fetch database storage stats.',
            error: error.message
        });
    }
};

// Execute Database Wipe
exports.wipeDatabase = async (req, res) => {
    try {
        const password = String(req.body.password || '').trim();

        const admin = await Admin.findById(req.admin.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found.' });

        // Verify Password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid admin password.' });

        // Delete all data EXCEPT Admin
        await Promise.all([
            Student.deleteMany({}),
            Teacher.deleteMany({}),
            Batch.deleteMany({}),
            AuditLog.deleteMany({})
        ]);

        // Clear OTP fields anyway for clean state
        admin.wipeOtp = null;
        admin.wipeOtpExpiry = null;
        await admin.save();

        res.json({ message: 'Database wiped successfully. All student, teacher, batch, and audit records have been deleted.' });
    } catch (err) {
        console.error('[WipeDatabase Error] Failed to wipe database');
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
