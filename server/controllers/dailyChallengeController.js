const User = require('../models/User');
const dailyChallengeService = require('../services/dailyChallengeService');
const { executeCode, runTestCases } = require('../utils/judge0');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * GET /api/daily/today
 * Returns today's challenge question and the user's streak information
 */
exports.getToday = async (req, res) => {
  try {
    const challenge = await dailyChallengeService.getTodayChallenge();
    const q = challenge.questionId;

    if (!q) {
      return res.status(500).json({ error: 'Today\'s question could not be loaded' });
    }

    const now = new Date();
    const resetsAt = new Date(challenge.resetsAt);
    const msRemaining = Math.max(0, resetsAt.getTime() - now.getTime());
    const hoursRemaining = Math.round((msRemaining / (1000 * 60 * 60)) * 10) / 10;

    let userStats = {
      currentStreak: 0,
      longestStreak: 0,
      lastSolvedDate: null,
      solvedToday: false,
      streakAtRisk: false,
      monthlyBadges: [],
      solvedDates: [],
    };

    if (req.user && req.user.userId) {
      const user = await User.findById(req.user.userId).select('dailyChallenge');
      if (user && user.dailyChallenge) {
        const lastSolved = user.dailyChallenge.lastSolvedDate;
        const solvedToday = lastSolved === challenge.date;
        const streakAtRisk = !solvedToday && (user.dailyChallenge.currentStreak > 0) && hoursRemaining <= 4;

        userStats = {
          currentStreak: user.dailyChallenge.currentStreak || 0,
          longestStreak: user.dailyChallenge.longestStreak || 0,
          lastSolvedDate: lastSolved || null,
          solvedToday,
          streakAtRisk,
          monthlyBadges: user.dailyChallenge.monthlyBadges || [],
          solvedDates: user.dailyChallenge.solvedDates || [],
        };
      }
    }

    // Prepare clean question payload for editor
    const questionPayload = {
      _id: q._id,
      title: q.title,
      description: q.description,
      difficulty: q.difficulty,
      topic: q.topic || (q.topics && q.topics[0]) || 'Algorithms',
      topics: q.topics || q.tags || [],
      companies: q.companies || q.companyTags || [],
      examples: q.examples || [],
      constraints: q.constraints || [],
      starterCode: q.starterCode || `function solution(input) {\n  // Write your code here\n}`,
      hints: q.hints || [],
      idealSolveTime: q.idealSolveTime || 25,
      // Provide public test cases for preview
      testCases: (q.testCases || []).slice(0, 2),
    };

    res.json({
      success: true,
      challenge: {
        _id: challenge._id,
        date: challenge.date,
        resetsAt: challenge.resetsAt,
        msRemaining,
        hoursRemaining,
        difficulty: challenge.difficulty,
        totalSolves: challenge.totalSolves || 0,
        question: questionPayload,
      },
      userStats,
    });
  } catch (error) {
    console.error('Daily challenge getToday error:', error);
    res.status(500).json({ error: 'Failed to fetch daily challenge: ' + error.message });
  }
};

/**
 * POST /api/daily/run
 * Test code with custom input
 */
exports.runCode = async (req, res) => {
  try {
    const { code, language = 'javascript', customInput = '' } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }
    const result = await executeCode(code, language, customInput);
    res.json(result);
  } catch (error) {
    console.error('Daily challenge runCode error:', error);
    res.status(500).json({ error: 'Failed to execute custom code test' });
  }
};

/**
 * POST /api/daily/submit
 * Evaluates submitted code against test cases and updates user streaks & monthly badges
 */
