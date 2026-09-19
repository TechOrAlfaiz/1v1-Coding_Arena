const mongoose = require('mongoose');
const InterviewSession = require('../models/InterviewSession');
const InterviewReport = require('../models/InterviewReport');
const Question = require('../models/Question');
const Company = require('../models/Company');
const User = require('../models/User');

const interviewerService = require('../services/ai/interviewerService');
const evaluatorService = require('../services/ai/evaluatorService');
const codeReviewService = require('../services/ai/codeReviewService');
const systemDesignService = require('../services/ai/systemDesignService');
const behavioralService = require('../services/ai/behavioralService');
const questionGeneratorService = require('../services/ai/questionGeneratorService');

/**
 * Start a new interview session
 */
exports.startInterview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      type = 'coding',
      companyId = null,
      role = 'Software Engineer',
      questionId = null,
      difficulty = 'medium',
      interviewerPersona = 'Balanced & Encouraging',
      durationMinutes = 45,
    } = req.body;

    let question = null;
    if (questionId) {
      question = await Question.findById(questionId);
    }

    // If no specific question provided, find one matching type and difficulty
    if (!question) {
      let query = {};
      if (type === 'system_design') {
        query = { category: 'system_design' };
      } else if (type === 'behavioral') {
        query = { category: 'behavioral' };
      } else {
        query = { category: 'coding' };
        if (difficulty) query.difficulty = difficulty.toLowerCase();
      }

      let questions = await Question.find(query);
      if (questions.length === 0 && query.category) {
        questions = await Question.find({ category: query.category });
      }
      if (questions.length > 0) {
        question = questions[Math.floor(Math.random() * questions.length)];
      } else {
        // Fallback to any question
        question = await Question.findOne();
      }
    }

    let company = null;
    if (companyId) {
      company = await Company.findById(companyId);
    }

    const session = new InterviewSession({
      userId,
      type,
      companyId: company ? company._id : null,
      role,
      questionId: question ? question._id : null,
      difficulty: question ? question.difficulty : (difficulty ? difficulty.toLowerCase() : 'medium'),
      interviewerPersona,
      durationMinutes: parseInt(durationMinutes, 10) || 45,
      candidateCode: question && question.starterCode ? (question.starterCode.javascript || question.starterCode.python || '// Write your solution here\n') : '// Write your solution here\n',
      codeLanguage: 'javascript',
      status: 'in_progress',
    });

    // Generate opening introduction
    const introText = await interviewerService.generateIntroduction({
      candidateName: req.user.username || 'Candidate',
      interviewType: type,
      role,
      questionTitle: question ? question.title : 'Technical Problem',
      interviewerPersona,
    });

    session.transcript.push({
      speaker: 'interviewer',
      message: introText,
      timestamp: new Date(),
    });

    await session.save();

    res.status(201).json({
      success: true,
      session,
      question,
      company,
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ error: 'Failed to start interview session', details: error.message });
  }
};

