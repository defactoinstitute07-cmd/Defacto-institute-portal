const Pdf = require('../models/Pdf');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

const uploadToCloudinary = (fileBuffer, options) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (result) resolve(result);
            else reject(error);
        });
        
        const readable = new Readable();
        readable.push(fileBuffer);
        readable.push(null);
        readable.pipe(uploadStream);
    });
};

// GET /api/pdfs
exports.getAllPdfs = async (req, res) => {
    try {
        const pdfs = await Pdf.find().sort({ createdAt: -1 });
        res.status(200).json(pdfs);
    } catch (err) {
        console.error('[PdfListError] Failed to fetch PDF list:', err);
        res.status(500).json({ message: 'Error fetching PDFs from database', error: err.message });
    }
};

// POST /api/pdfs
exports.createPdf = async (req, res) => {
    try {
        const { name, classLevel, subject } = req.body;
        const file = req.file;

        if (!name || !classLevel) {
            return res.status(400).json({ message: 'Name and class level are required' });
        }

        if (!file) {
            return res.status(400).json({ message: 'PDF file is required' });
        }

        console.log(`[PdfUpload] Processing upload for ${name} (${classLevel})`);

        // Upload PDF (raw)
        let pdfResult;
        try {
            // Sanitize public_id: Cloudinary only allows alphanumeric, hyphens and underscores
            const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const safeClass = classLevel.replace(/[^a-zA-Z0-9]/g, '_');
            
            pdfResult = await uploadToCloudinary(file.buffer, {
                folder: 'erp_pdfs',
                resource_type: 'raw',
                public_id: `${safeName}_${safeClass}_${Date.now()}`,
                format: 'pdf'
            });
        } catch (pdfErr) {
            console.error('[PdfUpload] PDF upload failed:', pdfErr);
            return res.status(500).json({ message: 'Failed to upload PDF file to Cloudinary', error: pdfErr.message });
        }

        const newPdf = new Pdf({
            name: name.trim(),
            classLevel: classLevel.trim(),
            subject: subject ? subject.trim() : '',
            pdfUrl: pdfResult.secure_url,
            cloudinaryPdfId: pdfResult.public_id
        });

        await newPdf.save();
        res.status(201).json({ message: 'PDF uploaded successfully', pdf: newPdf });

    } catch (err) {
        console.error('[PdfUpload] Unexpected error:', err);
        res.status(500).json({ message: 'An unexpected error occurred during PDF processing', error: err.message });
    }
};

// DELETE /api/pdfs/:id
exports.deletePdf = async (req, res) => {
    try {
        const { id } = req.params;
        const pdf = await Pdf.findById(id);
        if (!pdf) return res.status(404).json({ message: 'PDF not found' });

        // Cleanup Cloudinary
        if (pdf.cloudinaryPdfId) {
            try {
                await cloudinary.uploader.destroy(pdf.cloudinaryPdfId, { resource_type: 'raw' });
            } catch (clErr) {
                console.warn('[PdfDelete] Cloudinary cleanup warning:', clErr.message);
            }
        }

        await Pdf.findByIdAndDelete(id);
        res.status(200).json({ message: 'PDF deleted successfully' });

    } catch (err) {
        res.status(500).json({ message: 'Failed to delete PDF', error: err.message });
    }
};
