const DailyChallenge = require('../models/DailyChallenge');
const Question = require('../models/Question');

/**
 * Returns formatted YYYY-MM-DD date string (UTC)
 */
function getUtcDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Returns yesterday's YYYY-MM-DD date string relative to a given date string
 */
function getYesterdayDateString(todayStr) {
  const d = new Date(todayStr + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Pick a question with difficulty weighting:
 * 45% Easy, 45% Medium, 10% Hard
 */
async function selectRandomDailyQuestion(excludeQuestionId = null) {
  const roll = Math.random();
  let preferredDifficulty = 'medium';
  if (roll < 0.45) {
    preferredDifficulty = 'easy';
  } else if (roll < 0.90) {
    preferredDifficulty = 'medium';
  } else {
    preferredDifficulty = 'hard';
  }

  // 1. Try weighted difficulty with playable & testCases
  const query = {
    category: 'coding',
    isPlayable: true,
    difficulty: preferredDifficulty,
  };
  if (excludeQuestionId) {
    query._id = { $ne: excludeQuestionId };
  }

  let count = await Question.countDocuments(query);

  // Fallback 1: Any playable coding question
  if (count === 0) {
    delete query.difficulty;
    count = await Question.countDocuments(query);
  }

  // Fallback 2: Any question with test cases
  if (count === 0) {
    delete query.isPlayable;
    query['testCases.0'] = { $exists: true };
    count = await Question.countDocuments(query);
  }

  // Fallback 3: Any coding question at all
  if (count === 0) {
    delete query['testCases.0'];
    count = await Question.countDocuments({ category: 'coding' });
    if (count === 0) {
      // Last resort: any question in DB
      count = await Question.countDocuments({});
    }
  }

  if (count === 0) {
    return null;
  }

  const randomSkip = Math.floor(Math.random() * count);
  const question = await Question.findOne(query).skip(randomSkip);
  return question;
}

/**
 * Rotate or generate today's challenge
 */
async function rotateDailyChallenge() {
  const todayStr = getUtcDateString();

  // Check if today already has a challenge
  let challenge = await DailyChallenge.findOne({ date: todayStr }).populate('questionId');
  if (challenge && challenge.questionId) {
    return challenge;
  }

  // Get previous challenge to avoid immediate repeat
  const previousChallenge = await DailyChallenge.findOne().sort({ createdAt: -1 });
  const excludeId = previousChallenge ? previousChallenge.questionId : null;

  const question = await selectRandomDailyQuestion(excludeId);
  if (!question) {
    throw new Error('No questions available in question bank to set as Daily Challenge');
  }

  // Calculate exact midnight UTC of the next day (00:00:00.000 UTC)
  const now = new Date();
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

  challenge = await DailyChallenge.findOneAndUpdate(
    { date: todayStr },
    {
      questionId: question._id,
      date: todayStr,
      resetsAt,
      difficulty: question.difficulty,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('questionId');

  console.log(`🌟 Daily Challenge set for ${todayStr}: "${question.title}" (${question.difficulty.toUpperCase()})`);
  return challenge;
}

/**
 * Get or create today's daily challenge
 */
async function getTodayChallenge() {
  const todayStr = getUtcDateString();
  let challenge = await DailyChallenge.findOne({ date: todayStr }).populate('questionId');

  if (!challenge || !challenge.questionId || challenge.resetsAt <= new Date()) {
    challenge = await rotateDailyChallenge();
  }

  return challenge;
}

/**
 * Background timer to check challenge expiration every 30 minutes
 */
let rotationTimer = null;
function startDailyRotationSchedule() {
  if (rotationTimer) return;

  // Run on startup
  getTodayChallenge().catch((err) => console.warn('Initial daily challenge startup check:', err.message));

  // Check every 30 minutes
  rotationTimer = setInterval(async () => {
    try {
      const todayStr = getUtcDateString();
      const current = await DailyChallenge.findOne({ date: todayStr });
      if (!current || current.resetsAt <= new Date()) {
        await rotateDailyChallenge();
      }
    } catch (err) {
      console.error('Scheduled daily challenge rotation error:', err.message);
    }
  }, 30 * 60 * 1000);
}

module.exports = {
  getUtcDateString,
  getYesterdayDateString,
  getTodayChallenge,
  rotateDailyChallenge,
  startDailyRotationSchedule,
};
