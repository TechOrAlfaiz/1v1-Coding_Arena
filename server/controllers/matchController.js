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

    // Determine match mode
    const allowedModes = ['coding', 'system_design', 'behavioral'];
    const matchMode = allowedModes.includes(req.body.mode) ? req.body.mode : 'coding';

    // Pick a question appropriate for the match mode
    let questionFilter = {};
    if (matchMode === 'coding') {
      questionFilter = { isPlayable: true, 'testCases.0': { $exists: true } };
    } else if (matchMode === 'system_design') {
      questionFilter = { category: 'system_design' };
    } else if (matchMode === 'behavioral') {
      questionFilter = { category: 'behavioral' };
    }

    let questionCount = await Question.countDocuments(questionFilter);
    if (questionCount === 0) {
      questionFilter = { 'testCases.0': { $exists: true } };
      questionCount = await Question.countDocuments(questionFilter);
    }
    if (questionCount === 0) {
      questionFilter = {};
      questionCount = await Question.countDocuments();
    }

    if (questionCount === 0) {
      return res.status(500).json({ error: 'No questions available. Please seed the database.' });
    }

    const randomSkip = Math.floor(Math.random() * questionCount);
    const question = await Question.findOne(questionFilter).skip(randomSkip);

    if (!question) {
      return res.status(500).json({ error: 'No questions available. Please seed the database.' });
    }

    // Create the match
    const userRating = req.userDoc?.rating || req.userDoc?.elo || 1000;

    const match = await Match.create({
      roomId,
      mode: matchMode,
      players: [
        {
          userId,
          username,
          ratingAtMatch: userRating,
          eloAtMatch: userRating,
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

      const userRating = req.userDoc?.rating || req.userDoc?.elo || 1000;
      // Add second player
      match.players.push({
        userId,
        username,
        ratingAtMatch: userRating,
        eloAtMatch: userRating,
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
 * GET /api/matches/active
 * Get currently active live matches for Spectator Mode
 */
exports.getActiveMatches = async (req, res) => {
  try {
    const matches = await Match.find({ status: 'active' })
      .populate('question', 'title difficulty tags')
      .sort({ startedAt: -1 })
      .limit(20);

    const formatted = matches.map((m) => ({
      roomId: m.roomId,
      question: m.question,
      players: m.players.map((p) => ({
        username: p.username,
        rating: p.ratingAtMatch || p.eloAtMatch || 1000,
        solved: p.solved,
      })),
      startedAt: m.startedAt,
      durationLimit: m.durationLimit,
    }));

    res.json({ matches: formatted });
  } catch (error) {
    console.error('Get active matches error:', error);
    res.status(500).json({ error: 'Failed to fetch active matches' });
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
        eloChange: myPlayer?.ratingChange ?? myPlayer?.eloChange ?? 0,
        ratingChange: myPlayer?.ratingChange ?? myPlayer?.eloChange ?? 0,
        eloAtMatch: myPlayer?.ratingAtMatch ?? myPlayer?.eloAtMatch ?? 1000,
        ratingAtMatch: myPlayer?.ratingAtMatch ?? myPlayer?.eloAtMatch ?? 1000,
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
 * Get specific match details (Approach Diff & Result)
 */
exports.getMatch = async (req, res) => {
  try {
    const match = await Match.findOne({ roomId: req.params.roomId })
      .populate('question')
      .populate('winner', 'username');

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchObj = match.toObject();

    // Security: never expose code while match is ongoing
    if (matchObj.status !== 'completed') {
      matchObj.players = matchObj.players.map((p) => ({
        ...p,
        lastCode: '',
      }));
    }

    res.json({ match: matchObj });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch match' });
  }
};

/**
 * GET /api/matches/:roomId/replay
 * Fetch post-match scrubbable timeline events
 */
exports.getMatchReplay = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { matchReplays } = require('../socket/socketHandler');
    const events = (matchReplays && matchReplays.get(roomId)) || [];
    const match = await Match.findOne({ roomId }).select('players question status mode endedAt startedAt winnerUsername transcript');
    res.json({ roomId, events, match });
  } catch (error) {
    console.error('getMatchReplay error:', error);
    res.status(500).json({ error: 'Failed to retrieve match replay' });
  }
};

/**
 * GET /api/matches/user/radar
 * Aggregate performance across lightweight categories from the last N matches
 */
exports.getUserRadar = async (req, res) => {
  try {
    const { userId } = req.user;
    const matches = await Match.find({
      'players.userId': userId,
      status: 'completed',
    })
      .populate('question')
      .sort({ endedAt: -1 })
      .limit(10);

    const categories = {
      'Arrays & Hashmaps': { passed: 0, total: 0 },
      'Recursion & Trees': { passed: 0, total: 0 },
      'Dynamic Prog': { passed: 0, total: 0 },
      'System Architecture': { passed: 0, total: 0 },
      'Communication Clarity': { passed: 0, total: 0 },
    };

    matches.forEach((m) => {
      const myPlayer = m.players.find((p) => p.userId.toString() === userId.toString());
      const isWinner = m.winner && m.winner.toString() === userId.toString();
      const solved = myPlayer?.solved || false;

      if (m.mode === 'system_design') {
        categories['System Architecture'].total += 1;
        if (isWinner || solved) categories['System Architecture'].passed += 1;
      } else if (m.mode === 'behavioral') {
        categories['Communication Clarity'].total += 1;
        if (isWinner || solved || (m.transcript && m.transcript.length > 0)) {
          categories['Communication Clarity'].passed += 1;
        }
      } else {
        const tags = (m.question?.tags || []).map((t) => t.toLowerCase());
        const title = (m.question?.title || '').toLowerCase();

        let assigned = false;
        if (tags.some((t) => t.includes('dp') || t.includes('dynamic')) || title.includes('subarray')) {
          categories['Dynamic Prog'].total += 1;
          if (isWinner || solved) categories['Dynamic Prog'].passed += 1;
          assigned = true;
        }
        if (tags.some((t) => t.includes('recursion') || t.includes('tree') || t.includes('parenthes')) || title.includes('parenthes')) {
          categories['Recursion & Trees'].total += 1;
          if (isWinner || solved) categories['Recursion & Trees'].passed += 1;
          assigned = true;
        }
        if (!assigned) {
          categories['Arrays & Hashmaps'].total += 1;
          if (isWinner || solved) categories['Arrays & Hashmaps'].passed += 1;
        }
      }
    });

    const radarData = Object.entries(categories).map(([category, stats]) => {
      const score = stats.total > 0 
        ? Math.round((stats.passed / stats.total) * 100)
        : 65; // Baseline calibration
      return {
        category,
        score,
        totalMatches: stats.total,
        passedMatches: stats.passed,
      };
    });

    res.json({ radarData, matchesAnalyzed: matches.length });
  } catch (error) {
    console.error('getUserRadar error:', error);
    res.status(500).json({ error: 'Failed to compute weak spot radar' });
  }
};
