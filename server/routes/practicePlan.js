const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const practicePlanController = require('../controllers/practicePlanController');

router.use(authMiddleware);

// GET /api/plan - Get or generate current 7-day adaptive practice plan
router.get('/', practicePlanController.getActivePlan);

// POST /api/plan/task/complete - Mark task as completed
router.post('/task/complete', practicePlanController.completeTask);

module.exports = router;