exports.submitSolution = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code, language = 'javascript' } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Please write your solution before submitting.' });
    }

    const challenge = await dailyChallengeService.getTodayChallenge();
    const q = challenge.questionId;

    if (!q) {
      return res.status(500).json({ error: 'Challenge question not found' });
    }

    const testCases = q.testCases || [];
    let evalResult = { results: [], allPassed: false };

    if (testCases.length > 0) {
      evalResult = await runTestCases(code, language, testCases);
    } else {
      // If question has no test cases, run sample verification
      const sample = await executeCode(code, language, '');
      evalResult = {
        results: [{ passed: !sample.error, output: sample.output, error: sample.error }],
        allPassed: !sample.error,
      };
    }

    if (!evalResult.allPassed) {
      return res.json({
        success: false,
        allPassed: false,
        results: evalResult.results,
        message: 'Some test cases did not pass. Inspect test output and retry.',
      });
    }

    // All test cases passed! Update user streak & badges
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.dailyChallenge) {
      user.dailyChallenge = {
        lastSolvedDate: null,
        currentStreak: 0,
        longestStreak: 0,
        solvedDates: [],
        monthlyBadges: [],
      };
    }

    const todayStr = challenge.date;
    const yesterdayStr = dailyChallengeService.getYesterdayDateString(todayStr);

    let alreadySolvedToday = false;
    let previousStreak = user.dailyChallenge.currentStreak || 0;

    if (user.dailyChallenge.lastSolvedDate === todayStr) {
      alreadySolvedToday = true;
    } else if (user.dailyChallenge.lastSolvedDate === yesterdayStr) {
      // Consecutive day -> increment streak
      user.dailyChallenge.currentStreak = previousStreak + 1;
    } else {
      // First time or missed day(s) -> reset streak to 1
      user.dailyChallenge.currentStreak = 1;
    }

    user.dailyChallenge.longestStreak = Math.max(
      user.dailyChallenge.longestStreak || 0,
      user.dailyChallenge.currentStreak
    );

    user.dailyChallenge.lastSolvedDate = todayStr;

    if (!Array.isArray(user.dailyChallenge.solvedDates)) {
      user.dailyChallenge.solvedDates = [];
    }

    if (!user.dailyChallenge.solvedDates.includes(todayStr)) {
      user.dailyChallenge.solvedDates.push(todayStr);
      challenge.totalSolves = (challenge.totalSolves || 0) + 1;
      await challenge.save();
    }

    // Monthly Badge check
    // "at the end of each month (or checked daily), if a user solved the daily challenge every single day that month, award a badge record for that month/year (e.g. { month: "September", year: 2026, type: "perfect-streak" })"
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonthIdx = now.getUTCMonth();
    const currentMonthName = MONTH_NAMES[currentMonthIdx];
    const dayOfMonth = now.getUTCDate();
    const lastDayOfMonth = new Date(currentYear, currentMonthIdx + 1, 0).getUTCDate();

    // Count days solved in this month
    let monthSolvesCount = 0;
    for (let d = 1; d <= dayOfMonth; d++) {
      const dPad = String(d).padStart(2, '0');
      const mPad = String(currentMonthIdx + 1).padStart(2, '0');
      const dateKey = `${currentYear}-${mPad}-${dPad}`;
      if (user.dailyChallenge.solvedDates.includes(dateKey)) {
        monthSolvesCount++;
      }
    }

    let newBadgeAwarded = null;
    const alreadyHasBadge = (user.dailyChallenge.monthlyBadges || []).some(
      (b) => b.month === currentMonthName && b.year === currentYear
    );

    // Perfect streak through entire month or all days up to today (with at least 5 days solved)
    const isPerfectMonth = (dayOfMonth === lastDayOfMonth && monthSolvesCount === lastDayOfMonth) ||
                           (dayOfMonth >= 5 && monthSolvesCount === dayOfMonth);

    if (!alreadyHasBadge && isPerfectMonth) {
      newBadgeAwarded = {
        month: currentMonthName,
        year: currentYear,
        type: 'perfect-streak',
        earnedAt: new Date(),
      };
      if (!Array.isArray(user.dailyChallenge.monthlyBadges)) {
        user.dailyChallenge.monthlyBadges = [];
      }
      user.dailyChallenge.monthlyBadges.push(newBadgeAwarded);
    }

    // Award +50 XP
    user.xp = (user.xp || 0) + 50;

    await user.save();

    res.json({
      success: true,
      allPassed: true,
      alreadySolvedToday,
      currentStreak: user.dailyChallenge.currentStreak,
      longestStreak: user.dailyChallenge.longestStreak,
      lastSolvedDate: user.dailyChallenge.lastSolvedDate,
      solvedDates: user.dailyChallenge.solvedDates,
      badgeAwarded: newBadgeAwarded,
      results: evalResult.results,
      xpGained: 50,
    });
  } catch (error) {
    console.error('Daily challenge submitSolution error:', error);
    res.status(500).json({ error: 'Failed to evaluate daily challenge: ' + error.message });
  }
};

/**
 * GET /api/daily/user-stats
 * Returns user's streak history, current streak, longest streak, and badges
 */
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('dailyChallenge username xp');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const todayStr = dailyChallengeService.getUtcDateString();
    const dc = user.dailyChallenge || {};
    const solvedToday = dc.lastSolvedDate === todayStr;

    res.json({
      success: true,
      currentStreak: dc.currentStreak || 0,
      longestStreak: dc.longestStreak || 0,
      lastSolvedDate: dc.lastSolvedDate || null,
      solvedDates: dc.solvedDates || [],
      monthlyBadges: dc.monthlyBadges || [],
      solvedToday,
    });
  } catch (error) {
    console.error('Daily challenge getUserStats error:', error);
    res.status(500).json({ error: 'Failed to fetch user daily stats' });
  }
};
