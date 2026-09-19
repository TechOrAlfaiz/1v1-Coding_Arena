/**
 * Socket.IO Event Handler
 * Comprehensive real-time system handling:
 * - Matchmaking with dynamic ELO rating windows
 * - Dual code submissions with Judge0 metrics
 * - Post-match ELO, streaks, and achievement badge awards
 * - Live Spectator Mode (isolated room, progress telemetry, watcher counter, no code leakage)
 * - In-match Battle Power-Ups (Time Surge, Neural Peek, Deep Scan Hint)
 */

const Match = require('../models/Match');
const Question = require('../models/Question');
const User = require('../models/User');
const { runTestCases, executeCode } = require('../utils/judge0');
const { calculateElo, getKFactor, getRankTier, generateRoomId } = require('../utils/helpers');
const { evaluateMatchBadges } = require('../utils/badgeManager');
const jwt = require('jsonwebtoken');

// ─── In-Memory State ──────────────────────────────────────────────────────────
const activeTimers = new Map();     // roomId → intervalId
const matchTimeLeft = new Map();    // roomId → current seconds left
const matchQueue = [];              // Players in matchmaking: { userId, username, rating, socketId, joinedAt }
const socketToUser = new Map();     // socketId → { userId, username }
const roomSubmissions = new Map();  // roomId → Set of userIds who submitted correctly
const matchProgress = new Map();    // roomId → { [userId]: { attempts, hadFailures, passedCount, totalCount, lastSubmitAt } }
const spectatorRooms = new Map();   // roomId → Set of socketIds
const roomPowerups = new Map();     // roomId → { [userId]: { extra_time: 1, peek_progress: 1, hint_reveal: 1 } }
const matchReplays = new Map();     // roomId → [ { t, player, code, type, data } ]
const spectatorVotes = new Map();   // roomId → { [socketId]: 'player1' | 'player2' | 'both' | 'neither' }

// ─── ELO & Badges Update Helper (supports Per-Mode Elo) ──────────────────────
async function updateEloAndStats(winnerId, loserId, isDraw = false, matchContext = {}, mode = 'coding') {
  try {
    const winner = await User.findById(winnerId);
    const loser = await User.findById(loserId);

    if (!winner || !loser) return { winnerChange: 0, loserChange: 0, newBadges: [] };

    const modeKey = mode === 'system_design' ? 'systemDesign' : mode === 'behavioral' ? 'behavioral' : 'coding';

    const winnerRating = (winner.ratings && winner.ratings[modeKey]) || winner.rating || winner.elo || 1000;
    const loserRating = (loser.ratings && loser.ratings[modeKey]) || loser.rating || loser.elo || 1000;

    const winnerK = getKFactor(winner.stats?.totalMatches || 0);
    const loserK = getKFactor(loser.stats?.totalMatches || 0);

    let winnerResult, loserResult;
    if (isDraw) {
      winnerResult = 0.5;
      loserResult = 0.5;
    } else {
      winnerResult = 1;
      loserResult = 0;
    }

    const newWinnerRating = calculateElo(winnerRating, loserRating, winnerResult, winnerK);
    const newLoserRating = calculateElo(loserRating, winnerRating, loserResult, loserK);

    const winnerChange = newWinnerRating - winnerRating;
    const loserChange = newLoserRating - loserRating;

    let newBadges = [];

    if (isDraw) {
      // Draw updates
      await User.findByIdAndUpdate(winnerId, {
        rating: Math.round((winner.rating || 1000) + winnerChange / 2),
        elo: Math.round((winner.elo || 1000) + winnerChange / 2),
        [`ratings.${modeKey}`]: newWinnerRating,
        $inc: { 'stats.totalMatches': 1, 'stats.draws': 1 },
      });
      await User.findByIdAndUpdate(loserId, {
        rating: Math.round((loser.rating || 1000) + loserChange / 2),
        elo: Math.round((loser.elo || 1000) + loserChange / 2),
        [`ratings.${modeKey}`]: newLoserRating,
        $inc: { 'stats.totalMatches': 1, 'stats.draws': 1 },
      });
    } else {
      // Winner updates: streaks & badges
      const currentStreak = (winner.streaks?.current || 0) + 1;
      const longestStreak = Math.max(winner.streaks?.longest || 0, currentStreak);

      newBadges = evaluateMatchBadges(winner, matchContext);

      const winnerUpdate = {
        rating: (winner.rating || 1000) + winnerChange,
        elo: (winner.elo || 1000) + winnerChange,
        [`ratings.${modeKey}`]: newWinnerRating,
        'streaks.current': currentStreak,
        'streaks.longest': longestStreak,
        $inc: {
          'stats.totalMatches': 1,
          'stats.wins': 1,
          ...(matchContext.winnerAttempts === 1 && !matchContext.winnerHadFailures ? { 'specialWins.firstBlood': 1 } : {}),
          ...(matchContext.isComeback ? { 'specialWins.comeback': 1 } : {}),
        },
      };

      if (newBadges.length > 0) {
        winnerUpdate.$push = { badges: { $each: newBadges } };
      }

      await User.findByIdAndUpdate(winnerId, winnerUpdate);

      // Loser updates: streak reset
      await User.findByIdAndUpdate(loserId, {
        rating: Math.max(0, (loser.rating || 1000) + loserChange),
        elo: Math.max(0, (loser.elo || 1000) + loserChange),
        [`ratings.${modeKey}`]: newLoserRating,
        'streaks.current': 0,
        $inc: {
          'stats.totalMatches': 1,
          'stats.losses': 1,
        },
      });
    }

    return { winnerChange, loserChange, newBadges, newWinnerRating, newLoserRating, modeKey };
  } catch (error) {
    console.error('ELO & Badge update error:', error);
    return { winnerChange: 0, loserChange: 0, newBadges: [] };
  }
}

