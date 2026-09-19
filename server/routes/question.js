const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');

// GET /api/questions/meta - Get distinct topics and tags
router.get('/meta/filters', questionController.getFilterMeta);

// GET /api/questions - Get questions list with search & filter
router.get('/', questionController.getQuestions);

// GET /api/questions/:id - Get a specific question
router.get('/:id', questionController.getQuestionById);

module.exports = router;
