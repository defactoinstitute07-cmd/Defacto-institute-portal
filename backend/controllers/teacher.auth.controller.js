const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logNotificationEvent } = require('../services/activityLogService');
const { JWT_SECRET } = require('../middleware/auth.middleware');

exports.login = async (req, res) => {
    try {
        const { regNo, password } = req.body;
        if (!regNo || !password) {
            return res.status(400).json({ message: 'Employee ID and password are required' });
        }

        const teacher = await Teacher.findOne({ regNo: regNo.trim() });
        if (!teacher || !teacher.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, teacher.password);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: teacher._id, role: 'teacher' }, JWT_SECRET, { expiresIn: '2h' });
        const profile = teacher.toObject();
        delete profile.password;

        logNotificationEvent({
            recipientEmail: teacher.email,
            recipientName: teacher.name,
            subject: 'Faculty Portal Login Alert',
            type: 'teacher_login',
            data: { time: new Date().toLocaleString() }
        }).catch(() => console.error('Teacher Login Event Log Error'));

        res.json({ message: 'Login successful', token, teacher: profile });
    } catch (err) {
        console.error('[teacher.login] Login failed');
        res.status(500).json({ message: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.userId).select('-password');
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        res.json({ teacher });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updatePhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !phone.trim()) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const teacher = await Teacher.findByIdAndUpdate(
            req.userId,
            { phone: phone.trim() },
            { returnDocument: 'after' }
        ).select('-password');

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        res.json({ message: 'Phone updated successfully', phone: teacher.phone, teacher });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

