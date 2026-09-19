/**
 * Interviewer Service
 * Manages the live technical interview persona, probing candidate responses,
 * challenging complexity assumptions, and providing measured hints.
 */

const { generateCompletion } = require('./aiProvider');

/**
 * Generate the opening statement for a technical interview
 */
async function generateIntroduction(param1, param2) {
  // Support either (session, question) or ({ candidateName, interviewType, role, questionTitle, interviewerPersona })
  let role = 'Software Engineer';
  let company = 'Tech';
  let level = 'mid';
  let type = 'coding';
  let questionTitle = 'Technical Problem';
  let questionDescription = '';
  let persona = 'Balanced & Encouraging';

  if (param2) {
    // (session, question)
    const session = param1 || {};
    const question = param2 || {};
    role = session.targetRole || session.role || role;
    company = session.companyName || company;
    level = session.experienceLevel || level;
    type = session.type || type;
    questionTitle = question.title || questionTitle;
    questionDescription = question.description || '';
    persona = session.interviewerPersona || persona;
  } else if (param1 && typeof param1 === 'object') {
    // single object
    const opt = param1;
    role = opt.role || opt.targetRole || role;
    company = opt.companyName || company;
    type = opt.interviewType || opt.type || type;
    questionTitle = opt.questionTitle || (opt.question ? opt.question.title : questionTitle);
    questionDescription = opt.questionDescription || (opt.question ? opt.question.description : '');
    persona = opt.interviewerPersona || persona;
  }

  const systemPrompt = `You are a Principal Technical Interviewer (${persona}) at ${company} conducting a ${type} interview for a ${level}-level ${role} position.
Introduce yourself warmly, explain the expectations, and present the problem clearly without giving away any solutions.
Keep your response concise (under 4 sentences). Encourage the candidate to explain their thought process before coding.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Start the interview with the problem: "${questionTitle}". Problem Summary: ${questionDescription}` },
  ];

  return await generateCompletion(messages, {
    temperature: 0.6,
    fallbackGenerator: () => {
      if (type === 'system_design') {
        return `Hello! Welcome to your ${company} System Design interview for the ${role} position. Today we'll be designing "${questionTitle}". Take a moment to review the requirements, ask any clarifying questions about scale and constraints, and sketch your high-level architecture on the whiteboard.`;
      }
      if (type === 'behavioral') {
        return `Hello! Welcome to your ${company} behavioral round. Today I'd like to dive into your past experiences and leadership principles. Let's start with this scenario: "${questionTitle}". Please describe your experience using the STAR framework: Situation, Task, Action, and Result.`;
      }
      return `Welcome to your ${company} technical interview! I'm your interviewer today. We'll be working through "${questionTitle}". Feel free to read the problem statement, think through edge cases, and talk me through your proposed approach before jumping straight into the code editor.`;
    },
  });
}

/**
 * Respond to candidate's explanation, approach, or question during the interview
 */
