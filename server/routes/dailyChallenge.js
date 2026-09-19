const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const dailyController = require('../controllers/dailyChallengeController');
const authMiddleware = require('../middleware/auth');

/**
 * Optional auth middleware: extracts user if token provided, but doesn't block if absent
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      req.user = { userId: decoded.userId };
    }
  } catch (_) {
    // Ignore invalid/expired tokens for optional auth
  }
  next();
};

// GET /api/daily/today - Fetch today's challenge question and user streak
router.get('/today', optionalAuth, dailyController.getToday);

// POST /api/daily/run - Test run custom code test cases
router.post('/run', optionalAuth, dailyController.runCode);

// POST /api/daily/submit - Submit daily challenge solution (requires auth)
router.post('/submit', authMiddleware, dailyController.submitSolution);

// GET /api/daily/user-stats - Fetch user streak and monthly badges (requires auth)
router.get('/user-stats', authMiddleware, dailyController.getUserStats);

module.exports = router;