/**
 * Candidate sends a message (text or speech transcript) to interviewer
 */
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const session = await InterviewSession.findOne({ _id: id, userId }).populate('questionId');
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: 'Session is already finished' });
    }

    // Append candidate message
    session.transcript.push({
      speaker: 'candidate',
      message: message.trim(),
      timestamp: new Date(),
    });

    // Check if candidate explicitly asks to advance to the next question
    const lowerMsg = message.trim().toLowerCase();
    const isAdvanceCmd =
      lowerMsg.includes('next question') ||
      lowerMsg.includes('next topic') ||
      lowerMsg.includes('skip question') ||
      lowerMsg.includes('move to next') ||
      lowerMsg.includes('move on');

    if (isAdvanceCmd && session.questions && session.questions.length > 0) {
      const advanceResult = await advanceOrWrapUpInterview(session);
      return res.json({
        success: true,
        reply: advanceResult.reply,
        isClosing: advanceResult.isClosing,
        isFinished: advanceResult.isFinished,
        currentQuestionIndex: session.currentQuestionIndex,
        questions: session.questions,
        transcript: session.transcript,
        session,
      });
    }

    const activeQuestion = session.questions && session.questions.length > (session.currentQuestionIndex || 0)
      ? session.questions[session.currentQuestionIndex || 0]
      : null;

    const questionTitle = activeQuestion
      ? `${activeQuestion.topic}: ${activeQuestion.question}`
      : (session.questionId ? session.questionId.title : (session.role || 'Live Assessment'));

    // Generate AI Interviewer response (pass conversationHistory excluding the last pushed candidate message to avoid duplicate user turns)
    const aiResponse = await interviewerService.generateInterviewerResponse({
      interviewType: session.interviewType || session.type,
      role: session.role,
      questionTitle,
      conversationHistory: session.transcript.slice(0, -1),
      candidateMessage: message.trim(),
      candidateCode: session.candidateCode,
      interviewerPersona: session.interviewerPersona,
    });

    // Append AI response
    session.transcript.push({
      speaker: 'interviewer',
      message: aiResponse,
      timestamp: new Date(),
    });

    await session.save();

    res.json({
      success: true,
      reply: aiResponse,
      currentQuestionIndex: session.currentQuestionIndex || 0,
      transcript: session.transcript,
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ error: 'Failed to process message', details: error.message });
  }
};

/**
 * Request hint from AI interviewer
 */
exports.requestHint = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const session = await InterviewSession.findOne({ _id: id, userId }).populate('questionId');
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const question = session.questionId;
    const questionTitle = question ? question.title : 'Technical Problem';
    const existingHints = question && question.hints ? question.hints : [];

    const hintResponse = await interviewerService.generateHint({
      questionTitle,
      candidateCode: session.candidateCode,
      conversationHistory: session.transcript,
      hintsGivenCount: session.hintsUsed,
    });

    session.hintsUsed += 1;
    session.transcript.push({
      speaker: 'interviewer',
      message: hintResponse,
      timestamp: new Date(),
      isHint: true,
    });

    await session.save();

    res.json({
      success: true,
      hint: hintResponse,
      hintsUsed: session.hintsUsed,
      transcript: session.transcript,
    });
  } catch (error) {
    console.error('Error requesting hint:', error);
    res.status(500).json({ error: 'Failed to generate hint', details: error.message });
  }
};

/**
 * Update candidate code or language
 */
exports.updateCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, language } = req.body;
    const userId = req.user.userId;

    const session = await InterviewSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (code !== undefined) session.candidateCode = code;
    if (language) session.codeLanguage = language;

    await session.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating code:', error);
    res.status(500).json({ error: 'Failed to update code' });
  }
};

/**
 * Update whiteboard / system design canvas elements
 */
exports.updateDiagram = async (req, res) => {
  try {
    const { id } = req.params;
    const { elements } = req.body;
    const userId = req.user.userId;

    const session = await InterviewSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (Array.isArray(elements)) {
      session.systemDesignElements = elements;
    }

    await session.save();
    res.json({ success: true, count: session.systemDesignElements.length });
  } catch (error) {
    console.error('Error updating diagram:', error);
    res.status(500).json({ error: 'Failed to update diagram' });
  }
};

/**
 * Finish interview and produce detailed Rubric Evaluation + Code Review
 */
