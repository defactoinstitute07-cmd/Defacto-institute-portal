const Apk = require('../models/Apk');
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

// GET /api/apks
exports.getAllApks = async (req, res) => {
    try {
        const apks = await Apk.find().sort({ createdAt: -1 });
        res.status(200).json(apks);
    } catch (err) {
        console.error('[ApkListError] Failed to fetch APK list:', err);
        res.status(500).json({ message: 'Error fetching APKs from database', error: err.message });
    }
};

// POST /api/apks
exports.createApk = async (req, res) => {
    try {
        const { appName, version, captions } = req.body;
        const files = req.files;

        if (!appName || !version) {
            return res.status(400).json({ message: 'appName and version are required' });
        }

        if (!files || !files.logo || !files.apkFile) {
            return res.status(400).json({ message: 'Logo and APK file are both required' });
        }

        console.log(`[ApkUpload] Processing upload for ${appName} v${version}`);

        // Upload logo (image)
        let logoResult;
        try {
            logoResult = await uploadToCloudinary(files.logo[0].buffer, {
                folder: 'erp_apks/logos',
                resource_type: 'image'
            });
        } catch (logoErr) {
            console.error('[ApkUpload] Logo upload failed:', logoErr);
            return res.status(500).json({ message: 'Failed to upload logo to Cloudinary', error: logoErr.message });
        }

        // Upload APK (raw)
        let apkResult;
        try {
            // Sanitize public_id: Cloudinary only allows alphanumeric, hyphens and underscores
            const safeAppName = appName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const safeVersion = version.replace(/[^a-zA-Z0-9]/g, '_');
            
            apkResult = await uploadToCloudinary(files.apkFile[0].buffer, {
                folder: 'erp_apks/files',
                resource_type: 'raw',
                public_id: `app_${Date.now()}`, // Completely neutral ID
                use_filename: false,
                unique_filename: true
            });
        } catch (apkErr) {
            console.error('[ApkUpload] APK binary upload failed:', apkErr);
            return res.status(500).json({ message: 'Failed to upload APK file to Cloudinary', error: apkErr.message });
        }

        // Upload Screenshots if provided
        let screenshotsBatch = [];
        if (files && files.screenshots && files.screenshots.length > 0) {
            try {
                screenshotsBatch = await Promise.all(
                    files.screenshots.map(file => uploadToCloudinary(file.buffer, {
                        folder: 'erp_apks/screenshots',
                        resource_type: 'image'
                    }))
                );
            } catch (screenErr) {
                console.error('[ApkUpload] Screenshots upload failed:', screenErr);
                // Continue without screenshots or fail? Let's fail for consistency
                return res.status(500).json({ message: 'Failed to upload screenshots to Cloudinary', error: screenErr.message });
            }
        }

        const newApk = new Apk({
            appName: appName.trim(),
            version: version.trim(),
            logoUrl: logoResult.secure_url,
            apkUrl: apkResult.secure_url,
            cloudinaryLogoId: logoResult.public_id,
            cloudinaryApkId: apkResult.public_id,
            screenshots: screenshotsBatch.map((res, index) => ({
                url: res.secure_url,
                cloudinaryId: res.public_id,
                caption: Array.isArray(captions) ? captions[index] : (captions || '')
            }))
        });

        await newApk.save();
        res.status(201).json({ message: 'APK uploaded successfully', apk: newApk });

    } catch (err) {
        console.error('[ApkUpload] Unexpected error:', err);
        res.status(500).json({ message: 'An unexpected error occurred during APK processing', error: err.message });
    }
};

