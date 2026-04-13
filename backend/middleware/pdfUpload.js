const multer = require('multer');

const storage = multer.memoryStorage();

const pdfUpload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB for PDFs
    },
    fileFilter: (_req, file, cb) => {
        if (file.fieldname === 'pdfFile') {
            const isPdf = file.mimetype === 'application/pdf' || 
                         file.originalname.toLowerCase().endsWith('.pdf');
            cb(isPdf ? null : new Error('Invalid PDF file format. Only PDF files are allowed.'), isPdf);
        } else {
            cb(new Error('Unexpected field: ' + file.fieldname));
        }
    }
}).single('pdfFile');

module.exports = pdfUpload;
