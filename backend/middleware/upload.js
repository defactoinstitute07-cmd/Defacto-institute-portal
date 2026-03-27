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
} else {
    console.warn('[Upload] Cloudinary env vars missing. Falling back to memory storage.');
}

const storage = hasCloudinaryConfig
    ? new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'erp_uploads',
            allowed_formats: ['jpg', 'png', 'webp', 'gif'],
        },
    })
    : multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
        cb(ok ? null : new Error('Only image files are allowed'), ok);
    }
});

module.exports = upload;
