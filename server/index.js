/**
 * 1v1 Coding Arena - Main Server Entry Point
 * This file sets up Express, connects to MongoDB, and starts Socket.IO
 */
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch (e) {}

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const User = require('./models/User');
const Match = require('./models/Match');
const Question = require('./models/Question');

// Import routes
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/match');
const leaderboardRoutes = require('./routes/leaderboard');
const questionRoutes = require('./routes/question');
const practiceRoutes = require('./routes/practice');
const interviewRoutes = require('./routes/interview');
const companyRoutes = require('./routes/company');
const courseRoutes = require('./routes/course');
const dailyChallengeRoutes = require('./routes/dailyChallenge');
const { startDailyRotationSchedule } = require('./services/dailyChallengeService');
// const practicePlanRoutes = require('./routes/practicePlan'); // Archived 7-Day Plan feature

// Import socket handler
const socketHandler = require('./socket/socketHandler');

// Import error middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// ─── Multi-Origin CORS & Socket.IO Setup ─────────────────────────────────────
const rawOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/$/, ''))
  : ['http://localhost:3000'];

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Non-browser / health-check requests
  const normalized = origin.replace(/\/$/, '');
  return (
    rawOrigins.includes('*') ||
    rawOrigins.includes(normalized) ||
    normalized.endsWith('.vercel.app') ||
    normalized.endsWith('.onrender.com') ||
    normalized === 'http://localhost:3000' ||
    normalized === 'http://127.0.0.1:3000'
  );
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin blocked: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting to prevent abuse (relaxed in development/local)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/daily', dailyChallengeRoutes);
// app.use('/api/plan', practicePlanRoutes); // Archived 7-Day Plan route

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Socket.IO Events ─────────────────────────────────────────────────────────
socketHandler(io);

// ─── Auto Seed Helper ─────────────────────────────────────────────────────────
async function checkAndSeed() {
  try {
    const count = await Question.countDocuments();
    if (count === 0) {
      const unifiedPath = path.join(__dirname, 'data/unifiedQuestionBank.json');
      if (fs.existsSync(unifiedPath)) {
        console.log('🌱 No questions found in DB. Ingesting full unified question bank...');
        const raw = JSON.parse(fs.readFileSync(unifiedPath, 'utf8'));
        await Question.insertMany(raw, { ordered: false });
        console.log(`✅ Seeded ${raw.length} questions from unifiedQuestionBank.json!`);
      } else {
        console.log('🌱 No questions found in DB. Auto-seeding default questions...');
        const seed = require('./seed');
        await seed(false);
      }
    } else {
      console.log(`📚 Database ready with ${count} questions.`);
    }

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('👤 Seeding default test gladiators...');
      const u1 = await User.create({
        username: 'TestGladiator1',
        email: 'testgladiator1@arena.com',
        password: 'password123',
        rating: 1240,
        elo: 1240,
        stats: { wins: 5, losses: 1, draws: 0, totalMatches: 6 },
        streaks: { current: 3, longest: 5 },
        specialWins: { firstBlood: 2, comeback: 1 },
        badges: [
          { id: 'first_blood', name: 'First Blood', earnedAt: new Date() },
          { id: 'hot_streak', name: 'Hot Streak', earnedAt: new Date() },
          { id: 'gladiator', name: 'Gladiator', earnedAt: new Date() }
        ]
      });

      const u2 = await User.create({
        username: 'ApexCoder',
        email: 'apexcoder@arena.com',
        password: 'password123',
        rating: 1150,
        elo: 1150,
        stats: { wins: 3, losses: 3, draws: 0, totalMatches: 6 }
      });

      const q = await Question.findOne();
      if (q) {
        await Match.create({
          roomId: 'DUEL777',
          question: q._id,
          status: 'completed',
          players: [
            {
              userId: u1._id,
              username: u1.username,
              ratingAtMatch: 1215,
              ratingChange: 25,
              solved: true,
              linesOfCode: 14,
              executionTime: 42,
              memory: 14.2,
              lastCode: 'function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}'
            },
            {
              userId: u2._id,
              username: u2.username,
              ratingAtMatch: 1175,
              ratingChange: -25,
              solved: true,
              linesOfCode: 19,
              executionTime: 95,
              memory: 18.5,
              lastCode: 'function twoSum(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] + nums[j] === target) return [i, j];\n    }\n  }\n  return [];\n}'
            }
          ],
          winner: u1._id,
          winnerUsername: u1.username,
          startedAt: new Date(Date.now() - 120000),
          endedAt: new Date(),
          resultReason: 'correct_submission'
        });
        console.log('⚔️  Seeded sample completed match DUEL777');
      }
    }

    // Seed interview prep companies, questions, and courses
    try {
      const seedInterviewData = require('./seed_interview_data');
      await seedInterviewData();
    } catch (seedErr) {
      console.warn('Interview prep seed warning:', seedErr.message);
    }
  } catch (err) {
    console.warn('Auto-seed check warning:', err.message);
  }
}

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coding_arena';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log('✅ Connected to Primary MongoDB');
  } catch (error) {
    console.warn('⚠️ Primary MongoDB connection failed:', error.message);
    console.log('🔄 Fallback: Starting in-memory MongoDB server...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create({
        binary: { version: '6.0.14' }
      });
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('✅ In-memory MongoDB connected successfully');
    } catch (fallbackErr) {
      console.error('❌ MongoDB fallback failed:', fallbackErr.message);
      process.exit(1);
    }
  }
  await checkAndSeed();
};

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🎮 Socket.IO ready for connections`);
    startDailyRotationSchedule();
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});
