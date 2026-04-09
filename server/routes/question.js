const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const authMiddleware = require('../middleware/auth');

// GET /api/questions - Get all questions (titles only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const questions = await Question.find().select('title difficulty tags');
    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// GET /api/questions/:id - Get a specific question
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).select('-testCases');
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json({ question });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

module.exports = router;
