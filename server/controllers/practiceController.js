/**
 * Practice Controller
 * Handles solo interview configuration, session startup,
 * Judge0 execution, submission with report card generation, and practice history.
 */

const Question = require('../models/Question');
const PracticeSession = require('../models/PracticeSession');
const { executeCode, runTestCases } = require('../utils/judge0');

/**
 * GET /api/practice/filters
 * Returns available difficulties, topic tags, company tags
 */
exports.getFilters = async (req, res) => {
  try {
    const questions = await Question.find().select('difficulty tags companyTags topics companies idealSolveTime');
    
    const difficulties = ['easy', 'medium', 'hard'];
    const topicsSet = new Set();
    const companiesSet = new Set();

    questions.forEach((q) => {
      (q.topics || []).forEach((t) => topicsSet.add(t));
      (q.tags || []).forEach((t) => topicsSet.add(t));
      (q.companies || []).forEach((c) => companiesSet.add(c));
      (q.companyTags || []).forEach((c) => companiesSet.add(c));
    });

    res.json({
      difficulties,
      topics: Array.from(topicsSet).sort(),
      companies: Array.from(companiesSet).sort(),
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error('Practice getFilters error:', error);
    res.status(500).json({ error: 'Failed to fetch practice filters' });
  }
};

/**
 * POST /api/practice/start
 * Configures and begins a solo interview run
 * Body: { duration, difficulty, topic, company }
 */
exports.startSession = async (req, res) => {
  try {
    const { duration = 45, difficulty, topic, company } = req.body;

    const query = {
      isPlayable: true,
      'testCases.0': { $exists: true },
    };
    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty.toLowerCase();
    }
    if (topic && topic !== 'all') {
      const topicRegex = new RegExp(`^${topic.trim()}$`, 'i');
      query.$or = [
        { topics: topicRegex },
        { topic: topicRegex },
        { tags: topicRegex },
      ];
    }
    if (company && company !== 'all') {
      const companyRegex = new RegExp(`^${company.trim()}$`, 'i');
      const companyConditions = [
        { companies: companyRegex },
        { companyTags: companyRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: companyConditions }];
        delete query.$or;
      } else {
        query.$or = companyConditions;
      }
    }

    let matchingQuestions = await Question.find(query);

    // If specific filter yielded 0, fallback to playable questions by difficulty or any playable question
    if (matchingQuestions.length === 0) {
      const fallbackQuery = { isPlayable: true, 'testCases.0': { $exists: true } };
      if (difficulty && difficulty !== 'all') {
        fallbackQuery.difficulty = difficulty.toLowerCase();
      }
      matchingQuestions = await Question.find(fallbackQuery);
    }

    // Secondary fallback to any question with test cases if strict isPlayable flag is unset
    if (matchingQuestions.length === 0) {
      matchingQuestions = await Question.find({ 'testCases.0': { $exists: true } });
    }

    // Ultimate fallback if database has only raw questions
    if (matchingQuestions.length === 0) {
      matchingQuestions = await Question.find();
    }

    if (matchingQuestions.length === 0) {
      return res.status(404).json({ error: 'No interview questions available. Please check the question pool.' });
    }

    // Pick random question from matches
    const question = matchingQuestions[Math.floor(Math.random() * matchingQuestions.length)];

    // Default benchmarks per difficulty if not set
    const defaultBenchmark = question.difficulty === 'hard' ? 40 : question.difficulty === 'medium' ? 25 : 15;
    const idealSolveTime = question.idealSolveTime || defaultBenchmark;

    res.json({
      sessionConfig: {
        duration: Number(duration),
        difficulty: question.difficulty,
        idealSolveTime,
      },
      question: {
        _id: question._id,
        title: question.title,
        description: question.description,
        difficulty: question.difficulty,
        tags: question.tags,
        companyTags: question.companyTags,
        examples: question.examples,
        starterCode: question.starterCode,
        idealSolveTime,
      },
    });
  } catch (error) {
    console.error('Practice startSession error:', error);
    res.status(500).json({ error: 'Failed to start interview session' });
  }
};

/**
 * POST /api/practice/run
 * Runs custom input test during active solo session
 * Body: { code, language, customInput }
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
    console.error('Practice runCode error:', error);
    res.status(500).json({ error: 'Failed to execute custom code test' });
  }
};

/**
 * POST /api/practice/submit
 * Evaluates solution against test cases, builds Report Card, saves practice session
 * Body: { questionId, duration, timeTaken, approachText, code, language, distractionCount, status }
 */
