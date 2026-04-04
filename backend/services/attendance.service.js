const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');

const VALID_STATUSES = ['Present', 'Absent', 'Late'];

const asObjectId = (value, label) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        const error = new Error(`${label} is invalid.`);
        error.status = 400;
        throw error;
    }
    return new mongoose.Types.ObjectId(value);
};

const parseAttendanceDate = (value) => {
    if (value instanceof Date) {
        return new Date(value.getTime());
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

        // Parse date-only inputs as local calendar dates to avoid UTC timezone shifts.
        if (dateOnlyMatch) {
            const year = Number(dateOnlyMatch[1]);
            const monthIndex = Number(dateOnlyMatch[2]) - 1;
            const day = Number(dateOnlyMatch[3]);
            const parsed = new Date(Date.UTC(year, monthIndex, day));

            if (
                parsed.getUTCFullYear() === year &&
                parsed.getUTCMonth() === monthIndex &&
                parsed.getUTCDate() === day
            ) {
                return parsed;
            }

            return new Date(NaN);
        }

        return new Date(trimmed);
    }

    return new Date(value);
};

const normalizeAttendanceDate = (value) => {
    const date = parseAttendanceDate(value);
    if (Number.isNaN(date.getTime())) {
        const error = new Error('A valid attendance date is required.');
        error.status = 400;
        throw error;
    }
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

const normalizeStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    const map = {
        present: 'Present',
        absent: 'Absent',
        late: 'Late'
    };
    if (!map[normalized]) {
        const error = new Error('Attendance status must be Present, Absent, or Late.');
        error.status = 400;
        throw error;
    }
    return map[normalized];
};

const normalizeChapterStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!['ongoing', 'completed'].includes(normalized)) {
        const error = new Error('Chapter status must be ongoing or completed.');
        error.status = 400;
        throw error;
    }
    return normalized;
};

const addDaysUtc = (date, days) => {
    const base = new Date(date.getTime());
    base.setUTCHours(0, 0, 0, 0);
    base.setUTCDate(base.getUTCDate() + Number(days || 0));
    return base;
};

const recalculateChapterTimeline = (subject) => {
    let previousCompletionDate = null;

    subject.chapters.forEach((chapter) => {
        if (chapter.status === 'completed' && chapter.completedAt) {
            chapter.projectedStartDate = chapter.projectedStartDate || previousCompletionDate;
            chapter.projectedCompletionDate = chapter.completedAt;
            previousCompletionDate = chapter.completedAt;
            return;
        }

        if (!previousCompletionDate) {
            chapter.projectedStartDate = null;
            chapter.projectedCompletionDate = null;
            return;
        }

        chapter.projectedStartDate = previousCompletionDate;
        chapter.projectedCompletionDate = addDaysUtc(previousCompletionDate, chapter.durationDays);
        previousCompletionDate = chapter.projectedCompletionDate;
    });
};

const buildSubjectProgress = (subject) => {
    const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];
    const totalChapters = chapters.length;
    const completedCount = chapters.filter((chapter) => chapter.status === 'completed').length;
    const remainingCount = Math.max(totalChapters - completedCount, 0);
    const progressPercentage = totalChapters === 0
        ? 0
        : Math.round((completedCount / totalChapters) * 100);

    const nextChapter = chapters.find((chapter) => chapter.status !== 'completed') || null;

    let dueInDays = null;
    if (nextChapter?.projectedCompletionDate) {
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const projected = new Date(nextChapter.projectedCompletionDate);
        projected.setUTCHours(0, 0, 0, 0);
        dueInDays = Math.max(Math.ceil((projected.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)), 0);
    }

    return {
        totalChapters,
        completedChapters: completedCount,
        remainingChapters: remainingCount,
        progressPercentage,
        nextChapter: nextChapter
            ? {
                id: nextChapter._id,
                name: nextChapter.name,
                durationDays: nextChapter.durationDays,
                dueInDays: dueInDays === null ? nextChapter.durationDays : dueInDays,
                projectedCompletionDate: nextChapter.projectedCompletionDate || null
            }
            : null
    };
};

const ensureSubjectLinkedToBatch = async (batch, subject) => {
    const updates = {};
    const hasSubjectId = (batch.subjectIds || []).some((id) => id.toString() === subject._id.toString());
    const hasSubjectName = (batch.subjects || []).includes(subject.name);

    if (!hasSubjectId) {
        updates.$addToSet = { ...(updates.$addToSet || {}), subjectIds: subject._id };
    }

    if (!hasSubjectName) {
        updates.$addToSet = { ...(updates.$addToSet || {}), subjects: subject.name };
    }

    if (Object.keys(updates).length > 0) {
        await Batch.findByIdAndUpdate(batch._id, updates);
    }
};