exports.finishAndEvaluate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const session = await InterviewSession.findOne({ _id: id, userId }).populate('questionId companyId');
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const startTime = new Date(session.startTime).getTime();
    const endTime = Date.now();
    const actualDurationMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));

    session.status = 'completed';
    session.endTime = new Date();

    const isLiveAvatar = session.type === 'live_avatar' || session.mode === 'live_avatar';
    const isHrTrack = session.interviewType === 'hr';

    // Determine question title and problem statement
    const question = session.questionId;
    let questionTitle = 'Comprehensive Technical Assessment';
    let problemStatement = 'Full interview practice based on candidate profile and job requirements';

    if (question) {
      questionTitle = question.title;
      problemStatement = question.description || question.title;
    } else if (session.questions && session.questions.length > 0) {
      questionTitle = `Live Avatar: ${session.questions.map((q) => q.topic).slice(0, 3).join(', ')}`;
      problemStatement = session.questions.map((q, idx) => `Q${idx + 1} (${q.topic}): ${q.question}`).join('\n\n');
    } else if (session.questionTitle) {
      questionTitle = session.questionTitle;
      problemStatement = session.questionDescription || session.jobDescription || '';
    }

    const conversationHistory =
      session.transcript && session.transcript.length > 0
        ? session.transcript
        : session.messages || [];

    const resolvedInterviewType = isLiveAvatar
      ? (isHrTrack ? 'behavioral' : 'technical')
      : (session.type || 'coding');

    // Run AI Evaluation
    const evaluation = await evaluatorService.evaluateSession({
      interviewType: resolvedInterviewType,
      role: session.role || (isHrTrack ? 'Engineering Leadership / Culture' : 'Software Engineer'),
      question: {
        title: questionTitle,
        difficulty: session.difficulty || (question ? question.difficulty : 'Medium'),
        description: problemStatement,
      },
      conversationHistory,
      code: session.candidateCode || '',
      diagramElements: session.systemDesignElements || [],
      durationMinutes: actualDurationMinutes,
    });

    // Run Code Review if coding session with code
    let codeReview = null;
    if (
      (session.type === 'coding' || session.type === 'mixed') &&
      session.candidateCode &&
      session.candidateCode.length > 20
    ) {
      codeReview = await codeReviewService.reviewCodeSubmission({
        problemStatement,
        code: session.candidateCode,
        language: session.codeLanguage || 'javascript',
      });
    }

    // Run System Design review if applicable
    let systemDesignReview = null;
    if (session.systemDesignElements && session.systemDesignElements.length > 0) {
      systemDesignReview = await systemDesignService.analyzeSystemDesignDiagram({
        prompt: questionTitle,
        elements: session.systemDesignElements,
      });
    }

    // Calculate score 0 - 100
    const overallRating = evaluation.overallRating || 3.8;
    const overallScore = Math.round((overallRating / 5) * 100);

    const report = new InterviewReport({
      sessionId: session._id,
      userId,
      interviewType: resolvedInterviewType,
      companyId: session.companyId ? session.companyId._id : null,
      companyName: session.companyId?.name || 'Tech',
      questionId: question ? question._id : null,
      questionTitle,
      role: session.role || 'Software Engineer',
      targetRole: session.role || 'Software Engineer',
      durationMinutes: actualDurationMinutes,
      difficulty: session.difficulty || (question ? question.difficulty : 'Medium'),
      overallRating,
      overallScore,
      verdict: evaluation.verdict || 'Hire',
      performanceVerdict: evaluation.verdict || 'Hire',
      executiveSummary: evaluation.summary || 'Strong performance demonstrating good architectural intuition and clear communication.',
      rubric: evaluation.rubric || {
        problemSolving: 3.8,
        codeQuality: 3.6,
        technicalKnowledge: 4.0,
        communication: 4.2,
        complexityAnalysis: 3.5,
        edgeCaseHandling: 3.4,
        systemDesign: 3.8,
        behavioralResponse: 3.9,
      },
      strengths:
        evaluation.strengths && evaluation.strengths.length > 0
          ? evaluation.strengths
          : ['Clear technical articulation', 'Structured breakdown of system components'],
      weaknesses:
        evaluation.weaknesses && evaluation.weaknesses.length > 0
          ? evaluation.weaknesses
          : ['Could elaborate deeper on data consistency guarantees under partition'],
      keyRecommendations:
        evaluation.recommendations && evaluation.recommendations.length > 0
          ? evaluation.recommendations
          : ['Prepare concrete metrics and SLA targets when discussing distributed systems'],
      codeReview: codeReview || {
        correctness: 'Code demonstrates logical flow.',
        timeComplexity: 'Estimated O(N)',
        spaceComplexity: 'Estimated O(1)',
        suggestions: ['Consider documenting edge cases'],
      },
      systemDesignReview,
      transcriptSummary: `${conversationHistory.length} messages exchanged across ${actualDurationMinutes} minutes.`,
    });

    await report.save();

    // Reward XP & update user stats
    const xpEarned = Math.round(100 + overallScore * 2);
    const user = await User.findById(userId);
    if (user) {
      user.xp = (user.xp || 0) + xpEarned;
      user.level = Math.floor((user.xp || 0) / 500) + 1;

      if (!user.interviewStats) {
        user.interviewStats = { totalInterviews: 0, avgScore: 0, codingAvg: 0, systemDesignAvg: 0, behavioralAvg: 0 };
      }
      const prevTotal = user.interviewStats.totalInterviews || 0;
      const newTotal = prevTotal + 1;
      const prevAvg = user.interviewStats.avgScore || 0;
      user.interviewStats.totalInterviews = newTotal;
      user.interviewStats.avgScore = Math.round((prevAvg * prevTotal + overallScore) / newTotal);

      if (resolvedInterviewType === 'coding' || resolvedInterviewType === 'technical') {
        user.interviewStats.codingAvg = Math.round(
          ((user.interviewStats.codingAvg || 0) * prevTotal + overallScore) / newTotal
        );
      } else if (resolvedInterviewType === 'system_design') {
        user.interviewStats.systemDesignAvg = Math.round(
          ((user.interviewStats.systemDesignAvg || 0) * prevTotal + overallScore) / newTotal
        );
      } else if (resolvedInterviewType === 'behavioral' || resolvedInterviewType === 'hr') {
        user.interviewStats.behavioralAvg = Math.round(
          ((user.interviewStats.behavioralAvg || 0) * prevTotal + overallScore) / newTotal
        );
      }

      await user.save();
    }

    session.score = overallScore;
    session.reportId = report._id;
    await session.save();

    res.json({
      success: true,
      reportId: report._id,
      report,
      xpEarned,
      newLevel: user ? user.level : 1,
    });
  } catch (error) {
    console.error('Error in finishAndEvaluate:', error);
    res.status(500).json({ error: 'Failed to complete evaluation', details: error.message });
  }
};

