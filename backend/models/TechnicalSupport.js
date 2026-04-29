const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const technicalSupportSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'], 
        trim: true 
    },
    employeeId: { 
        type: String, 
        required: [true, 'Employee ID is required'], 
        unique: true,
        trim: true 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true,
        trim: true, 
        lowercase: true 
    },
    phone: { 
        type: String, 
        required: [true, 'Phone number is required'],
        trim: true 
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'] 
    },
    role: { 
        type: String, 
        enum: ['Technical Support', 'Senior Support', 'Admin Support'], 
        default: 'Technical Support' 
    },
    status: { 
        type: String, 
        enum: ['active', 'inactive'], 
        default: 'active' 
    },
    lastLogin: { 
        type: Date 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Hash password before saving
technicalSupportSchema.pre('save', async function () {
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

// Compare password method
technicalSupportSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('TechnicalSupport', technicalSupportSchema);
