const TechnicalSupport = require('../models/TechnicalSupport');

// Create new technical support user
exports.createSupportUser = async (req, res) => {
    try {
        console.log('Creating support user:', req.body);
        const { name, employeeId, email, phone, password, role } = req.body;

        if (!name || !employeeId || !email || !password) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        const existingUser = await TechnicalSupport.findOne({ $or: [{ email }, { employeeId }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or Employee ID already exists' });
        }

        const newUser = new TechnicalSupport({
            name,
            employeeId,
            email,
            phone,
            password,
            role
        });

        await newUser.save();
        res.status(201).json({ message: 'Technical Support user created successfully', user: newUser });
    } catch (error) {
        console.error('Create Support User Error:', error);
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

// Get all technical support users
exports.getAllSupportUsers = async (req, res) => {
    try {
        console.log('Fetching all support users...');
        const users = await TechnicalSupport.find({}).select('-password').sort({ createdAt: -1 });
        console.log(`Found ${users.length} users.`);
        res.status(200).json(users);
    } catch (error) {
        console.error('Get Support Users Error:', error);
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

// Update support user status
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const user = await TechnicalSupport.findByIdAndUpdate(id, { status }, { new: true });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User status updated', user });
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
};

// Delete support user
exports.deleteSupportUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await TechnicalSupport.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};
