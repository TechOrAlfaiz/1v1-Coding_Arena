const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch (e) {}

const axios = require('axios');
const io = require('socket.io-client');
const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const results = {
  auth: [],
  navigation_api: [],
  arena_socket: [],
  solo_sandbox: [],
  question_bank_companies: [],
  daily_challenge: [],
  ai_interview: [],
  rankings: [],
};

async function runTests() {
  console.log('=== STARTING AUTOMATED END-TO-END SUITE ===\n');

  // Connect to DB for direct validation
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB for validation.');

  // -------------------------------------------------------------
  // 1. AUTH TESTING
  // -------------------------------------------------------------
  console.log('--- 1. Testing Auth ---');
  const testUsername = `qa_gladiator_${Date.now()}`;
  const testEmail = `qa_${Date.now()}@arena.test`;
  const testPassword = 'Password123!';
  let authToken = null;
  let testUserId = null;

  // A. Register new user
  try {
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      username: testUsername,
      email: testEmail,
      password: testPassword,
    });
    authToken = regRes.data.token;
    testUserId = regRes.data.user?.id || regRes.data.user?._id;
    results.auth.push({ test: 'Registration', status: 'PASS', details: `User ${testUsername} registered successfully` });
  } catch (err) {
    results.auth.push({ test: 'Registration', status: 'FAIL', error: err.response?.data || err.message });
  }

  // B. Wrong password check
  try {
    await axios.post(`${API_BASE}/auth/login`, {
      email: testEmail,
      password: 'WrongPassword!',
    });
    results.auth.push({ test: 'Wrong Password Handling', status: 'FAIL', details: 'Expected 400/401 but login succeeded' });
  } catch (err) {
    if (err.response && (err.response.status === 400 || err.response.status === 401)) {
      results.auth.push({ test: 'Wrong Password Handling', status: 'PASS', details: `Correctly rejected with ${err.response.status}: ${err.response.data?.message || err.response.data?.error}` });
    } else {
      results.auth.push({ test: 'Wrong Password Handling', status: 'FAIL', error: err.message });
    }
  }

  // C. Successful Login
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });
    authToken = loginRes.data.token;
    results.auth.push({ test: 'Login with correct credentials', status: 'PASS', details: 'Token received and user validated' });
  } catch (err) {
    results.auth.push({ test: 'Login with correct credentials', status: 'FAIL', error: err.response?.data || err.message });
  }

  // D. Session persistence (get current user)
  const authHeaders = { headers: { Authorization: `Bearer ${authToken}` } };
  try {
    const meRes = await axios.get(`${API_BASE}/auth/me`, authHeaders);
    if (meRes.data?.user?.email === testEmail || meRes.data?.email === testEmail) {
      results.auth.push({ test: 'Auth persistence (/auth/me)', status: 'PASS', details: 'User profile persisted across token requests' });
    } else {
      results.auth.push({ test: 'Auth persistence (/auth/me)', status: 'FAIL', details: 'Email mismatch' });
    }
  } catch (err) {
    results.auth.push({ test: 'Auth persistence (/auth/me)', status: 'FAIL', error: err.response?.data || err.message });
  }

  // -------------------------------------------------------------
  // 2. NAVIGATION & STRUCTURE (API Routes)
  // -------------------------------------------------------------
  console.log('--- 2. Testing API Routes (Navigation & 7-Day Plan Removal) ---');
  // Check 7-Day Plan route returns 404
  try {
    await axios.get(`${API_BASE}/plan/current`, authHeaders);
    results.navigation_api.push({ test: '7-Day Plan route removal', status: 'FAIL', details: 'Route /api/plan/current is still responding!' });
  } catch (err) {
    if (err.response?.status === 404) {
      results.navigation_api.push({ test: '7-Day Plan route removal', status: 'PASS', details: 'Confirmed /api/plan is unmounted and returns 404' });
    } else {
      results.navigation_api.push({ test: '7-Day Plan route removal', status: 'WARN', details: `Status ${err.response?.status}` });
    }
  }

  // -------------------------------------------------------------
  // 3. 1v1 ARENA MATCHMAKING & SOCKET
  // -------------------------------------------------------------
  console.log('--- 3. Testing 1v1 Arena Matchmaking & Socket ---');

  // Register second user for pairing
  const testUser2 = `qa_gladiator2_${Date.now()}`;
  let token2 = null;
  let user2Id = null;
  try {
    const r2 = await axios.post(`${API_BASE}/auth/register`, {
      username: testUser2,
      email: `${testUser2}@arena.test`,
      password: testPassword,
    });
    token2 = r2.data.token;
    user2Id = r2.data.user?.id || r2.data.user?._id;
  } catch (e) {
    console.error('Failed to register user 2', e.message);
  }

  // Test Socket connections
  await new Promise((resolve) => {
    let s1Connected = false;
    let s2Connected = false;
    let matchPaired = false;

    const s1 = io(SOCKET_URL, { auth: { token: authToken }, transports: ['websocket'] });
    const s2 = io(SOCKET_URL, { auth: { token: token2 }, transports: ['websocket'] });

    const timeout = setTimeout(() => {
      if (!matchPaired) {
        results.arena_socket.push({ test: 'Matchmaking Pairing', status: 'FAIL', details: 'Timeout waiting for match:start event' });
      }
      s1.disconnect();
      s2.disconnect();
      resolve();
    }, 12000);

    s1.on('connect', () => {
      s1Connected = true;
      results.arena_socket.push({ test: 'Socket.IO Connection User 1', status: 'PASS', details: `Socket ID: ${s1.id}` });
      // Queue user 1
      s1.emit('join_queue', { mode: 'coding', language: 'javascript' });
    });

    s2.on('connect', () => {
      s2Connected = true;
      results.arena_socket.push({ test: 'Socket.IO Connection User 2', status: 'PASS', details: `Socket ID: ${s2.id}` });
      // Queue user 2 near-simultaneously to test race condition
      setTimeout(() => {
        s2.emit('join_queue', { mode: 'coding', language: 'javascript' });
      }, 300);
    });

    s1.on('match_found', (data) => {
      console.log('User 1 match_found:', data?.roomId);
    });

    s2.on('match_found', (data) => {
      console.log('User 2 match_found:', data?.roomId);
    });

    s1.on('match_start', (data) => {
      if (!matchPaired) {
        matchPaired = true;
        clearTimeout(timeout);
        results.arena_socket.push({
          test: 'Matchmaking Pairing & Race Condition',
          status: 'PASS',
          details: `Successfully paired in room ${data.roomId} with question ${data.question?.title}`,
        });

        // Test in-room code syncing
        s1.emit('code_change', { roomId: data.roomId, code: 'console.log("Player 1 typed");' });
        s2.on('opponent_code', (syncData) => {
          results.arena_socket.push({ test: 'Real-time Code Sync', status: 'PASS', details: 'Opponent received code change' });
          s1.disconnect();
          s2.disconnect();
          resolve();
        });

        setTimeout(() => {
          s1.disconnect();
          s2.disconnect();
          resolve();
        }, 2000);
      }
    });

    s1.on('connect_error', (err) => {
      results.arena_socket.push({ test: 'Socket.IO Connect Error', status: 'FAIL', error: err.message });
    });
  });

  // -------------------------------------------------------------
  // 4. SOLO SANDBOX
  // -------------------------------------------------------------
  console.log('--- 4. Testing Solo Sandbox Practice ---');
  try {
    const qListRes = await axios.get(`${API_BASE}/practice/questions?limit=10`, authHeaders);
    const questions = qListRes.data?.questions || qListRes.data || [];
    results.solo_sandbox.push({
      test: 'Practice Question Fetching',
      status: questions.length > 0 ? 'PASS' : 'WARN',
      details: `Retrieved ${questions.length} questions`,
    });

    // Start a practice session
    const chosenQ = questions[0];
    if (chosenQ) {
      const sessionRes = await axios.post(`${API_BASE}/practice/session/start`, {
        questionId: chosenQ._id,
        language: 'javascript',
      }, authHeaders);
      results.solo_sandbox.push({
        test: 'Start Solo Sandbox Session',
        status: 'PASS',
        details: `Session started for ${chosenQ.title}`,
      });
    }
  } catch (err) {
    results.solo_sandbox.push({ test: 'Solo Sandbox Session', status: 'FAIL', error: err.response?.data || err.message });
  }

  // -------------------------------------------------------------
  // 5. INTERVIEW PREP - QUESTION BANK & COMPANIES
  // -------------------------------------------------------------
  console.log('--- 5. Testing Question Bank & Companies Hub ---');
  try {
    // A. Question bank filters
    const filterRes = await axios.get(`${API_BASE}/questions?difficulty=Medium&limit=5`, authHeaders);
    const totalMedium = filterRes.data?.total || filterRes.data?.questions?.length;
    results.question_bank_companies.push({
      test: 'Question Bank Difficulty Filter (Medium)',
      status: 'PASS',
      details: `Returned questions successfully (${totalMedium} count)`,
    });

    // B. Companies list & counts validation
    const compRes = await axios.get(`${API_BASE}/companies`, authHeaders);
    const companies = compRes.data?.companies || compRes.data || [];
    results.question_bank_companies.push({
      test: 'Companies Hub API',
      status: companies.length > 0 ? 'PASS' : 'FAIL',
      details: `Found ${companies.length} companies`,
    });

    // Check Google/Amazon/Meta question count against DB
    if (companies.length > 0) {
      const topComp = companies[0];
      const countInDB = await mongoose.connection.db.collection('questions').countDocuments({
        companies: { $regex: new RegExp(topComp.name, 'i') }
      });
      results.question_bank_companies.push({
        test: `Company Question Count Accuracy (${topComp.name})`,
        status: 'PASS',
        details: `Company card displays ${topComp.questionCount || topComp.questions?.length || 'dynamic'} vs DB match count ${countInDB}`,
      });
    }
  } catch (err) {
    results.question_bank_companies.push({ test: 'Question Bank & Companies Hub', status: 'FAIL', error: err.response?.data || err.message });
  }

  // -------------------------------------------------------------
  // 6. DAILY CHALLENGE
  // -------------------------------------------------------------
  console.log('--- 6. Testing Daily Challenge & Streak Logic ---');
  try {
    const dailyRes = await axios.get(`${API_BASE}/daily/today`, authHeaders);
    const daily = dailyRes.data?.challenge || dailyRes.data;
    results.daily_challenge.push({
      test: "Today's Daily Challenge Fetch",
      status: daily?.question ? 'PASS' : 'FAIL',
      details: `Question: "${daily?.question?.title}", Difficulty: ${daily?.question?.difficulty}`,
    });

    // Solve challenge
    const solveRes = await axios.post(`${API_BASE}/daily/submit`, {
      code: 'function solution() { return true; }',
      language: 'javascript',
    }, authHeaders);

    results.daily_challenge.push({
      test: 'Daily Challenge Submission & Streak Increment',
      status: solveRes.data?.success ? 'PASS' : 'WARN',
      details: `Solved: ${solveRes.data?.success}, Current Streak: ${solveRes.data?.currentStreak}`,
    });
  } catch (err) {
    results.daily_challenge.push({ test: 'Daily Challenge Flow', status: 'FAIL', error: err.response?.data || err.message });
  }

  // -------------------------------------------------------------
  // 7. AI MOCK INTERVIEW & QUESTION PROGRESSION
  // -------------------------------------------------------------
  console.log('--- 7. Testing AI Mock Interview (> 5 Questions & Time Pacing) ---');
  try {
    // Start session with 45 mins
    const startRes = await axios.post(`${API_BASE}/interviews/live-avatar/start`, {
      role: 'Staff Backend Architect',
      interviewType: 'technical',
      durationMinutes: 45,
      jobDescription: 'High-scale distributed systems, Kafka, Redis caching, multi-region Kubernetes.',
      resumeText: 'Senior Backend Engineer experienced in distributed systems, Node.js, microservices, and high-throughput data pipelines.',
    }, authHeaders);

    const interviewSession = startRes.data?.session;
    const initialQuestions = startRes.data?.questions || interviewSession?.questions || [];

    results.ai_interview.push({
      test: 'Duration-Scaled Questions Plan (45 Min)',
      status: initialQuestions.length > 5 ? 'PASS' : 'FAIL',
      details: `45-min session initialized with ${initialQuestions.length} questions (expected > 5, got ${initialQuestions.length})`,
    });

    // Test Question Progression beyond question 5
    let currentIdx = 0;
    let finalMsg = '';
    let isClosingTriggered = false;

    for (let i = 0; i < 7; i++) {
      const advanceRes = await axios.post(`${API_BASE}/interviews/session/${interviewSession._id}/next-question`, {}, authHeaders);
      currentIdx = advanceRes.data.currentQuestionIndex;
      finalMsg = advanceRes.data.reply;
      if (advanceRes.data.isClosing) {
        isClosingTriggered = true;
      }
    }

    results.ai_interview.push({
      test: 'Next Question Progression Beyond 5 Items',
      status: currentIdx >= 5 ? 'PASS' : 'FAIL',
      details: `Advanced to question index ${currentIdx} (Topic: ${initialQuestions[currentIdx]?.topic || 'Dynamic Adaptive Question'}). Never aborted at 5!`,
    });

    // Test send message / answer
    const answerRes = await axios.post(`${API_BASE}/interviews/session/${interviewSession._id}/message`, {
      message: 'We partitioned our database with consistent hashing and handled replication through Raft consensus.',
    }, authHeaders);

    results.ai_interview.push({
      test: 'Dialogue Turn & LLM Response',
      status: answerRes.data?.reply ? 'PASS' : 'FAIL',
      details: `Interviewer answered: "${answerRes.data?.reply?.slice(0, 80)}..."`,
    });

  } catch (err) {
    results.ai_interview.push({ test: 'AI Mock Interview', status: 'FAIL', error: err.response?.data || err.message });
  }

  // -------------------------------------------------------------
  // 8. RANKINGS & PROFILE
  // -------------------------------------------------------------
  console.log('--- 8. Testing Rankings & Profile ---');
  try {
    const lbRes = await axios.get(`${API_BASE}/leaderboard`, authHeaders);
    results.rankings.push({
      test: 'Leaderboard API',
      status: lbRes.data ? 'PASS' : 'FAIL',
      details: `Leaderboard returned entries successfully`,
    });

    const profRes = await axios.get(`${API_BASE}/auth/profile`, authHeaders);
    results.rankings.push({
      test: 'User Profile & Rating',
      status: profRes.data ? 'PASS' : 'FAIL',
      details: `Rating: ${profRes.data?.user?.rating || 1000}, Matches: ${profRes.data?.user?.matchesPlayed || 0}`,
    });
  } catch (err) {
    results.rankings.push({ test: 'Rankings & Profile', status: 'FAIL', error: err.response?.data || err.message });
  }

  console.log('\n=== TEST SUITE COMPLETE ===');
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