exports.submitSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      questionId,
      duration = 45,
      timeTaken = 0,
      approachText = '',
      code = '',
      language = 'javascript',
      distractionCount = 0,
      status = 'completed',
    } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Run against test cases
    const testCases = question.testCases || [];
    let evalResult = { results: [], allPassed: false };

    if (testCases.length > 0 && code.trim().length > 0) {
      evalResult = await runTestCases(code, language, testCases);
    }

    // Benchmark comparison
    const defaultBenchmark = question.difficulty === 'hard' ? 40 : question.difficulty === 'medium' ? 25 : 15;
    const idealSolveTime = question.idealSolveTime || defaultBenchmark;
    const timeTakenMinutes = Math.round((timeTaken / 60) * 10) / 10;
    const isUnderBenchmark = timeTakenMinutes <= idealSolveTime;

    // Complexity heuristic note
    let complexity = {
      time: 'O(N)',
      space: 'O(1)',
      note: 'Solution demonstrates linear time efficiency suitable for interview standards.',
    };

    if (code.includes('for') && code.includes('in range') && code.split('for').length > 2) {
      complexity.time = 'O(N²) or nested loop';
      complexity.note = 'Nested loop detected; consider whether hashing or two-pointers could optimize time complexity.';
    } else if (code.includes('Map(') || code.includes('dict(') || code.includes('{}') || code.includes('set(')) {
      complexity.space = 'O(N)';
      complexity.note = 'Utilizes auxiliary hash structures to achieve linear time optimization.';
    }

    // Save session record
    const sessionRecord = await PracticeSession.create({
      userId,
      questionId,
      duration,
      timeTaken,
      idealSolveTime,
      approachText,
      code,
      language,
      allPassed: evalResult.allPassed,
      results: evalResult.results,
      distractionCount,
      complexity,
      status: status === 'timed_out' ? 'timed_out' : 'completed',
    });

    // Report card payload
    res.status(201).json({
      reportCard: {
        sessionId: sessionRecord._id,
        question: {
          title: question.title,
          difficulty: question.difficulty,
          tags: question.tags,
          companyTags: question.companyTags,
        },
        duration,
        timeTaken,
        timeTakenMinutes,
        idealSolveTime,
        isUnderBenchmark,
        allPassed: evalResult.allPassed,
        results: evalResult.results,
        approachText,
        code,
        language,
        distractionCount,
        complexity,
        createdAt: sessionRecord.createdAt,
      },
    });
  } catch (error) {
    console.error('Practice submitSession error:', error);
    res.status(500).json({ error: 'Failed to submit and evaluate interview session' });
  }
};

/**
 * GET /api/practice/history
 * Returns user's practice history with pagination, summary stats, and trend data points
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      PracticeSession.find({ userId })
        .populate('questionId', 'title difficulty tags companyTags idealSolveTime')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PracticeSession.countDocuments({ userId }),
    ]);

    // Compute user aggregate practice metrics
    const allUserSessions = await PracticeSession.find({ userId })
      .select('allPassed timeTaken idealSolveTime distractionCount createdAt')
      .sort({ createdAt: 1 })
      .lean();

    const totalSessions = allUserSessions.length;
    const passedCount = allUserSessions.filter((s) => s.allPassed).length;
    const passRate = totalSessions > 0 ? Math.round((passedCount / totalSessions) * 100) : 0;

    const avgSolveTimeSeconds = totalSessions > 0
      ? Math.round(allUserSessions.reduce((acc, s) => acc + (s.timeTaken || 0), 0) / totalSessions)
      : 0;

    const totalDistractions = allUserSessions.reduce((acc, s) => acc + (s.distractionCount || 0), 0);
    const avgDistractions = totalSessions > 0 ? (totalDistractions / totalSessions).toFixed(1) : '0.0';

    // Trend points (last 10 sessions solve time vs benchmark)
    const recentSessions = allUserSessions.slice(-10);
    const trendPoints = recentSessions.map((s, index) => ({
      sessionIndex: index + 1,
      timeTakenMin: Math.round((s.timeTaken / 60) * 10) / 10,
      idealMin: s.idealSolveTime || 25,
      passed: s.allPassed,
      date: s.createdAt,
    }));

    res.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      stats: {
        totalSessions,
        passedCount,
        passRate,
        avgSolveTimeSeconds,
        avgDistractions,
      },
      trendPoints,
    });
  } catch (error) {
    console.error('Practice getHistory error:', error);
    res.status(500).json({ error: 'Failed to fetch practice history' });
  }
};
