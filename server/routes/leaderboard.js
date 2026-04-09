const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

// GET /api/leaderboard
router.get('/', leaderboardController.getLeaderboard);

// GET /api/leaderboard/rank/:userId
router.get('/rank/:userId', leaderboardController.getUserRank);

module.exports = router;
