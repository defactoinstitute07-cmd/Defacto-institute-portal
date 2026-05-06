const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/student.controller');
const verifyPwd = require('../middleware/verifyAdminPassword');
const { CACHE_PREFIXES, cacheJsonResponse } = require('../middleware/responseCache');
const upload = require('../middleware/upload');

router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.students, ttlSeconds: 20 }), ctrl.getAllStudents);
router.get('/stats', cacheJsonResponse({ prefix: CACHE_PREFIXES.students, ttlSeconds: 30 }), ctrl.getStudentStats);
router.get('/activity', cacheJsonResponse({ prefix: CACHE_PREFIXES.students, ttlSeconds: 15 }), ctrl.getStudentActivity);
router.get('/export', ctrl.exportStudents);
router.get('/batches', cacheJsonResponse({ prefix: CACHE_PREFIXES.students, ttlSeconds: 30 }), ctrl.getBatches);
router.post('/register', upload.single('profileImage'), ctrl.registerStudent);
router.post('/', upload.single('profileImage'), ctrl.createStudent);
router.post('/bulk', ctrl.bulkUpload);
router.delete('/delete-all', verifyPwd, ctrl.deleteAllStudents);
router.put('/:id', upload.single('profileImage'), verifyPwd, ctrl.updateStudent);
router.get('/:id', cacheJsonResponse({ prefix: CACHE_PREFIXES.students, ttlSeconds: 20 }), ctrl.getStudentById);
router.delete('/:id', verifyPwd, ctrl.deleteStudent);

module.exports = router;
