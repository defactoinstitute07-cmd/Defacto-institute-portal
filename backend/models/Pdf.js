const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    classLevel: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        trim: true
    },
    pdfUrl: {
        type: String,
        required: true
    },
    cloudinaryPdfId: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Pdf', pdfSchema);
