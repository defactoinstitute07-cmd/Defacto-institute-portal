const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
    // 1. Personal Details
    name: { type: String, required: true, trim: true, index: true },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    profileImage: { type: String }, // relative file path from /uploads/

        // 2. Professional Details
    regNo: { type: String, trim: true, sparse: true, index: true, unique: true }, // Employee ID
    joiningDate: { type: Date },
    // 3. Authentication & System Details
    password: { type: String }, // hashed
    systemRole: { type: String, enum: ['Teacher', 'Admin'], default: 'Teacher' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },

    createdAt: { type: Date, default: Date.now }
});

// Hash password before save (Mongoose 9 async pre-hook — no next() needed)
teacherSchema.pre('save', async function () {
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

module.exports = mongoose.model('Teacher', teacherSchema);
