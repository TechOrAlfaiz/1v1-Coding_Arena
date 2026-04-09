/**
 * Match Controller
 * Handles room creation, joining, and match history
 */

const Match = require('../models/Match');
const Question = require('../models/Question');
const { generateRoomId } = require('../utils/helpers');

/**
 * POST /api/matches/create
 * Create a new room
 */
exports.createRoom = async (req, res) => {
  try {
    const { userId, username } = req.user;

    // Generate unique room ID
    let roomId;
    let isUnique = false;
    while (!isUnique) {
      roomId = generateRoomId();
      const existing = await Match.findOne({ roomId });
      if (!existing) isUnique = true;
    }

    // Pick a random question
    const questionCount = await Question.countDocuments();
    const randomSkip = Math.floor(Math.random() * questionCount);
    const question = await Question.findOne().skip(randomSkip);

    if (!question) {
      return res.status(500).json({ error: 'No questions available. Please seed the database.' });
    }

    // Create the match
    const match = await Match.create({
      roomId,
      players: [
        {
          userId,
          username,
          eloAtMatch: req.userDoc.elo,
        },
      ],
      question: question._id,
      status: 'waiting',
      type: 'room',
    });

    res.status(201).json({
      message: 'Room created!',
      roomId,
      matchId: match._id,
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

/**
 * POST /api/matches/join/:roomId
 * Join an existing room
 */
exports.joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, username } = req.user;

    const match = await Match.findOne({ roomId }).populate('question');

    if (!match) {
      return res.status(404).json({ error: 'Room not found. Check the Room ID.' });
    }

    if (match.status !== 'waiting') {
      return res.status(400).json({ error: 'This room is no longer available.' });
    }

    // Check if user is already in the room (rejoining)
    const alreadyIn = match.players.find((p) => p.userId.toString() === userId);

    if (!alreadyIn) {
      if (match.players.length >= 2) {
        return res.status(400).json({ error: 'Room is full.' });
      }

      // Add second player
      match.players.push({
        userId,
        username,
        eloAtMatch: req.userDoc.elo,
      });

      await match.save();
    }

    res.json({
      message: 'Joined room!',
      roomId,
      matchId: match._id,
      playerCount: match.players.length,
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

/**
 * GET /api/matches/history
 * Get match history for the logged-in user
 */
exports.getMatchHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const matches = await Match.find({
      'players.userId': userId,
      status: 'completed',
    })
      .populate('question', 'title difficulty')
      .sort({ endedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Match.countDocuments({
      'players.userId': userId,
      status: 'completed',
    });

    // Format for frontend
    const formatted = matches.map((match) => {
      const myPlayer = match.players.find((p) => p.userId.toString() === userId);
      const opponent = match.players.find((p) => p.userId.toString() !== userId);
      const didWin = match.winner && match.winner.toString() === userId;
      const isDraw = !match.winner && match.status === 'completed';

      return {
        id: match._id,
        roomId: match.roomId,
        question: match.question,
        opponent: opponent ? { username: opponent.username } : null,
        result: didWin ? 'win' : isDraw ? 'draw' : 'loss',
        eloChange: myPlayer?.eloChange || 0,
        eloAtMatch: myPlayer?.eloAtMatch || 0,
        endedAt: match.endedAt,
        duration: match.startedAt && match.endedAt
          ? Math.round((match.endedAt - match.startedAt) / 1000)
          : null,
        resultReason: match.resultReason,
      };
    });

    res.json({
      matches: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Match history error:', error);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
};

/**
 * GET /api/matches/:roomId
 * Get specific match details
 */
exports.getMatch = async (req, res) => {
  try {
    const match = await Match.findOne({ roomId: req.params.roomId })
      .populate('question')
      .populate('winner', 'username');

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ match });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
};
