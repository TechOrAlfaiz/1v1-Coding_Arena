/**
 * Behavioral Interview Service
 * Evaluates candidate responses using the STAR method (Situation, Task, Action, Result),
 * probes leadership traits, and generates follow-up behavioral scenarios.
 */

const { generateCompletion } = require('./aiProvider');

const BEHAVIORAL_TOPICS = [
  {
    topic: 'Leadership & Initiative',
    question: 'Tell me about a time when you saw an opportunity for technical improvement and took the lead without being asked.',
    focusArea: 'Ownership, initiative, and proactive technical contribution.',
  },
  {
    topic: 'Conflict & Disagreement',
    question: 'Describe a situation where you had a fundamental architectural disagreement with a team member. How did you resolve it?',
    focusArea: 'Dispassionate technical debate, empathy, compromise, and team alignment.',
  },
  {
    topic: 'Failure & Resilience',
    question: 'Tell me about a major production incident or project deadline failure you experienced. What happened, and what did you learn?',
    focusArea: 'Accountability, blameless post-mortem analysis, and lasting preventative action.',
  },
  {
    topic: 'Tight Deadlines & Trade-offs',
    question: 'Give an example of when you had to ship a feature under strict time constraints. What technical debt or scope did you trade off?',
    focusArea: 'Pragmatism, stakeholder communication, and intentional technical debt management.',
  },
];

/**
 * Get random behavioral topic & challenge
 */
function getRandomBehavioralPrompt() {
  const item = BEHAVIORAL_TOPICS[Math.floor(Math.random() * BEHAVIORAL_TOPICS.length)];
  return item;
}

/**
 * Analyze candidate's behavioral answer
 */
async function analyzeBehavioralAnswer(questionText, candidateResponse) {
  const prompt = `You are a Senior Bar Raiser conducting a behavioral interview.
Question: "${questionText}"
Candidate's Response:
"${candidateResponse}"

Evaluate the response against the STAR framework (Situation, Task, Action, Result).
Return pure JSON:
{
  "starScore": 4.2,
  "situationFeedback": "Clear description of context and stakes",
  "taskFeedback": "Explicit explanation of responsibility",
  "actionFeedback": "Detailed personal contribution vs team effort",
  "resultFeedback": "Quantifiable impact and takeaways",
  "followUpQuestion": "What would you do differently if faced with similar constraints today?"
}`;

  const messages = [
    { role: 'system', content: 'You are an expert behavioral interviewer evaluating STAR answers in pure JSON.' },
    { role: 'user', content: prompt },
  ];

  return await generateCompletion(messages, {
    jsonMode: true,
    temperature: 0.5,
    fallbackGenerator: () => {
      const length = (candidateResponse || '').split(' ').length;
      const mentionsResult = /result|outcome|impact|saved|improved|metric|percent|%/i.test(candidateResponse);
      const mentionsAction = /i built|i designed|i decided|i spoke|my role|i implemented/i.test(candidateResponse);

      let score = 3.5;
      if (length > 60) score += 0.4;
      if (mentionsResult) score += 0.4;
      if (mentionsAction) score += 0.3;
      score = Math.min(4.8, Math.max(2.4, Math.round(score * 10) / 10));

      return {
        starScore: score,
        situationFeedback: 'Provides good preliminary context on the challenge and stakeholders involved.',
        taskFeedback: 'Defines the core problem and expectations clearly.',
        actionFeedback: mentionsAction
          ? 'Strong emphasis on personal ownership and specific actions taken.'
          : 'Focus more on what YOU personally decided and implemented rather than "we".',
        resultFeedback: mentionsResult
          ? 'Excellent articulation of measurable team and technical outcomes.'
          : 'Try to quantify the ultimate outcome (e.g. latency reduced, team velocity restored).',
        followUpQuestion: 'Looking back on that outcome, what was the biggest unexpected obstacle you had to navigate during execution?',
      };
    },
  });
}

module.exports = {
  BEHAVIORAL_TOPICS,
  getRandomBehavioralPrompt,
  analyzeBehavioralAnswer,
};
