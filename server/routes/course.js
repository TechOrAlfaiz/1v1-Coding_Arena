const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const courseController = require('../controllers/courseController');

router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourseById);
router.post('/quiz/submit', authMiddleware, courseController.submitQuiz);

module.exports = router;