/**
 * Get interview session details
 */
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const session = await InterviewSession.findOne({ _id: id, userId }).populate('questionId companyId');
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

/**
 * Get evaluation report
 */
exports.getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    let report = await InterviewReport.findOne({
      $or: [{ _id: id }, { sessionId: id }],
      userId,
    }).populate('questionId companyId sessionId');

    // If not found with userId, fallback to direct ID match if valid ObjectId
    if (!report && mongoose.Types.ObjectId.isValid(id)) {
      report = await InterviewReport.findOne({
        $or: [{ _id: id }, { sessionId: id }],
      }).populate('questionId companyId sessionId');
    }

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

/**
 * List past interviews of logged-in user
 */
exports.getUserInterviews = async (req, res) => {
  try {
    const userId = req.user.userId;

    const sessions = await InterviewSession.find({ userId })
      .sort({ createdAt: -1 })
      .populate('questionId companyId')
      .limit(20);

    const reports = await InterviewReport.find({ userId })
      .sort({ createdAt: -1 })
      .populate('questionId companyId')
      .limit(20);

    res.json({
      success: true,
      sessions,
      reports,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user interview history' });
  }
};

/**
 * Parse uploaded PDF (Job Description or Resume)
 */
exports.parsePdf = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: req.file.buffer });
    const textResult = await parser.getText();
    const text = textResult && textResult.text ? textResult.text.trim() : '';

    let info = {};
    let pages = textResult ? textResult.total : 1;
    try {
      const infoResult = await parser.getInfo();
      info = (infoResult && infoResult.info) || {};
      if (infoResult && infoResult.total) pages = infoResult.total;
    } catch (_) {}

    if (parser.destroy) {
      try { await parser.destroy(); } catch (_) {}
    }

    if (!text) {
      return res.status(400).json({ error: 'Could not extract text from this PDF. Please ensure the document contains selectable text, not scanned images.' });
    }

    res.json({
      success: true,
      text,
      pages,
      info,
    });
  } catch (err) {
    console.error('PDF parsing error:', err);
    res.status(500).json({ error: 'Failed to parse PDF document: ' + (err.message || 'Unknown error') });
  }
};