async function generateInterviewerResponse(param1, param2, param3) {
  let role = 'Software Engineer';
  let company = 'Tech';
  let type = 'coding';
  let problemTitle = 'Technical Challenge';
  let candidateMessage = '';
  let currentCode = '';
  let persona = 'Balanced & Encouraging';
  let rawHistory = [];
  if (typeof param2 === 'string') {
    // (session, candidateMessage, currentCode)
    const session = param1 || {};
    role = session.targetRole || session.role || role;
    company = session.companyName || company;
    type = session.type || type;
    problemTitle = session.questionTitle || (session.questionId ? session.questionId.title : problemTitle);
    candidateMessage = param2;
    currentCode = param3 || '';
    rawHistory = session.transcript || session.messages || [];
  } else if (param1 && typeof param1 === 'object') {
    // ({ interviewType, role, questionTitle, conversationHistory, candidateMessage, candidateCode, interviewerPersona })
    const opt = param1;
    type = opt.interviewType || opt.type || type;
    role = opt.role || role;
    problemTitle = opt.questionTitle || problemTitle;
    candidateMessage = opt.candidateMessage || '';
    currentCode = opt.candidateCode || '';
    persona = opt.interviewerPersona || persona;
    if (Array.isArray(opt.conversationHistory)) {
      rawHistory = opt.conversationHistory;
    }
  }

  // Preserve up to last 16 turns for multi-turn context continuity
  const conversationHistory = rawHistory.slice(-16).map((m) => ({
    role: m.speaker === 'interviewer' || m.role === 'interviewer' ? 'assistant' : 'user',
    content: m.message || m.content || '',
  }));

  // Clean out empty turns and consecutive duplicate messages for clean LLM completions
  const cleanHistory = [];
  for (const item of conversationHistory) {
    if (!item.content || !item.content.trim()) continue;
    const prev = cleanHistory[cleanHistory.length - 1];
    if (prev && prev.role === item.role && prev.content.trim() === item.content.trim()) {
      continue;
    }
    cleanHistory.push(item);
  }

  const lastHistoryItem = cleanHistory[cleanHistory.length - 1];
  const needsUserAppend = !lastHistoryItem || lastHistoryItem.role !== 'user' || lastHistoryItem.content.trim() !== candidateMessage.trim();

  // Track-tailored system prompt
  const isHr = type === 'hr' || type === 'behavioral';
  const isSystemDesign = type === 'system_design';
  const isLiveTech = type === 'technical' || type === 'live_avatar';

  let systemPrompt = '';
  if (isHr) {
    systemPrompt = `You are an executive Talent & Leadership Interviewer (${persona}) at ${company} conducting a behavioral/leadership interview for the ${role} position.
Current Topic: "${problemTitle}"
CRITICAL GUIDELINES:
- Probe the candidate's answers using the STAR method (Situation, Task, Action, Result).
- Focus on personal ownership ("What was YOUR specific role?"), leadership influence, overcoming friction, and quantifiable impact.
- Do NOT probe for code syntax or Big-O complexity; focus on team dynamics, communication, adaptability, and judgment.
- Keep responses conversational, professional, engaging, and under 3-4 sentences.`;
  } else if (isSystemDesign) {
    systemPrompt = `You are a Principal Systems Architect (${persona}) at ${company} interviewing a candidate for ${role} on the architectural challenge: "${problemTitle}".
CRITICAL GUIDELINES:
- Challenge assumptions regarding scale, throughput, data partitioning, and single points of failure.
- Probe trade-offs (e.g., strong vs eventual consistency, push vs pull, synchronous RPC vs async messaging).
- Keep responses conversational, crisp, and under 3-4 sentences.`;
  } else if (isLiveTech) {
    systemPrompt = `You are a Senior Technical Interviewer & Staff Engineer (${persona}) at ${company} interviewing a candidate for ${role} on the topic: "${problemTitle}".
CRITICAL GUIDELINES:
- Probe technical reasoning, architectural decisions, and failure modes.
- If they propose an engineering approach, ask about edge cases, performance bottlenecks, or production monitoring.
- Keep responses conversational, collaborative, encouraging, and under 3-4 sentences.`;
  } else {
    // Algorithmic Coding interview
    systemPrompt = `You are an elite technical interviewer (${persona}) at ${company} interviewing a candidate for ${role} on the problem "${problemTitle}".
CRITICAL GUIDELINES:
- NEVER reveal the direct code solution or correct algorithmic answer.
- If the candidate describes an approach, probe their Big-O time and space complexity.
- If they suggest a brute-force approach (e.g. O(N^2)), challenge them to find a more optimal linear or logarithmic pattern.
- If they ask for clarification, clarify input constraints and data sizes.
- Keep responses conversational, professional, encouraging, and under 3-4 sentences.
- If code is provided: "${currentCode.slice(0, 400)}", point out any obvious edge case gaps without fixing it for them.`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...cleanHistory,
    ...(needsUserAppend ? [{ role: 'user', content: candidateMessage }] : []),
  ];

  return await generateCompletion(messages, {
    temperature: 0.7,
    fallbackGenerator: () => {
      const query = candidateMessage.toLowerCase();

      if (isHr) {
        if (query.includes('conflict') || query.includes('disagree') || query.includes('argue')) {
          return "Handling disagreement constructively is critical. How did you build consensus without compromising on engineering standards, and what was the lasting outcome?";
        }
        if (query.includes('fail') || query.includes('mistake') || query.includes('bug')) {
          return "Thank you for the transparency. Taking ownership is key. What systemic safeguards or process changes did you implement to prevent similar issues?";
        }
        return "That provides clear context on the situation. What was the specific action YOU personally took to drive resolution, and what measurable impact did it achieve for your team?";
      }

      if (isSystemDesign) {
        if (query.includes('cache') || query.includes('redis')) {
          return "Using an in-memory cache is a standard choice. How would you handle cache stampedes when hot keys expire, and what invalidation strategy would you use?";
        }
        return "That's a clean architectural division. What happens if traffic spikes by 10x during peak hours, and where would database partitioning or asynchronous queuing deliver the highest resilience?";
      }

      if (query.includes('brute') || query.includes('nested') || query.includes('o(n^2)') || query.includes('o(n2)')) {
        return "A brute force solution is a solid starting baseline. What is the bottleneck in that nested iteration, and can we trade a small amount of extra space (like a hash map) to bring the time complexity down to linear O(N)?";
      }

      if (query.includes('hash') || query.includes('map') || query.includes('dictionary') || query.includes('set')) {
        return "Good intuition using a hash-based lookup. What would be the expected lookup time on average versus worst case, and how does your approach handle collisions or duplicate entries?";
      }

      if (query.includes('two pointer') || query.includes('pointer') || query.includes('left') || query.includes('right')) {
        return "The two-pointer technique works great here. Does the input array need to be sorted first for those pointers to guarantee monotonicity, and what would the sorting step do to overall time complexity?";
      }

      if (query.includes('edge') || query.includes('empty') || query.includes('null') || query.includes('negative')) {
        return "Excellent instinct checking edge cases. Yes, you can assume inputs may contain negative integers and arrays of minimum length 2. How will your termination condition handle those?";
      }

      if (query.includes('hint') || query.includes('stuck') || query.includes('help')) {
        return "Consider this hint: if you are at an element X, you are looking for a complementary value (Target - X). Rather than scanning backward repeatedly, could you remember what you've already visited in a single pass?";
      }

      return "That sounds like a very reasonable direction. Walk me through the trade-offs of that approach and how you would structure the next iteration.";
    },
  });
}

