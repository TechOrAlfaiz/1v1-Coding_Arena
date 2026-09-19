/**
 * Practice Routes
 * Protected endpoints for solo interview practice mode.
 */

const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practiceController');
const authMiddleware = require('../middleware/auth');

// All practice endpoints require authentication
router.use(authMiddleware);

// GET /api/practice/filters
router.get('/filters', practiceController.getFilters);

// POST /api/practice/start
router.post('/start', practiceController.startSession);

// POST /api/practice/run
router.post('/run', practiceController.runCode);

// POST /api/practice/submit
router.post('/submit', practiceController.submitSession);

// GET /api/practice/history
router.get('/history', practiceController.getHistory);

module.exports = router;
