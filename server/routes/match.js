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

// GET /api/matches/active (Live spectator matches)
router.get('/active', matchController.getActiveMatches);

// GET /api/matches/user/radar (Weak Spot Radar Data)
router.get('/user/radar', matchController.getUserRadar);

// GET /api/matches/:roomId/replay (Post-Match Replay Timeline)
router.get('/:roomId/replay', matchController.getMatchReplay);

// GET /api/matches/:roomId
router.get('/:roomId', matchController.getMatch);

module.exports = router;
