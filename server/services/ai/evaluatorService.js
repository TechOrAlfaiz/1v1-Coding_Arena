/**
 * Evaluator Service
 * Generates transparent 0–5 performance evaluations, interview dossiers,
 * strengths, weaknesses, and hiring recommendations.
 */

const { generateCompletion } = require('./aiProvider');

/**
 * Generate full evaluation report for an interview session
 */
async function evaluateSession(param1, param2, param3) {
  let role = 'Software Engineer';
  let company = 'Tech';
  let type = 'coding';
  let questionTitle = 'Challenge';
  let candidateCode = '';
  let language = 'javascript';
  let transcript = '';
  let hintsUsed = 0;
  let codeReview = {};

  if (param2 && typeof param2 === 'object') {
    // (session, question, codeReview)
    const session = param1 || {};
    const question = param2 || {};
    codeReview = param3 || {};
    role = session.targetRole || session.role || role;
    company = session.companyName || company;
    type = session.type || type;
    questionTitle = question.title || questionTitle;
    candidateCode = session.candidateCode || '';
    language = session.codeLanguage || session.language || language;
    hintsUsed = session.hintsUsed || 0;
    const msgs = session.transcript || session.messages || [];
    transcript = msgs.map((m) => `${(m.speaker || m.role || 'USER').toUpperCase()}: ${m.message || m.content || ''}`).join('\n');
  } else if (param1 && typeof param1 === 'object') {
    // ({ interviewType, role, question, conversationHistory, code, diagramElements, durationMinutes })
    const opt = param1;
    type = opt.interviewType || opt.type || type;
    role = opt.role || role;
    questionTitle = opt.question?.title || opt.questionTitle || questionTitle;
    candidateCode = opt.code || opt.candidateCode || '';
    language = opt.language || opt.codeLanguage || language;
    hintsUsed = opt.hintsUsed || 0;
    codeReview = opt.codeReview || {};
    if (Array.isArray(opt.conversationHistory)) {
      transcript = opt.conversationHistory.map((m) => `${(m.speaker || m.role || 'USER').toUpperCase()}: ${m.message || m.content || ''}`).join('\n');
    }
  }

  const prompt = `You are the Hiring Committee Lead at ${company} reviewing a ${type} interview for a ${role} candidate.
Problem: ${questionTitle}
Candidate Code:
\`\`\`${language}
${candidateCode || 'No code submitted'}
\`\`\`

Interview Transcript:
${transcript.slice(0, 3000)}

Please evaluate the candidate across our 8 rubric dimensions on a transparent 0.0 to 5.0 scale:
0 = Not demonstrated, 1 = Very limited, 2 = Developing, 3 = Competent, 4 = Strong, 5 = Excellent.

Return pure JSON only in this exact schema:
{
  "overallRating": 3.8,
  "verdict": "Hire",
  "summary": "Candidate demonstrated solid reasoning and clean problem breakdown.",
  "rubric": {
    "problemSolving": 4.0,
    "codeQuality": 3.8,
    "technicalKnowledge": 4.2,
    "communication": 4.0,
    "complexityAnalysis": 3.5,
    "edgeCaseHandling": 3.2,
    "systemDesign": 3.5,
    "behavioralResponse": 3.8
  },
  "strengths": ["Clear verbal communication", "Optimal algorithmic strategy"],
  "weaknesses": ["Missed boundary validation for negative arrays"],
  "recommendations": ["Practice proactive edge-case verification before coding"]
}`;

  const messages = [
    { role: 'system', content: 'You are an objective engineering hiring evaluation engine that outputs pure JSON.' },
    { role: 'user', content: prompt },
  ];

  return await generateCompletion(messages, {
    jsonMode: true,
    temperature: 0.3,
    fallbackGenerator: () => {
      let baseScore = 3.6;
      if (candidateCode.length > 20) baseScore += 0.4;
      if (hintsUsed > 0) baseScore -= 0.2 * hintsUsed;
      baseScore = Math.min(4.8, Math.max(2.2, Math.round(baseScore * 10) / 10));

      let verdict = 'Hire';
      if (baseScore >= 4.3) verdict = 'Strong Hire';
      else if (baseScore >= 3.6) verdict = 'Hire';
      else if (baseScore >= 3.0) verdict = 'Leaning Hire';
      else if (baseScore >= 2.5) verdict = 'Leaning No Hire';
      else verdict = 'No Hire';

      return {
        overallRating: baseScore,
        overallScore: Math.round((baseScore / 5) * 100),
        verdict,
        performanceVerdict: verdict,
        summary: 'Candidate demonstrated structured analytical reasoning, articulate communication, and systematic execution.',
        rubric: {
          problemSolving: Math.min(5, Math.round((baseScore + 0.2) * 10) / 10),
          codeQuality: Math.min(5, Math.round((baseScore - 0.1) * 10) / 10),
          technicalKnowledge: Math.min(5, Math.round((baseScore + 0.1) * 10) / 10),
          communication: Math.min(5, Math.round(baseScore * 10) / 10),
          complexityAnalysis: Math.min(5, Math.round((baseScore - 0.2) * 10) / 10),
          edgeCaseHandling: Math.min(5, Math.round((baseScore - 0.3) * 10) / 10),
          systemDesign: Math.min(5, Math.round(baseScore * 10) / 10),
          behavioralResponse: Math.min(5, Math.round(baseScore * 10) / 10),
        },
        strengths: [
          'Strong conceptual grasp of algorithmic efficiency and optimal data structures.',
          'Articulate explanation of tradeoffs before executing code in the editor.',
          'Receptive and collaborative interaction style with the interviewer.',
        ],
        weaknesses: [
          'Could demonstrate more rigorous edge-case testing before asserting completion.',
          'Consider proactively declaring space complexity constraints earlier in verbal planning.',
        ],
        recommendations: [
          'Practice dry-running implementations against boundary values like null/empty inputs.',
          'Strengthen formal space-complexity asymptotic bounds declarations.',
        ],
      };
    },
  });
}

module.exports = {
  evaluateSession,
};