exports.createSubject = async ({ name, code, batchId, totalChapters }) => {
    if (!name || !String(name).trim()) {
        const error = new Error('Subject name is required.');
        error.status = 400;
        throw error;
    }

    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
        const error = new Error('A valid batchId is required.');
        error.status = 400;
        throw error;
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
        const error = new Error('Batch not found.');
        error.status = 404;
        throw error;
    }

    const subject = new Subject({
        name: String(name).trim(),
        code: code ? String(code).trim().toUpperCase() : undefined,
        batchId: new mongoose.Types.ObjectId(batchId),
        totalChapters: Number.isFinite(Number(totalChapters)) ? Math.max(0, Number(totalChapters)) : null
    });

    await subject.save();

    // Automatically add this new subject to the batch's subject lists
    await ensureSubjectLinkedToBatch(batch, subject);

    return subject.toObject();
};

exports.listSubjects = async ({ activeOnly = true, batchId } = {}) => {
    const query = activeOnly ? { isActive: true } : {};
    if (batchId) {
        query.batchId = asObjectId(batchId, 'Batch');
    }
    return Subject.find(query)
        .populate('teacherId', 'name regNo email phone gender profileImage status')
        .sort({ name: 1 })
        .lean();
};

exports.getSubjectById = async ({ subjectId }) => {
    const objectId = asObjectId(subjectId, 'Subject');
    const subject = await Subject.findById(objectId)
        .populate('teacherId', 'name regNo email phone gender profileImage status')
        .lean();

    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    const progress = buildSubjectProgress(subject);

    return {
        ...subject,
        totalChapters: progress.totalChapters,
        progress
    };
};

exports.assignTeacherToSubject = async ({ subjectId, teacherId }) => {
    const subjectObjectId = asObjectId(subjectId, 'Subject');

    const subject = await Subject.findById(subjectObjectId);
    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    if (!teacherId) {
        subject.teacherId = null;
        await subject.save();
        const populated = await Subject.findById(subject._id)
            .populate('teacherId', 'name regNo email phone gender profileImage status')
            .lean();
        const progress = buildSubjectProgress(populated);
        return {
            ...populated,
            totalChapters: progress.totalChapters,
            progress
        };
    }

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        const error = new Error('A valid teacherId is required.');
        error.status = 400;
        throw error;
    }

    const teacher = await Teacher.findById(teacherId).select('_id status').lean();
    if (!teacher) {
        const error = new Error('Teacher not found.');
        error.status = 404;
        throw error;
    }

    if (teacher.status !== 'active') {
        const error = new Error('Only active teachers can be assigned.');
        error.status = 400;
        throw error;
    }

    subject.teacherId = teacher._id;
    await subject.save();

    const populated = await Subject.findById(subject._id)
        .populate('teacherId', 'name regNo email phone gender profileImage status')
        .lean();
    const progress = buildSubjectProgress(populated);

    return {
        ...populated,
        totalChapters: progress.totalChapters,
        progress
    };
};

exports.addChapterToSubject = async ({ subjectId, name, durationDays }) => {
    const objectId = asObjectId(subjectId, 'Subject');

    if (!name || !String(name).trim()) {
        const error = new Error('Chapter name is required.');
        error.status = 400;
        throw error;
    }

    const parsedDuration = Number(durationDays);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 1) {
        const error = new Error('Chapter durationDays must be at least 1.');
        error.status = 400;
        throw error;
    }

    const subject = await Subject.findById(objectId);
    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    subject.chapters.push({
        name: String(name).trim(),
        durationDays: Math.round(parsedDuration),
        status: 'ongoing',
        completedAt: null,
        projectedStartDate: null,
        projectedCompletionDate: null
    });
    recalculateChapterTimeline(subject);
    subject.totalChapters = subject.chapters.length;
    await subject.save();

    const response = subject.toObject();
    const progress = buildSubjectProgress(response);

    return {
        ...response,
        totalChapters: progress.totalChapters,
        progress
    };
};

