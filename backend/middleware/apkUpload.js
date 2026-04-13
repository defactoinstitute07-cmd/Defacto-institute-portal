const multer = require('multer');

const storage = multer.memoryStorage();

const apkUpload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB for APKs
    },
    fileFilter: (_req, file, cb) => {
        if (file.fieldname === 'logo' || file.fieldname === 'screenshots') {
            const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
            cb(isImage ? null : new Error('Invalid image format'), isImage);
        } else if (file.fieldname === 'apkFile') {
            // Some APKs might have different mime types, checking extension as well
            const isApk = file.mimetype === 'application/vnd.android.package-archive' || 
                         file.originalname.toLowerCase().endsWith('.apk');
            cb(isApk ? null : new Error('Invalid APK file'), isApk);
        } else {
            cb(new Error('Unexpected field'));
        }
    }
}).fields([
    { name: 'logo', maxCount: 1 },
    { name: 'apkFile', maxCount: 1 },
    { name: 'screenshots', maxCount: 12 }
]);

module.exports = apkUpload;
