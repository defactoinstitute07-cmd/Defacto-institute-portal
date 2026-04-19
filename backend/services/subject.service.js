const path = require('path');
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const attendanceService = require('./attendance.service');

const asObjectId = (value, label) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        const error = new Error(`${label} is invalid.`);
        error.status = 400;
        throw error;
    }
    return new mongoose.Types.ObjectId(value);
};

const buildSyllabusPublicPath = (filePath = '') => {
    const normalized = String(filePath).replace(/\\+/g, '/');

    if (/^https?:\/\//i.test(normalized)) {
        return normalized;
    }

    const withoutDrive = normalized.replace(/^[A-Za-z]:\//, '');
    const uploadsIndex = withoutDrive.toLowerCase().indexOf('uploads/');
    const fromUploads = uploadsIndex >= 0 ? withoutDrive.slice(uploadsIndex) : withoutDrive;
    const safePath = fromUploads.replace(/^\/+/, '');
    return `/${safePath}`;
};

exports.createSubject = (payload) => attendanceService.createSubject(payload);
exports.listSubjects = (filters) => attendanceService.listSubjects(filters);
exports.getSubjectById = (payload) => attendanceService.getSubjectById(payload);
exports.addChapterToSubject = (payload) => attendanceService.addChapterToSubject(payload);
exports.bulkReplaceChapters = (payload) => attendanceService.bulkReplaceChapters(payload);
exports.updateChapterDetails = (payload) => attendanceService.updateChapterDetails(payload);
exports.updateChapterStatus = (payload) => attendanceService.updateChapterStatus(payload);
exports.assignTeacherToSubject = (payload) => attendanceService.assignTeacherToSubject(payload);
exports.assignSubjectToBatches = (payload) => attendanceService.assignSubjectToBatches(payload);
exports.listSubjectsForStudent = (payload) => attendanceService.listSubjectsForStudent(payload);

exports.deleteSubject = async ({ subjectId }) => {
    const subjectObjectId = asObjectId(subjectId, 'Subject');
    const subject = await Subject.findById(subjectObjectId);

    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    if (!subject.isActive) {
        return { ...subject.toObject(), isActive: false };
    }

    subject.isActive = false;
    subject.updatedAt = new Date();
    await subject.save();

    return subject.toObject();
};

exports.uploadSyllabusToSubject = async ({ subjectId, file, actorRole = 'admin', actorId = null }) => {
    if (!file) {
        const error = new Error('Please upload a syllabus document.');
        error.status = 400;
        throw error;
    }

    const subjectObjectId = asObjectId(subjectId, 'Subject');
    const subject = await Subject.findById(subjectObjectId)
        .populate('batchIds', 'name course')
        .populate('teacherId', 'name regNo email phone gender profileImage status');

    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    if (actorRole === 'teacher') {
        const assignedTeacherId = subject.teacherId?._id || subject.teacherId;
        if (!assignedTeacherId || String(assignedTeacherId) !== String(actorId)) {
            const error = new Error('You can upload syllabus only for subjects assigned to you.');
            error.status = 403;
            throw error;
        }
    }

    subject.syllabus = {
        ...(subject.syllabus || {}),
        originalName: file.originalname || path.basename(file.path || ''),
        url: buildSyllabusPublicPath(file.path || ''),
        mimeType: file.mimetype || '',
        uploadedAt: new Date(),
        status: 'completed'
    };

    await subject.save();

    return {
        ...subject.toObject(),
        propagation: {
            linkedBatchCount: Array.isArray(subject.batchIds) && subject.batchIds.length > 0
                ? subject.batchIds.length
                : 0
        }
    };
};
