const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const hasCloudinaryConfig = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinaryConfig) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

const syllabusUploadDir = process.env.VERCEL
    ? path.join(os.tmpdir(), 'erp_uploads', 'syllabus')
    : path.join(__dirname, '..', 'uploads', 'syllabus');

const ensureUploadDir = () => {
    if (!fs.existsSync(syllabusUploadDir)) {
        fs.mkdirSync(syllabusUploadDir, { recursive: true });
    }
};

const storage = hasCloudinaryConfig
    ? new CloudinaryStorage({
        cloudinary,
        params: (_req, file) => {
            const extension = path.extname(file.originalname || '').toLowerCase().replace(/^\./, '') || 'bin';

            return {
                folder: 'erp_syllabus',
                resource_type: 'raw',
                format: extension
            };
        }
    })
    : multer.diskStorage({
        destination: (_req, _file, cb) => {
            ensureUploadDir();
            cb(null, syllabusUploadDir);
        },
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