exports.updateChapterDetails = async ({ subjectId, chapterId, name, durationDays, status, actorRole, adminOverride = false }) => {
    const subjectObjectId = asObjectId(subjectId, 'Subject');

    if (!chapterId || !mongoose.Types.ObjectId.isValid(chapterId)) {
        const error = new Error('A valid chapterId is required.');
        error.status = 400;
        throw error;
    }

    const subject = await Subject.findById(subjectObjectId);
    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    const chapter = subject.chapters.id(chapterId);
    if (!chapter) {
        const error = new Error('Chapter not found.');
        error.status = 404;
        throw error;
    }

    if (chapter.status === 'completed' && !(adminOverride && actorRole === 'admin')) {
        const error = new Error('Completed chapters are locked. Use admin override to edit.');
        error.status = 403;
        throw error;
    }

    if (name !== undefined) {
        if (!String(name).trim()) {
            const error = new Error('Chapter name cannot be empty.');
            error.status = 400;
            throw error;
        }
        chapter.name = String(name).trim();
    }

    if (durationDays !== undefined) {
        const parsedDuration = Number(durationDays);
        if (!Number.isFinite(parsedDuration) || parsedDuration < 1) {
            const error = new Error('Chapter durationDays must be at least 1.');
            error.status = 400;
            throw error;
        }
        chapter.durationDays = Math.round(parsedDuration);
    }

    if (status !== undefined) {
        const normalizedStatus = normalizeChapterStatus(status);
        if (normalizedStatus !== 'ongoing') {
            const error = new Error('Only ongoing status can be updated here. Use status endpoint for completion.');
            error.status = 400;
            throw error;
        }
        chapter.status = 'ongoing';
        chapter.completedAt = null;
    }

    recalculateChapterTimeline(subject);
    subject.totalChapters = subject.chapters.length;
    await subject.save();

    const response = subject.toObject();
    const progress = buildSubjectProgress(response);

    return {
        ...response,
        totalChapters: progress.totalChapters,
        progress
    };
};

exports.updateChapterStatus = async ({ subjectId, chapterId, status }) => {
    const subjectObjectId = asObjectId(subjectId, 'Subject');
    const normalizedStatus = normalizeChapterStatus(status);

    if (!chapterId || !mongoose.Types.ObjectId.isValid(chapterId)) {
        const error = new Error('A valid chapterId is required.');
        error.status = 400;
        throw error;
    }

    const subject = await Subject.findById(subjectObjectId);
    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    const chapter = subject.chapters.id(chapterId);
    if (!chapter) {
        const error = new Error('Chapter not found.');
        error.status = 404;
        throw error;
    }

    chapter.status = normalizedStatus;
    chapter.completedAt = normalizedStatus === 'completed' ? new Date() : null;
    recalculateChapterTimeline(subject);
    subject.totalChapters = subject.chapters.length;
    await subject.save();

    const response = subject.toObject();
    const progress = buildSubjectProgress(response);

    return {
        ...response,
        totalChapters: progress.totalChapters,
        progress
    };
};

exports.getAdminSetupData = async () => {
    const [batches, subjects] = await Promise.all([
        Batch.find({ isActive: true }).select('name course subjects subjectIds').sort({ name: 1 }).lean(),
        Subject.find({ isActive: true }).select('name code').sort({ name: 1 }).lean()
    ]);

    return { batches, subjects };
};

exports.getAttendanceRoster = async ({ actorRole, actorId, batchId, subjectId, date }) => {
    const batchObjectId = asObjectId(batchId, 'Batch');
    const subjectObjectId = asObjectId(subjectId, 'Subject');
    const attendanceDate = normalizeAttendanceDate(date || new Date());

    const [batch, subject, students, existingAttendance] = await Promise.all([
        Batch.findById(batchObjectId).select('name course subjects subjectIds').lean(),
        Subject.findById(subjectObjectId).select('name code').lean(),
        Student.find({ batchId: batchObjectId, status: 'active' })
            .select('name rollNo profileImage contact')
            .sort({ name: 1 })
            .lean(),
        Attendance.find({
            batchId: batchObjectId,
            subjectId: subjectObjectId,
            attendanceDate
        }).select('studentId status notes').lean()
    ]);

    if (!batch) {
        const error = new Error('Batch not found.');
        error.status = 404;
        throw error;
    }

    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    const attendanceMap = new Map(
        existingAttendance.map((record) => [
            record.studentId.toString(),
            {
                status: record.status,
                notes: record.notes || ''
            }
        ])
    );

    return {
        batch,
        subject,
        date: attendanceDate,
        isMarked: existingAttendance.length > 0,
        students: students.map((student) => ({
            ...student,
            attendanceStatus: attendanceMap.get(student._id.toString())?.status || 'Present',
            attendanceNotes: attendanceMap.get(student._id.toString())?.notes || ''
        }))
    };
};