// ─── Timer Helper ─────────────────────────────────────────────────────────────
function startMatchTimer(io, roomId, durationSeconds = 900) {
  matchTimeLeft.set(roomId, durationSeconds);

  if (activeTimers.has(roomId)) {
    clearInterval(activeTimers.get(roomId));
  }

  const interval = setInterval(async () => {
    const currentLeft = matchTimeLeft.get(roomId) ?? durationSeconds;
    const nextLeft = currentLeft - 1;
    matchTimeLeft.set(roomId, nextLeft);

    // Broadcast to room and spectators
    io.to(roomId).emit('timer_sync', { timeLeft: nextLeft, roomId });
    io.to(`spectate_${roomId}`).emit('timer_sync', { timeLeft: nextLeft, roomId });

    if (nextLeft <= 0) {
      clearInterval(interval);
      activeTimers.delete(roomId);
      matchTimeLeft.delete(roomId);

      await handleTimeout(io, roomId);
    }
  }, 1000);

  activeTimers.set(roomId, interval);
}

// ─── Timeout Handler ──────────────────────────────────────────────────────────
async function handleTimeout(io, roomId) {
  try {
    const match = await Match.findOne({ roomId, status: 'active' });
    if (!match) return;

    const solvedPlayer = match.players.find((p) => p.solved);
    if (solvedPlayer) return;

    const [player1, player2] = match.players;
    let eloChanges = { winnerChange: 0, loserChange: 0 };

    if (player1 && player2) {
      eloChanges = await updateEloAndStats(player1.userId, player2.userId, true, {}, match.mode || 'coding');
      await Match.findOneAndUpdate(
        { roomId },
        {
          status: 'completed',
          endedAt: new Date(),
          resultReason: 'timeout',
          'players.0.eloChange': eloChanges.winnerChange,
          'players.0.ratingChange': eloChanges.winnerChange,
          'players.1.eloChange': eloChanges.loserChange,
          'players.1.ratingChange': eloChanges.loserChange,
        }
      );
    }

    const payload = {
      roomId,
      result: 'draw',
      reason: 'timeout',
      message: "Time's up! It's a draw.",
      eloChanges: {
        [player1?.username]: eloChanges.winnerChange,
        [player2?.username]: eloChanges.loserChange,
      },
      ratingChanges: {
        [player1?.username]: eloChanges.winnerChange,
        [player2?.username]: eloChanges.loserChange,
      },
    };

    io.to(roomId).emit('match_result', payload);
    io.to(`spectate_${roomId}`).emit('match_result', payload);

    // Feature 3: Interviewer Swap Round after match ends
    if ((match.mode || 'coding') === 'coding') {
      const swapPayload = {
        roomId,
        interviewer: player1 ? player1.username : 'Gladiator 1',
        candidate: player2 ? player2.username : 'Gladiator 2',
        phase: 'interviewer_swap',
        suggestedQuestions: [
          "What bottleneck prevented passing all test cases before time expired?",
          "What was your algorithmic strategy for handling input constraints?",
          "How would you revise your approach given 5 additional minutes?"
        ]
      };
      io.to(roomId).emit('role_swap_started', swapPayload);
      io.to(`spectate_${roomId}`).emit('role_swap_started', swapPayload);
    }
  } catch (error) {
    console.error('Timeout handler error:', error);
  }
}

// ─── Matchmaking Engine with Dynamic Rating Window ────────────────────────────
let isMatchingQueue = false;