// PATCH /api/apks/:id
exports.updateApk = async (req, res) => {
    try {
        const { id } = req.params;
        const { appName, version, captions } = req.body;
        const files = req.files;

        const existingApk = await Apk.findById(id);
        if (!existingApk) {
            console.error(`[ApkUpdate] APK not found: ${id}`);
            return res.status(404).json({ message: 'APK not found' });
        }

        console.log(`[ApkUpdate] Updating ${existingApk.appName} (ID: ${id})`);
        console.log(`[ApkUpdate] Files received:`, Object.keys(files || {}));
        console.log(`[ApkUpdate] Body keys:`, Object.keys(req.body || {}));

        const updateData = {};
        if (appName) updateData.appName = appName;
        if (version) updateData.version = version;

        // Update logo if new one provided
        if (files && files.logo) {
            // Delete old logo
            if (existingApk.cloudinaryLogoId) {
                await cloudinary.uploader.destroy(existingApk.cloudinaryLogoId);
            }
            const logoResult = await uploadToCloudinary(files.logo[0].buffer, {
                folder: 'erp_apks/logos',
                resource_type: 'image'
            });
            updateData.logoUrl = logoResult.secure_url;
            updateData.cloudinaryLogoId = logoResult.public_id;
        }

        // Update APK if new one provided
        if (files && files.apkFile) {
            // Delete old APK
            if (existingApk.cloudinaryApkId) {
                await cloudinary.uploader.destroy(existingApk.cloudinaryApkId, { resource_type: 'raw' });
            }
            const safeAppName = (appName || existingApk.appName).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const safeVersion = (version || existingApk.version).replace(/[^a-zA-Z0-9]/g, '_');

            const apkResult = await uploadToCloudinary(files.apkFile[0].buffer, {
                folder: 'erp_apks/files',
                resource_type: 'raw',
                public_id: `app_${Date.now()}`, // Completely neutral ID
                use_filename: false,
                unique_filename: true
            });
            updateData.apkUrl = apkResult.secure_url;
            updateData.cloudinaryApkId = apkResult.public_id;
        }

        // Update Screenshots if provided
        if (files && files.screenshots && files.screenshots.length > 0) {
            // Delete old screenshots from Cloudinary
            if (existingApk.screenshots && existingApk.screenshots.length > 0) {
                console.log(`[ApkUpdate] Deleting ${existingApk.screenshots.length} old screenshots`);
                const deletePromises = existingApk.screenshots
                    .filter(s => s.cloudinaryId) // Only destroy if we have an ID
                    .map(s => cloudinary.uploader.destroy(s.cloudinaryId).catch(err => {
                        console.warn(`[ApkUpdate] Failed to delete screenshot ${s.cloudinaryId}:`, err.message);
                        return null; // Don't crash the whole process if one deletion fails
                    }));
                await Promise.all(deletePromises);
            }
            // Upload new ones
            const screenshotsBatch = await Promise.all(
                files.screenshots.map(file => uploadToCloudinary(file.buffer, {
                    folder: 'erp_apks/screenshots',
                    resource_type: 'image'
                }))
            );
            updateData.screenshots = screenshotsBatch.map((res, index) => ({
                url: res.secure_url,
                cloudinaryId: res.public_id,
                caption: Array.isArray(captions) ? captions[index] : (captions || '')
            }));
        }

        const updatedApk = await Apk.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ message: 'APK updated successfully', apk: updatedApk });

    } catch (err) {
        console.error('[ApkUpdate] Critical failure:', err);
        res.status(500).json({ 
            message: 'Failed to update APK', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
        });
    }
};

// DELETE /api/apks/:id
exports.deleteApk = async (req, res) => {
    try {
        const { id } = req.params;
        const apk = await Apk.findById(id);
        if (!apk) return res.status(404).json({ message: 'APK not found' });

        // Cleanup Cloudinary
        if (apk.cloudinaryLogoId) {
            await cloudinary.uploader.destroy(apk.cloudinaryLogoId);
        }
        if (apk.cloudinaryApkId) {
            await cloudinary.uploader.destroy(apk.cloudinaryApkId, { resource_type: 'raw' });
        }
        if (apk.screenshots && apk.screenshots.length > 0) {
            await Promise.all(
                apk.screenshots.map(s => cloudinary.uploader.destroy(s.cloudinaryId))
            );
        }

        await Apk.findByIdAndDelete(id);
        res.status(200).json({ message: 'APK deleted successfully' });

    } catch (err) {
        res.status(500).json({ message: 'Failed to delete APK', error: err.message });
    }
};