exports.markAttendance = async ({ actorRole, actorId, batchId, subjectId, date, entries }) => {
    const batchObjectId = asObjectId(batchId, 'Batch');
    const subjectObjectId = asObjectId(subjectId, 'Subject');
    const attendanceDate = normalizeAttendanceDate(date);

    if (!Array.isArray(entries) || entries.length === 0) {
        const error = new Error('Attendance entries are required.');
        error.status = 400;
        throw error;
    }

    const [batch, subject] = await Promise.all([
        Batch.findById(batchObjectId).select('name course').lean(),
        Subject.findById(subjectObjectId).select('name code').lean()
    ]);

    if (!batch) {
        const error = new Error('Batch not found.');
        error.status = 404;
        throw error;
    }

    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    const dedupedEntries = new Map();
    entries.forEach((entry) => {
        if (!entry?.studentId) return;
        dedupedEntries.set(String(entry.studentId), {
            studentId: String(entry.studentId),
            status: normalizeStatus(entry.status),
            notes: entry.notes ? String(entry.notes).trim() : ''
        });
    });

    if (dedupedEntries.size === 0) {
        const error = new Error('At least one valid student attendance entry is required.');
        error.status = 400;
        throw error;
    }

    const studentIds = Array.from(dedupedEntries.keys()).map((studentId) => asObjectId(studentId, 'Student'));

    const students = await Student.find({
        _id: { $in: studentIds },
        batchId: batchObjectId,
        status: 'active'
    }).select('name rollNo').lean();

    if (students.length !== studentIds.length) {
        const error = new Error('One or more students do not belong to the selected active batch.');
        error.status = 400;
        throw error;
    }

    const bulkOps = students.map((student) => {
        const entry = dedupedEntries.get(student._id.toString());
        return {
            updateOne: {
                filter: {
                    studentId: student._id,
                    batchId: batchObjectId,
                    subjectId: subjectObjectId,
                    attendanceDate
                },
                update: {
                    $set: {
                        studentId: student._id,
                        batchId: batchObjectId,
                        subjectId: subjectObjectId,
                        date: attendanceDate,
                        attendanceDate,
                        status: entry.status,
                        notes: entry.notes,
                        markedBy: actorId || null,
                        markedByModel: actorRole === 'admin' ? 'Admin' : 'Teacher',
                        markedByRole: actorRole,
                        updatedAt: new Date()
                    },
                    $setOnInsert: {
                        createdAt: new Date()
                    }
                },
                upsert: true
            }
        };
    });

    await Attendance.bulkWrite(bulkOps, { ordered: false });

    const statusSummary = {
        Present: 0,
        Absent: 0,
        Late: 0
    };

    students.forEach((student) => {
        const entry = dedupedEntries.get(student._id.toString());
        statusSummary[entry.status] += 1;
    });

    return {
        batch,
        subject,
        date: attendanceDate,
        totals: {
            processed: students.length,
            present: statusSummary.Present,
            absent: statusSummary.Absent,
            late: statusSummary.Late
        }
    };
};

exports.updateAttendanceRecord = async ({ actorRole, actorId, attendanceId, status, notes }) => {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
        const error = new Error('Attendance record not found.');
        error.status = 404;
        throw error;
    }

    attendance.status = normalizeStatus(status);
    attendance.notes = notes ? String(notes).trim() : attendance.notes;
    attendance.markedBy = actorId || attendance.markedBy;
    attendance.markedByModel = actorRole === 'admin' ? 'Admin' : 'Teacher';
    attendance.markedByRole = actorRole;
    attendance.updatedAt = new Date();

    await attendance.save();

    await attendance.populate('studentId', 'name rollNo');
    await attendance.populate('batchId', 'name');
    await attendance.populate('subjectId', 'name code');

    return attendance.toObject();
};

exports.getAttendanceReport = async ({
    actorRole,
    actorId,
    batchId,
    subjectId,
    studentId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 50
}) => {
    const query = {};

    if (batchId) query.batchId = asObjectId(batchId, 'Batch');
    if (subjectId) query.subjectId = asObjectId(subjectId, 'Subject');
    if (studentId) query.studentId = asObjectId(studentId, 'Student');

    if (actorRole === 'student') {
        query.studentId = asObjectId(actorId, 'Student');
    }

    if (dateFrom || dateTo) {
        query.attendanceDate = {};
        if (dateFrom) query.attendanceDate.$gte = normalizeAttendanceDate(dateFrom);
        if (dateTo) query.attendanceDate.$lte = normalizeAttendanceDate(dateTo);
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [records, total, summaryRows] = await Promise.all([
        Attendance.find(query)
            .populate('studentId', 'name rollNo')
            .populate('batchId', 'name course')
            .populate('subjectId', 'name code')
            .populate('markedBy', 'adminName name')
            .sort({ attendanceDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .lean(),
        Attendance.countDocuments(query),
        Attendance.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const summary = {
        total,
        present: 0,
        absent: 0,
        late: 0
    };

    summaryRows.forEach((row) => {
        if (row._id === 'Present') summary.present = row.count;
        if (row._id === 'Absent') summary.absent = row.count;
        if (row._id === 'Late') summary.late = row.count;
    });

    return {
        records,
        summary,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            pages: total === 0 ? 0 : Math.ceil(total / safeLimit)
        }
    };
};
