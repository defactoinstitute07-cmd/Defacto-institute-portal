const subjectService = require('../services/subject.service');

exports.createSubject = async (req, res) => {
    try {
        const subject = await subjectService.createSubject(req.body);
        res.status(201).json({ message: 'Subject created successfully.', subject });
    } catch (error) {
        const status = error.status || (error.code === 11000 ? 400 : 500);
        res.status(status).json({ message: error.message || 'Failed to create subject.' });
    }
};

exports.getSubjects = async (req, res) => {
    try {
        const subjects = await subjectService.listSubjects({
            activeOnly: req.query.activeOnly !== 'false',
            batchId: req.query.batchId,
            classLevel: req.query.classLevel
        });
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch subjects.' });
    }
};

exports.getSubjectById = async (req, res) => {
    try {
        const subject = await subjectService.getSubjectById({ subjectId: req.params.id });
        res.json({ subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to fetch subject details.' });
    }
};

exports.addChapter = async (req, res) => {
    try {
        const subject = await subjectService.addChapterToSubject({
            subjectId: req.params.id,
            name: req.body?.name,
            durationDays: req.body?.durationDays,
            actorRole: req.role,
            actorId: req.userId
        });
        res.status(201).json({ message: 'Chapter added successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to add chapter.' });
    }
};

exports.updateChapter = async (req, res) => {
    try {
        const subject = await subjectService.updateChapterDetails({
            subjectId: req.params.id,
            chapterId: req.params.chapterId,
            name: req.body?.name,
            durationDays: req.body?.durationDays,
            status: req.body?.status,
            actorRole: req.role,
            actorId: req.userId,
            adminOverride: Boolean(req.body?.adminOverride)
        });
        res.json({ message: 'Chapter updated successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to update chapter.' });
    }
};

exports.updateChapterStatus = async (req, res) => {
    try {
        const subject = await subjectService.updateChapterStatus({
            subjectId: req.params.id,
            chapterId: req.params.chapterId,
            status: req.body?.status,
            actorRole: req.role,
            actorId: req.userId
        });
        res.json({ message: 'Chapter status updated successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to update chapter status.' });
    }
};

exports.bulkUpdateChapters = async (req, res) => {
    try {
        const subject = await subjectService.bulkReplaceChapters({
            subjectId: req.params.id,
            chapters: req.body?.chapters,
            actorRole: req.role,
            actorId: req.userId
        });
        res.json({ message: 'Chapters updated successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to update chapters.' });
    }
};

exports.getMySubjects = async (req, res) => {
    try {
        const data = await subjectService.listSubjectsForStudent({
            studentId: req.userId,
            activeOnly: req.query.activeOnly !== 'false'
        });
        res.json(data);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to fetch student subjects.' });
    }
};

exports.assignTeacher = async (req, res) => {
    try {
        const hasTeacherId = Object.prototype.hasOwnProperty.call(req.body || {}, 'teacherId');
        const subject = await subjectService.assignTeacherToSubject({
            subjectId: req.params.id,
            teacherId: hasTeacherId ? req.body.teacherId : undefined,
            allowUnassign: Boolean(req.body?.allowUnassign)
        });
        res.json({ message: 'Teacher assignment updated successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to assign teacher.' });
    }
};

exports.assignBatches = async (req, res) => {
    try {
        const subject = await subjectService.assignSubjectToBatches({
            subjectId: req.params.id,
            batchIds: req.body?.batchIds
        });
        res.json({ message: 'Subject batches updated successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to update subject batches.' });
    }
};

exports.uploadSyllabus = async (req, res) => {
    try {
        const subject = await subjectService.uploadSyllabusToSubject({
            subjectId: req.params.id,
            file: req.file,
            actorRole: req.role,
            actorId: req.userId
        });
        res.json({ message: 'Syllabus uploaded and propagated to linked batches.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to upload syllabus.' });
    }
};

exports.deleteSubject = async (req, res) => {
    try {
        const subject = await subjectService.deleteSubject({ subjectId: req.params.id });
        res.json({ message: 'Subject deleted successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to delete subject.' });
    }
};
