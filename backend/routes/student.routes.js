const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/student.controller');
const upload = require('../middleware/upload');

router.get('/', ctrl.getAllStudents);
router.get('/stats', ctrl.getStudentStats);
router.get('/export', ctrl.exportStudents);
router.get('/batches', ctrl.getBatches);
router.post('/', upload.single('profileImage'), ctrl.createStudent);
router.post('/bulk', ctrl.bulkUpload);
router.delete('/delete-all', ctrl.deleteAllStudents);
router.put('/:id', upload.single('profileImage'), ctrl.updateStudent);
router.delete('/:id', ctrl.deleteStudent);

module.exports = router;
