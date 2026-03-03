const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

module.exports = async (req, res, next) => {
    const { adminPassword } = req.body;
    if (!adminPassword)
        return res.status(400).json({ message: 'Admin password is required for this action' });
    try {
        const admin = await Admin.findOne();
        if (!admin) return res.status(404).json({ message: 'Admin account not found' });

        const valid = await bcrypt.compare(adminPassword, admin.password);
        if (!valid) return res.status(401).json({ message: 'Incorrect admin password' });

        next();
    } catch (err) {
        res.status(500).json({ message: 'Password verification failed', error: err.message });
    }
};
