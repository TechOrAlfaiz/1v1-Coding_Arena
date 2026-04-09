/**
 * Socket.IO Event Handler
 * This is the heart of the real-time system.
 * Handles all socket events: joining rooms, code submission, timer sync, matchmaking
 */

const Match = require('../models/Match');
const Question = require('../models/Question');
const User = require('../models/User');
const { runTestCases } = require('../utils/judge0');
const { calculateElo, getKFactor, generateRoomId } = require('../utils/helpers');
const jwt = require('jsonwebtoken');

// ─── In-Memory State ──────────────────────────────────────────────────────────
// These maps track active matches and timers in memory for fast access
const activeTimers = new Map();   // roomId → intervalId
const matchQueue = [];            // Players waiting for random matchmaking
const socketToUser = new Map();   // socketId → { userId, username }
const roomSubmissions = new Map(); // roomId → Set of userIds who submitted correctly

// ─── ELO Update Helper ────────────────────────────────────────────────────────
async function updateEloAndStats(winnerId, loserId, isDraw = false) {
  try {
    const winner = await User.findById(winnerId);
    const loser = await User.findById(loserId);

    if (!winner || !loser) return { winnerChange: 0, loserChange: 0 };

    const winnerK = getKFactor(winner.stats.totalMatches);
    const loserK = getKFactor(loser.stats.totalMatches);

    let winnerResult, loserResult;
    if (isDraw) {
      winnerResult = 0.5;
      loserResult = 0.5;
    } else {
      winnerResult = 1;
      loserResult = 0;
    }

    const newWinnerElo = calculateElo(winner.elo, loser.elo, winnerResult, winnerK);
    const newLoserElo = calculateElo(loser.elo, winner.elo, loserResult, loserK);

    const winnerChange = newWinnerElo - winner.elo;
    const loserChange = newLoserElo - loser.elo;

    // Update winner stats
    await User.findByIdAndUpdate(winnerId, {
      elo: newWinnerElo,
      $inc: {
        'stats.totalMatches': 1,
        'stats.wins': isDraw ? 0 : 1,
        'stats.draws': isDraw ? 1 : 0,
      },
    });

    // Update loser stats
    await User.findByIdAndUpdate(loserId, {
      elo: newLoserElo,
      $inc: {
        'stats.totalMatches': 1,
        'stats.losses': isDraw ? 0 : 1,
        'stats.draws': isDraw ? 1 : 0,
      },
    });

    return { winnerChange, loserChange };
  } catch (error) {
    console.error('ELO update error:', error);
    return { winnerChange: 0, loserChange: 0 };
  }
}