/**
 * Generate a progressive hint when requested by candidate
 */
async function generateHint(param1, param2) {
  let hints = [];
  let used = 0;
  let title = '';

  if (param2 && typeof param2 === 'object') {
    // (session, question)
    hints = param2.hints || [];
    used = param1 ? param1.hintsUsed || 0 : 0;
    title = param2.title?.toLowerCase() || '';
  } else if (param1 && typeof param1 === 'object') {
    // ({ questionTitle, candidateCode, conversationHistory, hintsGivenCount })
    used = param1.hintsGivenCount || 0;
    title = param1.questionTitle?.toLowerCase() || '';
    if (param1.hints) hints = param1.hints;
  }

  if (hints.length > used) {
    return hints[used];
  }

  // Fallback programmatic hint
  if (title.includes('two sum')) {
    return "Hint: Use a Hash Map to store numbers and their indices as you traverse. For each number, check if (target - num) is already in the map.";
  }
  if (title.includes('reverse')) {
    return "Hint: Two pointers starting at the beginning and end of the string can swap characters in-place in O(N) time and O(1) space.";
  }
  if (title.includes('parentheses')) {
    return "Hint: A Stack data structure is ideal for matching opening and closing brackets. Push opening brackets and pop when a corresponding closing bracket appears.";
  }
  if (title.includes('rate limiter')) {
    return "Hint: Redis sorted sets or token bucket algorithm can track request counts atomically with sliding window expires.";
  }

  return "Hint: Consider breaking the problem into sub-problems or storing intermediate results in auxiliary memory to avoid redundant computations.";
}

module.exports = {
  generateIntroduction,
  generateInterviewerResponse,
  generateHint,
};