async function tryMatchQueue(io) {
  if (isMatchingQueue || matchQueue.length < 2) return;
  isMatchingQueue = true;

  try {
    // 1. Clean up any stale/disconnected sockets from the queue
    for (let i = matchQueue.length - 1; i >= 0; i--) {
      const p = matchQueue[i];
      const s = io.sockets.sockets.get(p.socketId);
      if (!s || !s.connected) {
        console.log(`🧹 Pruned disconnected socket ${p.socketId} (${p.username}) from matchQueue`);
        matchQueue.splice(i, 1);
      }
    }

    // 2. Iteratively pair eligible players
    while (matchQueue.length >= 2) {
      const now = Date.now();
      let bestPair = null;
      let minDiff = Infinity;

      for (let i = 0; i < matchQueue.length; i++) {
        for (let j = i + 1; j < matchQueue.length; j++) {
          const p1 = matchQueue[i];
          const p2 = matchQueue[j];

          // Prevent queueing against oneself (same user on multiple tabs/devices)
          if (p1.userId?.toString() === p2.userId?.toString()) continue;

          // Only pair players in the same interview mode
          if (p1.mode !== p2.mode) continue;

          const wait1 = now - p1.joinedAt;
          const wait2 = now - p2.joinedAt;

          const allowed1 = 150 + Math.floor(wait1 / 5000) * 100;
          const allowed2 = 150 + Math.floor(wait2 / 5000) * 100;
          const maxAllowed = Math.max(allowed1, allowed2);

          const ratingDiff = Math.abs(p1.rating - p2.rating);

          if (ratingDiff <= maxAllowed && ratingDiff < minDiff) {
            minDiff = ratingDiff;
            bestPair = { idx1: i, idx2: j, p1, p2 };
          }
        }
      }

      if (bestPair) {
        const { idx1, idx2, p1, p2 } = bestPair;
        // Splice higher index first so lower index remains valid
        matchQueue.splice(Math.max(idx1, idx2), 1);
        matchQueue.splice(Math.min(idx1, idx2), 1);

        await createRankedMatch(io, p1, p2);
      } else {
        break; // No eligible pairs found in this pass
      }
    }
  } catch (err) {
    console.error('tryMatchQueue error:', err);
  } finally {
    isMatchingQueue = false;
  }
}

async function createRankedMatch(io, player1, player2) {
  try {
    const roomId = generateRoomId();
    const matchMode = player1.mode || 'coding';

    let questionFilter = {};
    if (matchMode === 'coding') {
      // Pick curated questions with test cases for coding duels
      questionFilter = { isPlayable: true, 'testCases.0': { $exists: true } };
    } else if (matchMode === 'system_design') {
      questionFilter = { category: 'system_design' };
    } else if (matchMode === 'behavioral') {
      questionFilter = { category: 'behavioral' };
    }

    let questionCount = await Question.countDocuments(questionFilter);
    // Fallback if no questions found under specific mode filter
    if (questionCount === 0) {
      questionFilter = { 'testCases.0': { $exists: true } };
      questionCount = await Question.countDocuments(questionFilter);
    }
    if (questionCount === 0) {
      questionFilter = {};
      questionCount = await Question.countDocuments();
    }

    const randomSkip = Math.floor(Math.random() * questionCount);
    const question = await Question.findOne(questionFilter).skip(randomSkip);

    if (!question) {
      io.to(player1.socketId).emit('queue_error', { message: 'No questions available' });
      io.to(player2.socketId).emit('queue_error', { message: 'No questions available' });
      return;
    }

    await Match.create({
      roomId,
      mode: matchMode,
      players: [
        {
          userId: player1.userId,
          username: player1.username,
          socketId: player1.socketId,
          ratingAtMatch: player1.rating,
          eloAtMatch: player1.rating,
        },
        {
          userId: player2.userId,
          username: player2.username,
          socketId: player2.socketId,
          ratingAtMatch: player2.rating,
          eloAtMatch: player2.rating,
        },
      ],
      question: question._id,
      status: 'waiting',
      type: 'ranked',
    });

    io.to(player1.socketId).emit('match_found', {
      roomId,
      mode: matchMode,
      opponent: player2.username,
      opponentRating: player2.rating,
      opponentTier: getRankTier(player2.rating),
    });
    io.to(player2.socketId).emit('match_found', {
      roomId,
      mode: matchMode,
      opponent: player1.username,
      opponentRating: player1.rating,
      opponentTier: getRankTier(player1.rating),
    });

    console.log(`🎮 Ranked match created: ${player1.username} (${player1.rating}) vs ${player2.username} (${player2.rating}) in room ${roomId} [${matchMode}] (Question: "${question.title}")`);
  } catch (err) {
    console.error('createRankedMatch error:', err);
  }
}

