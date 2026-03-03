const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: "dsks5swu1",
    api_key: "869719362557155",
    api_secret: "-n7zYbS4YaSKRnXHFiBe-LxEkiE"
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'erp_uploads',
        allowed_formats: ['jpg', 'png', 'webp', 'gif'],
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
        cb(ok ? null : new Error('Only image files are allowed'), ok);
    }
});

module.exports = upload;
