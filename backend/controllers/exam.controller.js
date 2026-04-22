const Exam = require('../models/Exam');
const { triggerAutomaticNotification } = require('../services/notificationService');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Subject = require('../models/Subject');
const { logNotificationEvent } = require('../services/activityLogService');

const resolveExamLinkedBatchIds = async (exam) => {
    if (!exam) return [];

    if (exam.subjectId) {
        const subject = await Subject.findById(exam.subjectId).select('batchIds').lean();
        const ids = Array.isArray(subject?.batchIds)
            ? subject.batchIds.map((id) => String(id))
            : [];
        if (ids.length > 0) {
            return ids;
        }
    }

    if (exam.batchId) {
        return [String(exam.batchId)];
    }

    return [];
};

// GET /api/exams — list all exams
exports.getAllExams = async (req, res) => {
    try {
        const exams = await Exam.find()
            .populate('batchId', 'name subjects')
            .sort({ createdAt: -1 })
            .lean();

        const subjectIds = Array.from(new Set(
            exams
                .map((exam) => String(exam.subjectId || '').trim())
                .filter(Boolean)
        ));

        const subjects = subjectIds.length > 0
            ? await Subject.find({ _id: { $in: subjectIds } }).select('_id batchIds').lean()
            : [];

        const subjectMap = new Map(subjects.map((subject) => [String(subject._id), subject]));

        const allBatchIds = new Set();
        subjects.forEach((subject) => {
            (subject.batchIds || []).forEach((batchId) => allBatchIds.add(String(batchId)));
        });

        const allBatches = allBatchIds.size > 0
            ? await Batch.find({ _id: { $in: Array.from(allBatchIds) } }).select('name course').lean()
            : [];

        const batchMap = new Map(allBatches.map((batch) => [String(batch._id), batch]));

        const enriched = exams.map((exam) => {
            const subject = exam.subjectId ? subjectMap.get(String(exam.subjectId)) : null;
            const linkedBatchIds = Array.isArray(subject?.batchIds) && subject.batchIds.length > 0
                ? subject.batchIds.map((id) => String(id))
                : (exam.batchId?._id ? [String(exam.batchId._id)] : []);

            const linkedBatches = linkedBatchIds
                .map((id) => {
                    const batch = batchMap.get(id);
                    if (batch) {
                        return {
                            _id: batch._id,
                            name: batch.name,
                            course: batch.course || ''
                        };
                    }

                    if (exam.batchId && String(exam.batchId._id) === id) {
                        return {
                            _id: exam.batchId._id,
                            name: exam.batchId.name,
                            course: ''
                        };
                    }

                    return null;
                })
                .filter(Boolean);

            return {
                ...exam,
                linkedBatches,
                linkedBatchNames: linkedBatches.map((batch) => batch.name)
            };
        });

        res.json({ exams: enriched });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/exams — create a new test
exports.createExam = async (req, res) => {
    try {
        const { name, classLevel, subject, subjectId, chapter, batchId, date, totalMarks, passingMarks } = req.body;
        if (!name || !chapter || !totalMarks || !passingMarks || (!subjectId && !subject)) {
            return res.status(400).json({ message: 'Name, class level, subject, chapter, totalMarks and passingMarks are required.' });
        }
        if (parseFloat(passingMarks) > parseFloat(totalMarks)) {
            return res.status(400).json({ message: 'Passing marks cannot exceed total marks.' });
        }

        let selectedSubject = null;

        if (subjectId) {
            selectedSubject = await Subject.findById(subjectId)
                .select('name classLevel batchIds isActive')
                .lean();
        }

        if (!selectedSubject && subject) {
            const normalizedClassLevel = String(classLevel || '').trim();
            const subjectQuery = {
                name: String(subject).trim(),
                isActive: true
            };
            if (normalizedClassLevel) {
                subjectQuery.classLevel = normalizedClassLevel;
            }
            selectedSubject = await Subject.findOne({
                ...subjectQuery
            })
                .select('name classLevel batchIds isActive')
                .lean();
        }

        if (!selectedSubject || !selectedSubject.isActive) {
            return res.status(400).json({ message: 'Selected subject was not found or is inactive.' });
        }

        const linkedBatchIds = Array.isArray(selectedSubject.batchIds)
            ? selectedSubject.batchIds.map((id) => id.toString())
            : [];

        if (linkedBatchIds.length === 0) {
            return res.status(400).json({ message: 'Selected subject is not assigned to any batch.' });
        }

        if (batchId && !linkedBatchIds.includes(String(batchId))) {
            return res.status(400).json({ message: 'Selected subject is not assigned to the selected batch.' });
        }

        const normalizedSubjectName = selectedSubject.name;
        const normalizedClassLevel = String(selectedSubject.classLevel || classLevel || 'General').trim() || 'General';
        const resolvedBatchId = batchId || linkedBatchIds[0];
        const exam = new Exam({
            name,
            classLevel: normalizedClassLevel,
            subject: normalizedSubjectName,
            subjectId: selectedSubject._id,
            chapter,
            batchId: resolvedBatchId,
            linkedBatchCount: Math.max(linkedBatchIds.length, 1),
            date,
            totalMarks,
            passingMarks
        });
        await exam.save();
        await exam.populate('batchId', 'name subjects');

        // Notify all active students across every batch linked to the selected subject.
        const students = await Student.find({
            batchId: { $in: linkedBatchIds },
            status: 'active'
        }).select('name email _id batchId').lean();

        const seenStudentIds = new Set();
        const uniqueStudents = students.filter((student) => {
            const key = String(student._id);
            if (seenStudentIds.has(key)) return false;
            seenStudentIds.add(key);
            return true;
        });

        uniqueStudents.forEach(student => {
            // Trigger Automatic Notification (Push/Email)
            triggerAutomaticNotification({
                eventType: 'testAnnouncement',
                studentId: student._id,
                message: `New Test Scheduled: ${name} (${normalizedSubjectName}) on ${date ? new Date(date).toLocaleDateString('en-IN') : 'TBD'}`,
                data: {
                    examName: name,
                    subject: normalizedSubjectName,
                    date: date ? new Date(date).toLocaleDateString('en-IN') : 'TBD',
                    totalMarks,
                    passingMarks
                }
            });

            if (student.email) {
                logNotificationEvent({
                    recipientEmail: student.email,
                    recipientName: student.name,
                    subject: `New Test Scheduled: ${name}`,
                    type: 'test_scheduled',
                    data: {
                        examName: name,
                        subject: normalizedSubjectName,
                        chapter,
                        date: date ? new Date(date).toLocaleDateString('en-IN') : 'TBD',
                        totalMarks,
                        passingMarks
                    }
                }).catch(() => console.error('[ExamNotificationLog] test_scheduled logging failed'));
            }
        });

        res.status(201).json({
            message: 'Test created successfully',
            exam,
            notificationScope: {
                subjectId: selectedSubject._id,
                linkedBatchCount: linkedBatchIds.length,
                notifiedStudents: uniqueStudents.length
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/exams/:id — update exam details (admin only)
exports.updateExam = async (req, res) => {
    try {
        const { name, subject, date, totalMarks, passingMarks, status } = req.body;
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        if (name) exam.name = name;
        if (subject) exam.subject = subject;
        if (date) exam.date = date;
        if (totalMarks) exam.totalMarks = totalMarks;
        if (passingMarks) exam.passingMarks = passingMarks;
        if (status) exam.status = status;

        await exam.save();
        await exam.populate('batchId', 'name subjects');
        res.json({ message: 'Exam updated', exam });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/exams/:id
exports.deleteExam = async (req, res) => {
    try {
        await Exam.findByIdAndDelete(req.params.id);
        await ExamResult.deleteMany({ examId: req.params.id });
        res.json({ message: 'Exam and all results deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/:id/students — fetch students in exam class-level scope
exports.getExamStudents = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('batchId', 'name');
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const linkedBatchIds = await resolveExamLinkedBatchIds(exam);
        if (linkedBatchIds.length === 0) {
            return res.json({ exam, students: [] });
        }

        const students = await Student.find({ batchId: { $in: linkedBatchIds }, status: 'active' })
            .select('name rollNo _id batchId')
            .populate('batchId', 'name')
            .sort({ name: 1 })
            .lean();

        // Attach existing result if any
        const results = await ExamResult.find({ examId: exam._id }).lean();
        const resultMap = {};
        results.forEach(r => { resultMap[r.studentId.toString()] = r; });

        const rows = students.map(s => ({
            ...s,
            batchName: s.batchId?.name || 'Unassigned',
            result: resultMap[s._id.toString()] || null
        }));

        res.json({ exam, students: rows });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/:id/results — get all results for a test
exports.getExamResults = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('batchId', 'name').lean();
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const results = await ExamResult.find({ examId: req.params.id })
            .populate({
                path: 'studentId',
                select: 'name rollNo batchId',
                populate: {
                    path: 'batchId',
                    select: 'name'
                }
            })
            .populate('uploadedBy', 'name')
            .sort({ 'studentId.name': 1 })
            .lean();

        res.json({ exam, results });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/exams/:id/results — bulk upload / save marks
exports.saveMarks = async (req, res) => {
    try {
        const { marks } = req.body; // Array of { studentId, marksObtained, remarks }
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        if (!Array.isArray(marks) || marks.length === 0) {
            return res.status(400).json({ message: 'marks array is required.' });
        }

        const uploadedBy = req.teacher?.id || null; // null means admin

        const linkedBatchIds = await resolveExamLinkedBatchIds(exam);
        const studentIds = marks.map((m) => m.studentId);
        const students = await Student.find({ _id: { $in: studentIds } })
            .select('_id name email batchId')
            .lean();

        const studentMap = {};
        students.forEach((student) => {
            studentMap[String(student._id)] = student;
        });

        const ops = [];
        for (const { studentId, marksObtained, remarks, isPresent } of marks) {
            const student = studentMap[String(studentId)];
            if (!student) {
                return res.status(400).json({ message: 'One or more selected students were not found.' });
            }

            const studentBatchId = String(student.batchId || '');
            if (linkedBatchIds.length > 0 && !linkedBatchIds.includes(studentBatchId)) {
                return res.status(400).json({ message: `Student ${student.name} is outside the exam class-level scope.` });
            }

            ops.push({
                updateOne: {
                    filter: { examId: exam._id, studentId },
                    update: {
                        $set: {
                            batchId: student.batchId,
                            marksObtained: parseFloat(marksObtained) || 0,
                            isPresent: isPresent !== undefined ? isPresent : true,
                            remarks: remarks || '',
                            uploadedBy,
                            uploadedAt: new Date()
                        }
                    },
                    upsert: true
                }
            });
        }

        await ExamResult.bulkWrite(ops);

        // Mark exam as completed once marks are uploaded
        if (exam.status === 'scheduled') {
            exam.status = 'completed';
            await exam.save();
        }

        // Log result announcements for each student.
        const resultStudentMap = {};
        students.forEach(s => { resultStudentMap[s._id.toString()] = s; });

        marks.forEach(m => {
            const student = resultStudentMap[m.studentId?.toString()];
            if (student) {
                const mo = parseFloat(m.marksObtained) || 0;
                const pass = mo >= exam.passingMarks;
                const grace = exam.passingMarks - 0.05 * exam.totalMarks;
                const result = pass ? 'PASS' : 'FAIL';
                const resultColor = pass ? '#15803d' : (mo >= grace ? '#a16207' : '#be123c');

                // Trigger Automatic Email Notification
                triggerAutomaticNotification({
                    eventType: 'examResult',
                    studentId: student._id,
                    message: `Result announced for ${exam.name}: ${mo}/${exam.totalMarks} (${result})`,
                    data: {
                        examName: exam.name,
                        examDate: exam.date ? new Date(exam.date).toLocaleDateString('en-IN') : 'TBD',
                        score: mo,
                        totalMarks: exam.totalMarks,
                        passStatus: result
                    }
                });

                logNotificationEvent({
                    recipientEmail: student.email,
                    recipientName: student.name,
                    subject: `Result Announced: ${exam.name} — ${result}`,
                    type: 'exam_result_published',
                    data: {
                        examName: exam.name,
                        subject: exam.subject,
                        marksObtained: mo,
                        totalMarks: exam.totalMarks,
                        passingMarks: exam.passingMarks,
                        result,
                        resultColor
                    }
                }).catch(() => console.error('[ExamNotificationLog] result_announced logging failed'));
            }
        });

        res.json({ message: `Marks saved for ${marks.length} students.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/:id/analytics — test-level stats
exports.getExamAnalytics = async (req, res) => {
    try {
        const examId = req.params.id;
        const exam = await Exam.findById(examId).populate('batchId', 'name').lean();
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const results = await ExamResult.find({ examId }).lean();
        if (results.length === 0) {
            return res.json({
                exam,
                avgScore: 0,
                highestScore: 0,
                lowestScore: 0,
                appeared: 0,
                absent: 0
            });
        }

        const presentResults = results.filter(r => r.isPresent);
        const scores = presentResults.map(r => r.marksObtained);

        const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const high = scores.length ? Math.max(...scores) : 0;
        const low = scores.length ? Math.min(...scores) : 0;

        res.json({
            exam,
            avgScore: parseFloat(avg.toFixed(2)),
            highestScore: high,
            lowestScore: low,
            appeared: presentResults.length,
            absent: results.length - presentResults.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/student/:id/performance — student-level deep dive
exports.getStudentPerformance = async (req, res) => {
    try {
        const studentId = req.params.id;
        const results = await ExamResult.find({ studentId })
            .populate('examId')
            .sort({ 'examId.date': 1 })
            .lean();

        if (results.length === 0) {
            return res.json({ history: [], stats: {}, chapters: {}, suggestion: 'No test data available.' });
        }

        // 1. History & Basic Stats
        const history = results.map(r => ({
            testName: r.examId.name,
            subject: r.examId.subject,
            chapter: r.examId.chapter,
            date: r.examId.date,
            marks: r.marksObtained,
            maxMarks: r.examId.totalMarks,
            percentage: (r.marksObtained / r.examId.totalMarks) * 100,
            isPresent: r.isPresent
        }));

        const presentTests = history.filter(h => h.isPresent);
        const percentages = presentTests.map(h => h.percentage);

        const avg = percentages.length ? (percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;
        const best = percentages.length ? Math.max(...percentages) : 0;
        const worst = percentages.length ? Math.min(...percentages) : 0;

        // 2. Improvement Tracker (compare last 2 available results)
        let improvement = 0;
        if (presentTests.length >= 2) {
            const current = presentTests[presentTests.length - 1].percentage;
            const last = presentTests[presentTests.length - 2].percentage;
            improvement = parseFloat((current - last).toFixed(2));
        }

        // 3. Chapter Analysis
        const chapterData = {};
        presentTests.forEach(t => {
            if (!chapterData[t.chapter]) chapterData[t.chapter] = { total: 0, count: 0 };
            chapterData[t.chapter].total += t.percentage;
            chapterData[t.chapter].count += 1;
        });

        const chapters = {};
        Object.keys(chapterData).forEach(ch => {
            const score = chapterData[ch].total / chapterData[ch].count;
            chapters[ch] = {
                score: parseFloat(score.toFixed(2)),
                status: score >= 75 ? 'Strong' : (score >= 50 ? 'Average' : 'Weak')
            };
        });

        // 4. Suggestions (Simple Logic)
        const weakChapters = Object.keys(chapters).filter(ch => chapters[ch].status === 'Weak');
        const suggestion = weakChapters.length > 0
            ? `You are weak in ${weakChapters.join(', ')}. Practice more questions and revise formulas.`
            : 'Your performance is stable. Continue consistent practice!';

        res.json({
            history,
            stats: {
                avgScore: parseFloat(avg.toFixed(2)),
                bestScore: parseFloat(best.toFixed(2)),
                lowestScore: parseFloat(worst.toFixed(2)),
                totalTests: history.length,
                improvement
            },
            chapters,
            suggestion
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/batch/:id/improvers — Leaderboard
exports.getBatchImprovers = async (req, res) => {
    try {
        const batchId = req.params.id;
        const students = await Student.find({ batchId, status: 'active' }).select('name').lean();

        const improvers = [];

        for (const student of students) {
            const results = await ExamResult.find({ studentId: student._id })
                .populate('examId')
                .sort({ 'examId.date': -1 })
                .limit(2)
                .lean();

            if (results.length === 2 && results[0].isPresent && results[1].isPresent) {
                const currentPerc = (results[0].marksObtained / results[0].examId.totalMarks) * 100;
                const lastPerc = (results[1].marksObtained / results[1].examId.totalMarks) * 100;
                const diff = parseFloat((currentPerc - lastPerc).toFixed(2));

                if (diff > 0) {
                    improvers.push({
                        name: student.name,
                        improvement: diff,
                        current: currentPerc.toFixed(1),
                        last: lastPerc.toFixed(1)
                    });
                }
            }
        }

        res.json({ improvers: improvers.sort((a, b) => b.improvement - a.improvement).slice(0, 10) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/batch/:id/top-scorers — Batch Merit List
exports.getBatchTopScorers = async (req, res) => {
    try {
        const batchId = req.params.id;
        const students = await Student.find({ batchId, status: 'active' }).select('name').lean();

        const scorers = [];

        for (const student of students) {
            const results = await ExamResult.find({ studentId: student._id, isPresent: true })
                .populate('examId')
                .lean();

            if (results.length > 0) {
                const totalPerc = results.reduce((sum, r) => {
                    const maxMarks = r.examId?.totalMarks || 100;
                    return sum + (r.marksObtained / maxMarks) * 100;
                }, 0);
                const avgPerc = totalPerc / results.length;

                scorers.push({
                    name: student.name,
                    avgScore: parseFloat(avgPerc.toFixed(2)),
                    testsTaken: results.length
                });
            }
        }

        res.json({ scorers: scorers.sort((a, b) => b.avgScore - a.avgScore).slice(0, 10) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


// GET /api/exams/export/history/:classLevel — Get complete marks history for a class level
exports.getClassMarksHistory = async (req, res) => {
    try {
        const { classLevel } = req.params;
        const normalizedClassLevel = String(classLevel || '').trim();

        if (!normalizedClassLevel) {
            return res.status(400).json({ message: 'Class level is required.' });
        }

        // 1. Find all exams for this class level
        const exams = await Exam.find({ classLevel: normalizedClassLevel })
            .sort({ date: 1 })
            .lean();

        if (exams.length === 0) {
            return res.json({ exams: [], students: [], results: [] });
        }

        const examIds = exams.map(e => e._id);

        // 2. Identify all batches linked to these exams
        const allBatchIds = new Set();
        for (const exam of exams) {
            const batchIds = await resolveExamLinkedBatchIds(exam);
            batchIds.forEach(id => allBatchIds.add(id));
        }

        // 3. Find all students in these batches
        const students = await Student.find({
            batchId: { $in: Array.from(allBatchIds) },
            status: 'active'
        })
        .select('name rollNo batchId')
        .populate('batchId', 'name')
        .sort({ name: 1 })
        .lean();

        // 4. Find all results for these exams
        const results = await ExamResult.find({
            examId: { $in: examIds }
        }).lean();

        res.json({
            exams,
            students,
            results
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