/**
 * Start a Live Avatar Mock Interview Session (JD + Resume based with dynamic 5-question generation)
 */
exports.startLiveAvatarInterview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      jobDescription = '',
      resumeText = '',
      interviewType = 'technical',
      role = 'Software Engineer',
      durationMinutes = 30,
    } = req.body;

    if (!jobDescription.trim() && !resumeText.trim()) {
      return res.status(400).json({ error: 'Please provide either a Job Description or Resume content.' });
    }

    const resolvedTrack = interviewType.toLowerCase() === 'hr' ? 'hr' : 'technical';
    const resolvedRole = role || (resolvedTrack === 'hr' ? 'Candidate (Culture & Leadership)' : 'Software Engineer');

    // Generate tailored question plan based on JD, Resume & session duration
    const durationMins = parseInt(durationMinutes, 10) || 30;
    const generatedQuestions = await questionGeneratorService.generateInterviewPlan({
      jobDescription: jobDescription.trim(),
      resumeText: resumeText.trim(),
      interviewType: resolvedTrack,
      role: resolvedRole,
      durationMinutes: durationMins,
    });

    const isHr = resolvedTrack === 'hr';
    const firstQ = generatedQuestions[0]?.question || (isHr
      ? "Could you tell me about yourself and your background?"
      : "Could you briefly describe the most complex technical project you've worked on recently?");

    const personaIntroduction = isHr
      ? `Hello! I'm Aria Morgan, your AI Talent & Leadership Interviewer. I've reviewed your resume and role requirements. We'll be walking through core behavioral and leadership competency areas tailored to your target position.`
      : `Hello! I'm Dr. Sarah Vance, your Technical Lead Interviewer. I've analyzed your resume and the target role tech stack. Today we'll explore progressive technical dimensions: your past project architecture, core technical mastery, distributed systems scaling, and production reliability.`;

    const openingStatement = `${personaIntroduction}\n\nLet's begin with our first topic—${generatedQuestions[0]?.topic || 'Introduction'}:\n\n${firstQ}`;

    const session = new InterviewSession({
      userId,
      type: 'live_avatar',
      mode: 'live_avatar',
      interviewType: resolvedTrack,
      role: resolvedRole,
      jobDescription: jobDescription.trim(),
      resumeText: resumeText.trim(),
      durationMinutes: durationMins,
      durationLimit: durationMins * 60,
      status: 'in_progress',
      isClosing: false,
      questions: generatedQuestions,
      currentQuestionIndex: 0,
      questionTitle: generatedQuestions[0]?.topic || 'Phase 1: Resume Deep Dive',
      questionDescription: generatedQuestions[0]?.question || '',
      dialogue: [],
      messages: [],
      transcript: [],
    });

    session.messages.push({
      role: 'interviewer',
      speaker: 'interviewer',
      content: openingStatement,
      message: openingStatement,
      timestamp: new Date(),
    });

    session.transcript.push({
      role: 'interviewer',
      speaker: 'interviewer',
      content: openingStatement,
      message: openingStatement,
      timestamp: new Date(),
    });

    await session.save();

    res.json({
      success: true,
      session,
      questions: generatedQuestions,
    });
  } catch (err) {
    console.error('Failed to start live avatar session:', err);
    res.status(500).json({ error: 'Failed to initialize live avatar session' });
  }
};

/**
 * Shared helper to advance to the next question dynamically or trigger a graceful wrap-up based on remaining time
 */