// ─── Timer Helper ─────────────────────────────────────────────────────────────
function startMatchTimer(io, roomId, durationSeconds = 900) {
  let timeLeft = durationSeconds;

  // Clear any existing timer for this room
  if (activeTimers.has(roomId)) {
    clearInterval(activeTimers.get(roomId));
  }

  const interval = setInterval(async () => {
    timeLeft -= 1;

    // Broadcast timer to everyone in the room
    io.to(roomId).emit('timer_sync', { timeLeft, roomId });

    if (timeLeft <= 0) {
      clearInterval(interval);
      activeTimers.delete(roomId);

      // Time's up — handle timeout
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

    // Find if anyone solved it
    const solvedPlayer = match.players.find((p) => p.solved);

    if (solvedPlayer) {
      // Someone already solved it (shouldn't happen but handle it)
      return;
    }

    // It's a draw — nobody solved it in time
    const [player1, player2] = match.players;

    let eloChanges = { winnerChange: 0, loserChange: 0 };
    if (player1 && player2) {
      eloChanges = await updateEloAndStats(player1.userId, player2.userId, true); // Draw
      // Update match record
      await Match.findOneAndUpdate(
        { roomId },
        {
          status: 'completed',
          endedAt: new Date(),
          resultReason: 'timeout',
          'players.0.eloChange': eloChanges.winnerChange,
          'players.1.eloChange': eloChanges.loserChange,
        }
      );
    }

    io.to(roomId).emit('match_result', {
      roomId,
      result: 'draw',
      reason: 'timeout',
      message: "Time's up! It's a draw.",
      eloChanges: {
        [player1?.username]: eloChanges.winnerChange,
        [player2?.username]: eloChanges.loserChange,
      },
    });
  } catch (error) {
    console.error('Timeout handler error:', error);
  }
}

// ─── Main Socket Handler ──────────────────────────────────────────────────────
module.exports = (io) => {
  // Middleware: Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Fetch username and store in map
    try {
      const user = await User.findById(socket.userId).select('username');
      if (user) {
        socketToUser.set(socket.id, { userId: socket.userId, username: user.username });
      }
    } catch (err) {
      console.error('Socket user fetch error:', err);
    }

    // ─── Event: join_room ──────────────────────────────────────────────────
    // Fired when a player enters a room (waiting or active)
    socket.on('join_room', async ({ roomId }) => {
      try {
        const userInfo = socketToUser.get(socket.id);
        if (!userInfo) return;

        // Leave any previous rooms
        const currentRooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
        currentRooms.forEach((r) => socket.leave(r));

        socket.join(roomId);
        console.log(`👤 ${userInfo.username} joined room ${roomId}`);

        // Update socket ID in match record
        await Match.findOneAndUpdate(
          { roomId, 'players.userId': userInfo.userId },
          { $set: { 'players.$.socketId': socket.id } }
        );

        const match = await Match.findOne({ roomId }).populate('question');
        if (!match) {
          socket.emit('error_event', { message: 'Room not found' });
          return;
        }

        // Tell everyone in the room how many players are here
        const socketsInRoom = await io.in(roomId).allSockets();
        io.to(roomId).emit('room_update', {
          roomId,
          playerCount: match.players.length,
          players: match.players.map((p) => ({ username: p.username })),
          status: match.status,
        });

        // If both players are in the room and match hasn't started → start it!
        if (match.players.length === 2 && match.status === 'waiting') {
          await Match.findOneAndUpdate({ roomId }, {
            status: 'active',
            startedAt: new Date(),
          });

          // Send the question to both players (without test cases)
          const questionData = {
            _id: match.question._id,
            title: match.question.title,
            description: match.question.description,
            difficulty: match.question.difficulty,
            examples: match.question.examples,
            starterCode: match.question.starterCode,
            tags: match.question.tags,
          };

          io.to(roomId).emit('start_match', {
            roomId,
            question: questionData,
            players: match.players.map((p) => ({ username: p.username })),
            duration: match.durationLimit,
          });

          // Start the countdown timer
          startMatchTimer(io, roomId, match.durationLimit);

          console.log(`🎮 Match started in room ${roomId}`);
        }
      } catch (error) {
        console.error('join_room error:', error);
        socket.emit('error_event', { message: 'Failed to join room' });
      }
    });

    // ─── Event: code_submit ────────────────────────────────────────────────
    // Fired when a player submits their code for judging
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

        // Prevent submission after match ended
        if (!roomSubmissions.has(roomId)) {
          roomSubmissions.set(roomId, new Set());
        }

        const submitted = roomSubmissions.get(roomId);
        if (submitted.has(userId)) {
          socket.emit('submission_result', { error: 'You already submitted a correct solution' });
          return;
        }

        // Tell both players that this player is being judged
        io.to(roomId).emit('player_submitting', { username });

        socket.emit('submission_result', { status: 'judging', message: 'Running your code against test cases...' });

        // Run against all test cases
        const { results, allPassed } = await runTestCases(
          code,
          language,
          match.question.testCases
        );

        // Update player's last code in match
        await Match.findOneAndUpdate(
          { roomId, 'players.userId': userId },
          {
            $set: {
              'players.$.lastCode': code,
              'players.$.language': language,
              'players.$.solved': allPassed,
              ...(allPassed ? { 'players.$.solvedAt': new Date() } : {}),
            },
          }
        );

        if (allPassed) {
          // ✅ CORRECT SUBMISSION — this player wins!
          submitted.add(userId);

          // Stop the timer
          if (activeTimers.has(roomId)) {
            clearInterval(activeTimers.get(roomId));
            activeTimers.delete(roomId);
          }

          // Find the opponent
          const opponent = match.players.find((p) => p.userId.toString() !== userId);
          const opponentId = opponent?.userId;

          // Calculate ELO changes
          let eloChanges = {};
          if (opponentId) {
            const changes = await updateEloAndStats(userId, opponentId, false);
            eloChanges[username] = changes.winnerChange;
            eloChanges[opponent.username] = changes.loserChange;

            // Update match record with ELO changes
            const winnerIdx = match.players.findIndex((p) => p.userId.toString() === userId);
            const loserIdx = 1 - winnerIdx;

            const updateObj = {
              status: 'completed',
              winner: userId,
              winnerUsername: username,
              endedAt: new Date(),
              resultReason: 'correct_submission',
            };
            updateObj[`players.${winnerIdx}.eloChange`] = changes.winnerChange;
            updateObj[`players.${loserIdx}.eloChange`] = changes.loserChange;

            await Match.findOneAndUpdate({ roomId }, { $set: updateObj });
          }

          // Send result to winner
          socket.emit('submission_result', {
            passed: true,
            results,
            isWinner: true,
          });

          // Broadcast match result to all in room
          io.to(roomId).emit('match_result', {
            roomId,
            result: 'winner',
            winner: username,
            losers: opponent ? [opponent.username] : [],
            reason: 'correct_submission',
            eloChanges,
          });

          console.log(`🏆 ${username} won in room ${roomId}!`);
        } else {
          // ❌ WRONG ANSWER
          const passedCount = results.filter((r) => r.passed).length;

          socket.emit('submission_result', {
            passed: false,
            results,
            message: `${passedCount}/${results.length} test cases passed`,
          });

          // Let opponent know the other player got a wrong answer
          socket.to(roomId).emit('opponent_wrong_answer', { username });
        }
      } catch (error) {
        console.error('code_submit error:', error);
        socket.emit('submission_result', {
          error: error.message || 'Code execution failed. Check your Judge0 API key.',
        });
      }
    });

    // ─── Event: run_code ──────────────────────────────────────────────────
    // "Run" button (not submit) — runs against example test cases only
    socket.on('run_code', async ({ roomId, code, language, customInput }) => {
      try {
        const { executeCode } = require('../utils/judge0');

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
    // Optional: Show opponent that you're typing
    socket.on('typing_indicator', ({ roomId, isTyping }) => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;
      socket.to(roomId).emit('opponent_typing', {
        username: userInfo.username,
        isTyping,
      });
    });

    // ─── Event: join_queue ────────────────────────────────────────────────
    // Random matchmaking queue
    socket.on('join_queue', async () => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;

      // Remove if already in queue
      const existingIdx = matchQueue.findIndex((p) => p.userId === userInfo.userId);
      if (existingIdx !== -1) matchQueue.splice(existingIdx, 1);

      matchQueue.push({ ...userInfo, socketId: socket.id, joinedAt: Date.now() });
      socket.emit('queue_joined', { position: matchQueue.length });

      console.log(`🔍 ${userInfo.username} joined matchmaking queue (${matchQueue.length} in queue)`);

      // If 2+ players in queue, match them
      if (matchQueue.length >= 2) {
        const player1 = matchQueue.shift();
        const player2 = matchQueue.shift();

        // Create a room for them
        const roomId = generateRoomId();

        // Get a random question
        const questionCount = await Question.countDocuments();
        const randomSkip = Math.floor(Math.random() * questionCount);
        const question = await Question.findOne().skip(randomSkip);

        if (!question) {
          io.to(player1.socketId).emit('queue_error', { message: 'No questions available' });
          io.to(player2.socketId).emit('queue_error', { message: 'No questions available' });
          return;
        }

        const p1User = await User.findById(player1.userId).select('elo');
        const p2User = await User.findById(player2.userId).select('elo');

        await Match.create({
          roomId,
          players: [
            { userId: player1.userId, username: player1.username, socketId: player1.socketId, eloAtMatch: p1User?.elo },
            { userId: player2.userId, username: player2.username, socketId: player2.socketId, eloAtMatch: p2User?.elo },
          ],
          question: question._id,
          status: 'active',
          startedAt: new Date(),
          type: 'ranked',
        });

        // Tell both players to go to the room
        io.to(player1.socketId).emit('match_found', { roomId, opponent: player2.username });
        io.to(player2.socketId).emit('match_found', { roomId, opponent: player1.username });

        console.log(`🎮 Ranked match created: ${player1.username} vs ${player2.username} in room ${roomId}`);
      }
    });

    // ─── Event: leave_queue ───────────────────────────────────────────────
    socket.on('leave_queue', () => {
      const userInfo = socketToUser.get(socket.id);
      if (!userInfo) return;
      const idx = matchQueue.findIndex((p) => p.userId === userInfo.userId);
      if (idx !== -1) matchQueue.splice(idx, 1);
      socket.emit('queue_left');
    });

    // ─── Event: disconnect ────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const userInfo = socketToUser.get(socket.id);
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      if (userInfo) {
        // Remove from matchmaking queue
        const queueIdx = matchQueue.findIndex((p) => p.userId === userInfo.userId);
        if (queueIdx !== -1) matchQueue.splice(queueIdx, 1);

        // Notify active match rooms about disconnection
        const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
        for (const roomId of rooms) {
          socket.to(roomId).emit('opponent_disconnected', { username: userInfo.username });
        }

        socketToUser.delete(socket.id);
      }
    });
  });
};
