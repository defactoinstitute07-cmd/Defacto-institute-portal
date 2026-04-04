const attendanceService = require('../services/attendance.service');

exports.createSubject = async (req, res) => {
    try {
        const subject = await attendanceService.createSubject(req.body);
        res.status(201).json({ message: 'Subject created successfully.', subject });
    } catch (error) {
        const status = error.status || (error.code === 11000 ? 400 : 500);
        res.status(status).json({ message: error.message || 'Failed to create subject.' });
    }
};

exports.getSubjects = async (req, res) => {
    try {
        const subjects = await attendanceService.listSubjects({
            activeOnly: req.query.activeOnly !== 'false',
            batchId: req.query.batchId
        });
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch subjects.' });
    }
};

exports.getSubjectById = async (req, res) => {
    try {
        const subject = await attendanceService.getSubjectById({ subjectId: req.params.id });
        res.json({ subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to fetch subject details.' });
    }
};

exports.addChapter = async (req, res) => {
    try {
        const subject = await attendanceService.addChapterToSubject({
            subjectId: req.params.id,
            name: req.body?.name,
            durationDays: req.body?.durationDays
        });
        res.status(201).json({ message: 'Chapter added successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to add chapter.' });
    }
};

exports.updateChapter = async (req, res) => {
    try {
        const subject = await attendanceService.updateChapterDetails({
            subjectId: req.params.id,
            chapterId: req.params.chapterId,
            name: req.body?.name,
            durationDays: req.body?.durationDays,
            status: req.body?.status,
            actorRole: req.role,
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
        const subject = await attendanceService.updateChapterStatus({
            subjectId: req.params.id,
            chapterId: req.params.chapterId,
            status: req.body?.status
        });
        res.json({ message: 'Chapter status updated successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to update chapter status.' });
    }
};

exports.assignTeacher = async (req, res) => {
    try {
        const subject = await attendanceService.assignTeacherToSubject({
            subjectId: req.params.id,
            teacherId: req.body?.teacherId || null
        });
        res.json({ message: 'Teacher assignment updated successfully.', subject });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to assign teacher.' });
    }
};