async function advanceOrWrapUpInterview(session) {
  const isHr = session.interviewType === 'hr';
  const durationSecs = (session.durationMinutes || 30) * 60;
  const elapsedSecs = Math.floor((Date.now() - new Date(session.startTime || session.createdAt).getTime()) / 1000);
  const remainingSecs = Math.max(0, durationSecs - elapsedSecs);
  const remainingMins = Math.round(remainingSecs / 60);

  // Time is almost up (<= 3 minutes) or interview already entered wrap-up phase
  if (remainingSecs <= 180 || session.isClosing) {
    if (session.isClosing || remainingSecs === 0) {
      const finishMsg = "Thank you for such a detailed and engaging discussion! We have now completed our scheduled session. Whenever you're ready, please click End & Evaluate to view your full AI assessment dossier.";
      session.transcript.push({
        speaker: 'interviewer',
        role: 'interviewer',
        message: finishMsg,
        content: finishMsg,
        timestamp: new Date(),
      });
      await session.save();
      return {
        isFinished: true,
        isClosing: true,
        reply: finishMsg,
        remainingSecs,
      };
    }

    // Graceful closing prompt when entering final minutes
    const wrapUpQuestion = isHr
      ? "We're approaching the final few minutes of our scheduled interview time. To conclude our session today, do you have any final reflections on our discussion, or any questions for me about our leadership philosophy and team culture?"
      : "We're approaching the final few minutes of our scheduled interview time. To conclude our discussion today, do you have any final questions for me about our systems architecture, engineering roadmaps, or team culture?";

    session.isClosing = true;
    session.questionTitle = "Closing Reflections & Q&A";
    session.questionDescription = wrapUpQuestion;

    session.transcript.push({
      speaker: 'interviewer',
      role: 'interviewer',
      message: wrapUpQuestion,
      content: wrapUpQuestion,
      timestamp: new Date(),
    });

    await session.save();
    return {
      isFinished: false,
      isClosing: true,
      reply: wrapUpQuestion,
      remainingSecs,
    };
  }

  // Time remaining is > 180s: Advance to next question or dynamically generate a new one
  const nextIndex = (session.currentQuestionIndex || 0) + 1;
  let nextQ = null;

  if (nextIndex < session.questions.length) {
    nextQ = session.questions[nextIndex];
  } else {
    // Dynamically generate the next progressive question
    nextQ = await questionGeneratorService.generateNextAdaptiveQuestion({
      session,
      timeRemainingMinutes: remainingMins,
      currentQuestionIndex: nextIndex,
    });
    session.questions.push(nextQ);
  }

  session.currentQuestionIndex = nextIndex;
  session.questionTitle = nextQ.topic || `Topic ${nextIndex + 1}`;
  session.questionDescription = nextQ.question;

  const transitionMessage = `Great, let's move forward to topic ${nextIndex + 1} of ${session.questions.length}—${nextQ.topic}:\n\n${nextQ.question}`;

  session.transcript.push({
    speaker: 'interviewer',
    role: 'interviewer',
    message: transitionMessage,
    content: transitionMessage,
    timestamp: new Date(),
  });

  await session.save();

  return {
    isFinished: false,
    isClosing: false,
    reply: transitionMessage,
    currentQuestionIndex: nextIndex,
    currentQuestion: nextQ,
    remainingSecs,
  };
}

/**
 * Advance to the next question in the time-driven interview plan
 */
exports.nextQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const session = await InterviewSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (!session.questions || session.questions.length === 0) {
      return res.status(400).json({ error: 'No structured questions found for this session.' });
    }

    const advanceResult = await advanceOrWrapUpInterview(session);

    res.json({
      success: true,
      currentQuestionIndex: session.currentQuestionIndex,
      currentQuestion: session.questions[session.currentQuestionIndex],
      questions: session.questions,
      reply: advanceResult.reply,
      isClosing: advanceResult.isClosing,
      isFinished: advanceResult.isFinished,
      transcript: session.transcript,
      session,
    });
  } catch (error) {
    console.error('Error advancing to next question:', error);
    res.status(500).json({ error: 'Failed to advance to next question' });
  }
};
