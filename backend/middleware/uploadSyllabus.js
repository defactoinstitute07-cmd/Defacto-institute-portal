const fs = require('fs');
const path = require('path');
const multer = require('multer');

const syllabusUploadDir = path.join(__dirname, '..', 'uploads', 'syllabus');

if (!fs.existsSync(syllabusUploadDir)) {
    fs.mkdirSync(syllabusUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, syllabusUploadDir),
    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase();
        const safeBase = String(path.basename(file.originalname || 'syllabus', extension))
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .slice(0, 60) || 'syllabus';
        cb(null, `${Date.now()}_${safeBase}${extension}`);
    }
});

const allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
]);

const uploadSyllabus = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase();
        const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt']);
        const isAllowed = allowedMimeTypes.has(file.mimetype) || allowedExtensions.has(extension);
        cb(isAllowed ? null : new Error('Only syllabus documents are allowed (pdf/doc/docx/ppt/pptx/txt).'), isAllowed);
    }
});

module.exports = uploadSyllabus;
