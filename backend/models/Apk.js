const mongoose = require('mongoose');

const apkSchema = new mongoose.Schema({
    appName: {
        type: String,
        required: true,
        trim: true
    },
    version: {
        type: String,
        required: true,
        trim: true
    },
    logoUrl: {
        type: String,
        required: true
    },
    apkUrl: {
        type: String,
        required: true
    },
    cloudinaryLogoId: {
        type: String
    },
    cloudinaryApkId: {
        type: String
    },
    screenshots: [{
        url: String,
        cloudinaryId: String,
        caption: String
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Apk', apkSchema);