// ─── Main Socket Handler ──────────────────────────────────────────────────────
module.exports = (io) => {
  // Recurring background check for queue window expansion
  setInterval(() => {
    if (matchQueue.length >= 2) {
      tryMatchQueue(io);
    }
  }, 2500);

  // Authentication middleware with preloaded user data to prevent race conditions
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      socket.userId = decoded.userId;

      // Preload user so socketToUser is guaranteed ready before connection listeners execute
      const user = await User.findById(decoded.userId).select('username rating elo');
      if (user) {
        socketToUser.set(socket.id, {
          userId: decoded.userId.toString(),
          username: user.username,
          rating: user.rating || user.elo || 1000,
        });
      }
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const cachedUser = socketToUser.get(socket.id);
    console.log(`🔌 Socket connected: ${socket.id} (user: ${cachedUser?.username || socket.userId})`);

    // ─── Event: join_room ──────────────────────────────────────────────────
    socket.on('join_room', async ({ roomId }) => {
      try {
        const userInfo = socketToUser.get(socket.id);
        if (!userInfo) return;

        // Leave any previous non-self rooms
        const currentRooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
        currentRooms.forEach((r) => socket.leave(r));

        socket.join(roomId);
        console.log(`👤 ${userInfo.username} joined room ${roomId}`);

        await Match.findOneAndUpdate(
          { roomId, 'players.userId': userInfo.userId },
          { $set: { 'players.$.socketId': socket.id } }
        );

        const match = await Match.findOne({ roomId }).populate('question');
        if (!match) {
          socket.emit('error_event', { message: 'Room not found' });
          return;
        }

        io.to(roomId).emit('room_update', {
          roomId,
          playerCount: match.players.length,
          players: match.players.map((p) => ({
            username: p.username,
            rating: p.ratingAtMatch || p.eloAtMatch || 1000,
          })),
          status: match.status,
        });

        // Initialize progress tracker for room
        if (!matchProgress.has(roomId)) {
          matchProgress.set(roomId, {});
        }
        const prog = matchProgress.get(roomId);
        match.players.forEach((p) => {
          const uid = p.userId?.toString();
          if (uid && !prog[uid]) {
            prog[uid] = { attempts: 0, hadFailures: false, passedCount: 0, totalCount: match.question?.testCases?.length || 0 };
          }
        });

        // Start match atomically if waiting and 2 players present
        const activatedMatch = await Match.findOneAndUpdate(
          { roomId, status: 'waiting', 'players.1': { $exists: true } },
          { status: 'active', startedAt: new Date() },
          { new: true }
        ).populate('question');

        if (activatedMatch && activatedMatch.question) {
          const questionData = {
            _id: activatedMatch.question._id,
            title: activatedMatch.question.title,
            description: activatedMatch.question.description,
            difficulty: activatedMatch.question.difficulty,
            examples: activatedMatch.question.examples,
            starterCode: activatedMatch.question.starterCode,
            tags: activatedMatch.question.tags,
            testCases: (activatedMatch.question.testCases || []).map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
            })),
          };

          io.to(roomId).emit('start_match', {
            roomId,
            mode: activatedMatch.mode || 'coding',
            question: questionData,
            players: activatedMatch.players.map((p) => ({
              username: p.username,
              rating: p.ratingAtMatch || p.eloAtMatch || 1000,
            })),
            duration: activatedMatch.durationLimit,
          });

          startMatchTimer(io, roomId, activatedMatch.durationLimit);
          console.log(`🎮 Match started in room ${roomId} (Mode: ${activatedMatch.mode || 'coding'})`);
        } else if (match.status === 'active' || (activatedMatch && activatedMatch.status === 'active')) {
          const currentMatch = activatedMatch || match;
          const questionData = {
            _id: currentMatch.question?._id,
            title: currentMatch.question?.title,
            description: currentMatch.question?.description,
            difficulty: currentMatch.question?.difficulty,
            examples: currentMatch.question?.examples,
            starterCode: currentMatch.question?.starterCode,
            tags: currentMatch.question?.tags,
            testCases: (currentMatch.question?.testCases || []).map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
            })),
          };

          const remainingTime = matchTimeLeft.get(roomId) ?? currentMatch.durationLimit ?? 900;

          socket.emit('start_match', {
            roomId,
            mode: currentMatch.mode || 'coding',
            question: questionData,
            players: currentMatch.players.map((p) => ({
              username: p.username,
              rating: p.ratingAtMatch || p.eloAtMatch || 1000,
            })),
            duration: remainingTime,
          });
        }
      } catch (error) {
        console.error('join_room error:', error);
        socket.emit('error_event', { message: 'Failed to join room' });
      }
    });

    // ─── Event: leave_room ────────────────────────────────────────────────
    socket.on('leave_room', async ({ roomId }) => {
      try {
        if (!roomId) return;
        const userInfo = socketToUser.get(socket.id);
        socket.leave(roomId);
        if (userInfo) {
          socket.to(roomId).emit('opponent_disconnected', { username: userInfo.username, reason: 'left' });
        }
      } catch (err) {
        console.error('leave_room error:', err);
      }
    });

    // ─── Event: code_submit ────────────────────────────────────────────────
    socket.on('code_submit', async ({ roomId, code, language }) => {
      try {
        const userInfo = socketToUser.get(socket.id);
        if (!userInfo) return;

        const { userId, username } = userInfo;

        const match = await Match.findOne({ roomId, status: 'active' }).populate('question');
        if (!match) {
          socket.emit('submission_result', { error: 'Match not found or already ended' });
          return;
        }

        if (!roomSubmissions.has(roomId)) {
          roomSubmissions.set(roomId, new Set());
        }

        const submitted = roomSubmissions.get(roomId);
        if (submitted.has(userId)) {
          socket.emit('submission_result', { error: 'You already submitted a correct solution' });
          return;
        }

        // Notify room and spectators of submission in progress
        io.to(roomId).emit('player_submitting', { username });
        io.to(`spectate_${roomId}`).emit('player_submitting', { username });

        socket.emit('submission_result', { status: 'judging', message: 'Running your code against test cases...' });

        // Run against all test cases via Judge0
        const { results, allPassed } = await runTestCases(
          code,
          language,
          match.question.testCases
        );

        const passedCount = results.filter((r) => r.passed).length;
        const totalCount = results.length;
        const linesOfCode = (code || '').split('\n').length;

        let maxTime = 0;
        let maxMemory = 0;
        results.forEach((r) => {
          const t = Math.round(parseFloat(r.time || 0) * 1000);
          if (t > maxTime) maxTime = t;
          const m = Math.round(parseFloat(r.memory || 0));
          if (m > maxMemory) maxMemory = m;
        });

        // Update progress state for comeback/first blood & telemetry
        if (!matchProgress.has(roomId)) matchProgress.set(roomId, {});
        const roomProg = matchProgress.get(roomId);
        if (!roomProg[userId]) roomProg[userId] = { attempts: 0, hadFailures: false, passedCount: 0, totalCount };
        roomProg[userId].attempts += 1;
        roomProg[userId].passedCount = passedCount;
        roomProg[userId].totalCount = totalCount;
        if (!allPassed) roomProg[userId].hadFailures = true;

        // Broadcast sanitized test progress to spectators (NO CODE LEAKAGE)
        io.to(`spectate_${roomId}`).emit('spectate:update', {
          username,
          passedTests: passedCount,
          totalTests: totalCount,
          solved: allPassed,
        });

        // Save player submission data in Match record
        await Match.findOneAndUpdate(
          { roomId, 'players.userId': userId },
          {
            $set: {
              'players.$.lastCode': code,
              'players.$.language': language,
              'players.$.solved': allPassed,
              'players.$.linesOfCode': linesOfCode,
              'players.$.executionTime': maxTime,
              'players.$.memory': maxMemory,
              'players.$.passedTests': passedCount,
              'players.$.totalTests': totalCount,
              ...(allPassed ? { 'players.$.solvedAt': new Date() } : {}),
            },
          }
        );

        if (allPassed) {
          // ✅ CORRECT SUBMISSION — Victory!
          submitted.add(userId);

          // Stop active match timer
          if (activeTimers.has(roomId)) {
            clearInterval(activeTimers.get(roomId));
            activeTimers.delete(roomId);
            matchTimeLeft.delete(roomId);
          }

          const opponent = match.players.find((p) => p.userId.toString() !== userId);
          const opponentId = opponent?.userId?.toString();

          // Evaluate Comeback & First Blood conditions
          const isComeback = roomProg[userId]?.hadFailures || (opponentId && (roomProg[opponentId]?.passedCount || 0) > 0);
          const matchContext = {
            winnerAttempts: roomProg[userId]?.attempts || 1,
            winnerHadFailures: roomProg[userId]?.hadFailures || false,
            isComeback,
          };

          let eloChanges = {};
          let newBadges = [];

          if (opponentId) {
            const resultStats = await updateEloAndStats(userId, opponentId, false, matchContext, match.mode || 'coding');
            eloChanges[username] = resultStats.winnerChange;
            eloChanges[opponent.username] = resultStats.loserChange;
            newBadges = resultStats.newBadges || [];

            const winnerIdx = match.players.findIndex((p) => p.userId.toString() === userId);
            const loserIdx = 1 - winnerIdx;

            const updateObj = {
              status: 'completed',
              winner: userId,
              winnerUsername: username,
              endedAt: new Date(),
              resultReason: 'correct_submission',
            };
            updateObj[`players.${winnerIdx}.eloChange`] = resultStats.winnerChange;
            updateObj[`players.${winnerIdx}.ratingChange`] = resultStats.winnerChange;
            updateObj[`players.${loserIdx}.eloChange`] = resultStats.loserChange;
            updateObj[`players.${loserIdx}.ratingChange`] = resultStats.loserChange;

            await Match.findOneAndUpdate({ roomId }, { $set: updateObj });
          }

          socket.emit('submission_result', {
            passed: true,
            results,
            isWinner: true,
            newBadges,
          });

          // Record key submission event for Post-Match Replay
          if (!matchReplays.has(roomId)) matchReplays.set(roomId, []);
          matchReplays.get(roomId).push({
            t: Date.now(),
            player: username,
            type: 'submission_win',
            data: { passedCount, totalCount, allPassed: true },
          });

          // Broadcast match outcome
          const matchResultPayload = {
            roomId,
            result: 'winner',
            winner: username,
            losers: opponent ? [opponent.username] : [],
            reason: 'correct_submission',
            eloChanges,
            ratingChanges: eloChanges,
            newBadges,
            diffAvailable: true,
          };

          io.to(roomId).emit('match_result', matchResultPayload);
          io.to(`spectate_${roomId}`).emit('match_result', matchResultPayload);

          // Feature 3: Interviewer Swap Round after match completes
          if ((match.mode || 'coding') === 'coding') {
            const swapPayload = {
              roomId,
              interviewer: username,
              candidate: opponent ? opponent.username : 'Opponent',
              phase: 'interviewer_swap',
              suggestedQuestions: [
                "What is the asymptotic time & space complexity of your solution?",
                "How would you handle extreme edge cases or integer overflow?",
                "Could this algorithm be optimized to use O(1) auxiliary space?",
                "What data structure trade-offs did you evaluate before writing code?"
              ]
            };
            io.to(roomId).emit('role_swap_started', swapPayload);
            io.to(`spectate_${roomId}`).emit('role_swap_started', swapPayload);
          }

          console.log(`🏆 ${username} won in room ${roomId}! (Mode: ${match.mode || 'coding'})`);
        } else {
          // ❌ WRONG ANSWER
          socket.emit('submission_result', {
            passed: false,
            results,
            message: `${passedCount}/${totalCount} test cases passed`,
          });

          socket.to(roomId).emit('opponent_wrong_answer', {
            username,
            passedTests: passedCount,
            totalTests: totalCount,
          });
        }
      } catch (error) {
        console.error('code_submit error:', error);
        socket.emit('submission_result', {
          error: error.message || 'Code execution failed. Check your Judge0 configuration.',
        });
      }
    });

    // ─── Event: run_code ──────────────────────────────────────────────────
    socket.on('run_code', async ({ roomId, code, language, customInput }) => {
      try {
        const result = await executeCode(code, language, customInput || '');
        socket.emit('run_result', {
          stdout: result.stdout,
          stderr: result.stderr,
          status: result.status?.description,
          time: result.time,
          memory: result.memory,
        });
      } catch (error) {
        socket.emit('run_result', {
          stderr: error.message || 'Execution failed',
          stdout: '',
          status: 'Error',
        });
      }
    });

    // ─── Event: typing_indicator ──────────────────────────────────────────
    socket.on('typing_indicator', ({ roomId, isTyping }) => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;
      socket.to(roomId).emit('opponent_typing', {
        username: userInfo.username,
        isTyping,
      });
    });

    // ─── Event: join_queue (Ranked Matchmaking with Mode Separation) ─────
    socket.on('join_queue', async (data = {}) => {
      let userInfo = socketToUser.get(socket.id);
      if (!userInfo && socket.userId) {
        const u = await User.findById(socket.userId).select('username rating elo');
        if (u) {
          userInfo = {
            userId: socket.userId.toString(),
            username: u.username,
            rating: u.rating || u.elo || 1000,
          };
          socketToUser.set(socket.id, userInfo);
        }
      }
      if (!userInfo) {
        socket.emit('queue_error', { message: 'User session not found. Please log in again.' });
        return;
      }

      const queueMode = ['coding', 'system_design', 'behavioral'].includes(data?.mode) ? data.mode : 'coding';
      const userDoc = await User.findById(userInfo.userId).select('rating elo');
      const rating = userDoc?.rating || userDoc?.elo || 1000;

      // Clean up previous occurrences of this user in queue
      const existingIdx = matchQueue.findIndex((p) => p.userId?.toString() === userInfo.userId?.toString());
      if (existingIdx !== -1) matchQueue.splice(existingIdx, 1);

      matchQueue.push({
        userId: userInfo.userId.toString(),
        username: userInfo.username,
        rating,
        mode: queueMode,
        socketId: socket.id,
        joinedAt: Date.now(),
      });

      socket.emit('queue_joined', {
        position: matchQueue.filter((p) => p.mode === queueMode).length,
        rating,
        mode: queueMode,
        window: 150,
      });

      console.log(`🔍 ${userInfo.username} (${rating} rating, mode: ${queueMode}) joined matchmaking queue (${matchQueue.length} total)`);

      await tryMatchQueue(io);
    });

    // ─── Event: leave_queue ───────────────────────────────────────────────
    socket.on('leave_queue', () => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;
      const idx = matchQueue.findIndex((p) => p.userId?.toString() === userInfo.userId?.toString());
      if (idx !== -1) matchQueue.splice(idx, 1);
      socket.emit('queue_left');
    });

    // ─── Feature 2: Battle Power-Ups ───────────────────────────────────────
    socket.on('powerup:use', async ({ roomId, powerupId }) => {
      try {
        const userInfo = socketToUser.get(socket.id);
        if (!userInfo) return;
        const { userId, username } = userInfo;

        const match = await Match.findOne({ roomId, status: 'active' }).populate('question');
        if (!match) {
          socket.emit('powerup:error', { message: 'Match is not active' });
          return;
        }

        const isPlayer = match.players.some((p) => p.userId.toString() === userId);
        if (!isPlayer) {
          socket.emit('powerup:error', { message: 'Only active gladiators can use power-ups' });
          return;
        }

        // Initialize inventory (1 use cap per power-up per duel)
        if (!roomPowerups.has(roomId)) roomPowerups.set(roomId, {});
        const roomPUs = roomPowerups.get(roomId);
        if (!roomPUs[userId]) {
          roomPUs[userId] = {
            extra_time: 1,
            peek_progress: 1,
            hint_reveal: 1,
          };
        }

        const userPUs = roomPUs[userId];
        if (!userPUs[powerupId] || userPUs[powerupId] <= 0) {
          socket.emit('powerup:error', { message: `Power-up '${powerupId}' already used in this duel!` });
          return;
        }

        // Consume usage
        userPUs[powerupId] -= 1;

        if (powerupId === 'extra_time') {
          // Extra Time (+30s to match countdown timer)
          const current = matchTimeLeft.get(roomId) || 300;
          const updatedTime = current + 30;
          matchTimeLeft.set(roomId, updatedTime);

          io.to(roomId).emit('timer_sync', { timeLeft: updatedTime, roomId });
          io.to(`spectate_${roomId}`).emit('timer_sync', { timeLeft: updatedTime, roomId });

          io.to(roomId).emit('powerup:effect', {
            powerupId: 'extra_time',
            username,
            addedSeconds: 30,
            remainingUses: userPUs,
            message: `${username} activated Time Surge (+30s)!`,
          });
        } else if (powerupId === 'peek_progress') {
          // Peek Opponent Progress (reveals test case pass count for 5s ONLY to requester, NO raw code!)
          const opponent = match.players.find((p) => p.userId.toString() !== userId);
          const oppId = opponent?.userId?.toString();
          const oppProg = (oppId && matchProgress.get(roomId)?.[oppId]) || {
            passedCount: 0,
            totalCount: match.question?.testCases?.length || 0,
          };

          socket.emit('powerup:effect', {
            powerupId: 'peek_progress',
            username,
            opponentName: opponent?.username || 'Opponent',
            passedCount: oppProg.passedCount || 0,
            totalCount: oppProg.totalCount || match.question?.testCases?.length || 0,
            duration: 5,
            remainingUses: userPUs,
          });

          socket.to(roomId).emit('opponent_powerup_used', {
            username,
            powerupId: 'peek_progress',
            message: `${username} activated Neural Peek!`,
          });
        } else if (powerupId === 'hint_reveal') {
          // Hint Reveal (reveals 1 hidden test case input & output ONLY to requester)
          const testCases = match.question?.testCases || [];
          const sample = testCases.length > 1 ? testCases[1] : testCases[0] || { input: 'N/A', expectedOutput: 'N/A' };

          socket.emit('powerup:effect', {
            powerupId: 'hint_reveal',
            username,
            hint: {
              input: sample.input,
              expectedOutput: sample.expectedOutput,
            },
            remainingUses: userPUs,
          });

          socket.to(roomId).emit('opponent_powerup_used', {
            username,
            powerupId: 'hint_reveal',
            message: `${username} activated Deep Scan Hint!`,
          });
        }
      } catch (err) {
        console.error('powerup:use error:', err);
        socket.emit('powerup:error', { message: 'Failed to activate power-up' });
      }
    });

    // ─── Feature 3: Live Spectator Mode ───────────────────────────────────
    socket.on('spectate:join', async ({ roomId }) => {
      try {
        const userInfo = socketToUser.get(socket.id);
        if (!userInfo) return;

        const match = await Match.findOne({ roomId }).populate('question');
        if (!match) {
          socket.emit('spectate:error', { message: 'Match room not found' });
          return;
        }

        const spectateRoom = `spectate_${roomId}`;
        socket.join(spectateRoom);

        if (!spectatorRooms.has(roomId)) {
          spectatorRooms.set(roomId, new Set());
        }
        spectatorRooms.get(roomId).add(socket.id);

        const count = spectatorRooms.get(roomId).size;

        const questionData = {
          _id: match.question?._id,
          title: match.question?.title,
          description: match.question?.description,
          difficulty: match.question?.difficulty,
          examples: match.question?.examples,
          tags: match.question?.tags,
        };

        const roomProg = matchProgress.get(roomId) || {};
        const playersData = match.players.map((p) => {
          const uid = p.userId?.toString();
          return {
            username: p.username,
            rating: p.ratingAtMatch || p.eloAtMatch || 1000,
            tier: getRankTier(p.ratingAtMatch || p.eloAtMatch || 1000),
            solved: p.solved,
            passedTests: roomProg[uid]?.passedCount || p.passedTests || 0,
            totalTests: roomProg[uid]?.totalCount || p.totalTests || match.question?.testCases?.length || 0,
          };
        });

        const timeLeft = matchTimeLeft.get(roomId) ?? match.durationLimit ?? 900;

        socket.emit('spectate:init', {
          roomId,
          mode: match.mode || 'coding',
          question: questionData,
          players: playersData,
          timeLeft,
          status: match.status,
          spectatorCount: count,
        });

        // Broadcast updated spectator count to both gladiators & spectators
        io.to(roomId).emit('spectate:count', { roomId, count });
        io.to(spectateRoom).emit('spectate:count', { roomId, count });

        console.log(`👀 ${userInfo.username} spectating room ${roomId} (Total: ${count})`);
      } catch (err) {
        console.error('spectate:join error:', err);
        socket.emit('spectate:error', { message: 'Failed to join as spectator' });
      }
    });

    socket.on('spectate:leave', ({ roomId }) => {
      const spectateRoom = `spectate_${roomId}`;
      socket.leave(spectateRoom);

      if (spectatorRooms.has(roomId)) {
        spectatorRooms.get(roomId).delete(socket.id);
        const count = spectatorRooms.get(roomId).size;
        io.to(roomId).emit('spectate:count', { roomId, count });
        io.to(spectateRoom).emit('spectate:count', { roomId, count });
      }
    });

    // ─── Feature 3: Interviewer Swap Round ────────────────────────────────
    socket.on('role_swap:send_question', async ({ roomId, question }) => {
      try {
        const userInfo = socketToUser.get(socket.id);
        if (!userInfo) return;

        const entry = {
          sender: userInfo.username,
          role: 'interviewer',
          text: question,
          timestamp: new Date(),
        };

        await Match.findOneAndUpdate({ roomId }, { $push: { transcript: entry } });

        io.to(roomId).emit('role_swap:question_received', entry);
        io.to(`spectate_${roomId}`).emit('role_swap:question_received', entry);
      } catch (err) {
        console.error('role_swap:send_question error:', err);
      }
    });

    socket.on('role_swap:send_answer', async ({ roomId, answer }) => {
      try {
        const userInfo = socketToUser.get(socket.id);
        if (!userInfo) return;

        const entry = {
          sender: userInfo.username,
          role: 'candidate',
          text: answer,
          timestamp: new Date(),
        };

        await Match.findOneAndUpdate({ roomId }, { $push: { transcript: entry } });

        io.to(roomId).emit('role_swap:answer_received', entry);
        io.to(`spectate_${roomId}`).emit('role_swap:answer_received', entry);
      } catch (err) {
        console.error('role_swap:send_answer error:', err);
      }
    });

    socket.on('role_swap:finish', async ({ roomId }) => {
      try {
        const match = await Match.findOne({ roomId }).select('transcript');
        io.to(roomId).emit('role_swap_concluded', { roomId, transcript: match?.transcript || [] });
        io.to(`spectate_${roomId}`).emit('role_swap_concluded', { roomId, transcript: match?.transcript || [] });
      } catch (err) {
        console.error('role_swap:finish error:', err);
      }
    });

    // ─── Feature 4: Post-Match Replay Recording ───────────────────────────
    socket.on('replay:snapshot', ({ roomId, code, language, timestamp }) => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;
      if (!matchReplays.has(roomId)) matchReplays.set(roomId, []);
      matchReplays.get(roomId).push({
        t: timestamp || Date.now(),
        player: userInfo.username,
        code: code || '',
        language: language || 'javascript',
        type: 'editor_snapshot',
      });
    });

    socket.on('replay:get', ({ roomId }, callback) => {
      const events = matchReplays.get(roomId) || [];
      if (typeof callback === 'function') {
        callback({ roomId, events });
      } else {
        socket.emit('replay:data', { roomId, events });
      }
    });

    // ─── Feature 7: Spectator "Who'd You Hire" Vote ───────────────────────
    socket.on('spectator:vote', ({ roomId, voteCandidate }) => {
      if (!spectatorVotes.has(roomId)) spectatorVotes.set(roomId, {});
      const roomVotes = spectatorVotes.get(roomId);
      roomVotes[socket.id] = voteCandidate;

      const tally = { player1: 0, player2: 0, both: 0, neither: 0 };
      Object.values(roomVotes).forEach((v) => {
        if (tally[v] !== undefined) tally[v] += 1;
      });

      const totalVotes = Object.keys(roomVotes).length;
      io.to(roomId).emit('spectator:vote_update', { roomId, tally, totalVotes });
      io.to(`spectate_${roomId}`).emit('spectator:vote_update', { roomId, tally, totalVotes });
    });

    // ─── System Design Canvas Sync ────────────────────────────────────────
    socket.on('canvas:sync', ({ roomId, nodes, edges }) => {
      const userInfo = socketToUser.get(socket.id);
      socket.to(roomId).emit('canvas:update', {
        sender: userInfo?.username,
        nodes,
        edges,
      });
      socket.to(`spectate_${roomId}`).emit('canvas:update', {
        sender: userInfo?.username,
        nodes,
        edges,
      });
    });

    // ─── Behavioral STAR Q&A Sync ─────────────────────────────────────────
    socket.on('behavioral:send_message', ({ roomId, message, category }) => {
      const userInfo = socketToUser.get(socket.id);
      const payload = {
        sender: userInfo?.username || 'Gladiator',
        message,
        category,
        timestamp: new Date(),
      };
      io.to(roomId).emit('behavioral:message_received', payload);
      io.to(`spectate_${roomId}`).emit('behavioral:message_received', payload);
    });

    // ─── Event: disconnecting ─────────────────────────────────────────────
    socket.on('disconnecting', () => {
      const userInfo = socketToUser.get(socket.id);
      if (userInfo) {
        const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
        for (const roomId of rooms) {
          socket.to(roomId).emit('opponent_disconnected', { username: userInfo.username });
        }
      }
    });

    // ─── Event: disconnect ────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const userInfo = socketToUser.get(socket.id);
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      // Clean up spectator presence
      for (const [rId, specSet] of spectatorRooms.entries()) {
        if (specSet.has(socket.id)) {
          specSet.delete(socket.id);
          const count = specSet.size;
          io.to(rId).emit('spectate:count', { roomId: rId, count });
          io.to(`spectate_${rId}`).emit('spectate:count', { roomId: rId, count });
        }
      }

      if (userInfo) {
        const queueIdx = matchQueue.findIndex((p) => p.userId === userInfo.userId);
        if (queueIdx !== -1) matchQueue.splice(queueIdx, 1);

        socketToUser.delete(socket.id);
      }
    });
  });
};

module.exports.matchReplays = matchReplays;
module.exports.spectatorVotes = spectatorVotes;
