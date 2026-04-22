const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/exam.controller');
const { adminAuth } = require('../middleware/auth.middleware');
const { CACHE_PREFIXES, cacheJsonResponse } = require('../middleware/responseCache');

// All routes require admin auth
router.use(adminAuth);

router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.exams, ttlSeconds: 30 }), ctrl.getAllExams);
router.post('/', ctrl.createExam);
router.put('/:id', ctrl.updateExam);
router.delete('/:id', ctrl.deleteExam);

router.get('/:id/students', cacheJsonResponse({ prefix: CACHE_PREFIXES.exams, ttlSeconds: 20 }), ctrl.getExamStudents);
router.get('/:id/results', cacheJsonResponse({ prefix: CACHE_PREFIXES.exams, ttlSeconds: 20 }), ctrl.getExamResults);
router.post('/:id/results', ctrl.saveMarks);

// Analytics & Performance
router.get('/:id/analytics', cacheJsonResponse({ prefix: CACHE_PREFIXES.exams, ttlSeconds: 30 }), ctrl.getExamAnalytics);
router.get('/student/:id/performance', cacheJsonResponse({ prefix: CACHE_PREFIXES.exams, ttlSeconds: 30 }), ctrl.getStudentPerformance);
router.get('/batch/:id/improvers', cacheJsonResponse({ prefix: CACHE_PREFIXES.exams, ttlSeconds: 30 }), ctrl.getBatchImprovers);
router.get('/batch/:id/top-scorers', cacheJsonResponse({ prefix: CACHE_PREFIXES.exams, ttlSeconds: 30 }), ctrl.getBatchTopScorers);
router.get('/export/history/:classLevel', cacheJsonResponse({ prefix: CACHE_PREFIXES.exams, ttlSeconds: 30 }), ctrl.getClassMarksHistory);


module.exports = router;
