const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const authMiddleware = require('../middleware/auth');

// All match routes require authentication
router.use(authMiddleware);

// POST /api/matches/create
router.post('/create', matchController.createRoom);

// POST /api/matches/join/:roomId
router.post('/join/:roomId', matchController.joinRoom);

// GET /api/matches/history
router.get('/history', matchController.getMatchHistory);

// GET /api/matches/:roomId
router.get('/:roomId', matchController.getMatch);

module.exports = router;
