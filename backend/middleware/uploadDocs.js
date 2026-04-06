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

const storage = hasCloudinaryConfig
    ? new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'erp_syllabus',
            resource_type: 'raw'
        }
    })
    : multer.memoryStorage();

const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
];

const uploadDocs = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = allowedMimeTypes.includes(file.mimetype);
        cb(ok ? null : new Error('Only PDF, DOC, DOCX, or TXT files are allowed'), ok);
    }
});

module.exports = uploadDocs;
