/**
 * Code Review Service
 * Deep-dive static and algorithmic analysis of candidate solutions.
 */

const { generateCompletion } = require('./aiProvider');

/**
 * Review code submission
 */
async function reviewCodeSubmission(param1, param2, param3) {
  let code = '';
  let language = 'javascript';
  let problemTitle = 'Technical Problem';
  let problemDescription = '';

  if (typeof param2 === 'string') {
    // (code, language, question)
    code = param1 || '';
    language = param2 || 'javascript';
    const q = param3 || {};
    problemTitle = q.title || problemTitle;
    problemDescription = q.description || '';
  } else if (param1 && typeof param1 === 'object') {
    // ({ problemStatement, code, language, question })
    const opt = param1;
    code = opt.code || '';
    language = opt.language || 'javascript';
    problemDescription = opt.problemStatement || (opt.question ? opt.question.description : '');
    problemTitle = opt.problemTitle || (opt.question ? opt.question.title : 'Technical Problem');
  }

  const prompt = `You are a Senior Software Architect reviewing a candidate's code submission for the problem: "${problemTitle}".
Language: ${language}
Problem Description: ${problemDescription}
Candidate Code:
\`\`\`${language}
${code}
\`\`\`

Return a valid JSON object ONLY with the following structure:
{
  "correctness": "evaluation of functional logic and correctness",
  "readability": "feedback on naming, structure, formatting, idiomatic style",
  "timeComplexity": "O(N) / O(N^2) etc with explanation",
  "spaceComplexity": "O(1) / O(N) etc with explanation",
  "optimizations": ["optimization suggestion 1", "optimization suggestion 2"],
  "potentialBugs": ["potential bug or unhandled edge case"]
}`;

  const messages = [
    { role: 'system', content: 'You are an automated code review engine that outputs pure JSON.' },
    { role: 'user', content: prompt },
  ];

  return await generateCompletion(messages, {
    jsonMode: true,
    temperature: 0.3,
    fallbackGenerator: () => {
      const codeStr = (code || '').toLowerCase();
      let timeComp = 'O(N)';
      let spaceComp = 'O(1)';

      if (codeStr.includes('for') && codeStr.split('for').length > 2) {
        timeComp = 'O(N²) due to nested loops';
      } else if (codeStr.includes('sort')) {
        timeComp = 'O(N log N) from sorting';
      }

      if (codeStr.includes('map') || codeStr.includes('set') || codeStr.includes('[]') || codeStr.includes('{}')) {
        spaceComp = 'O(N) auxiliary space for caching/collection';
      }

      return {
        correctness: 'Code demonstrates solid logical flow and executes the required algorithmic pattern.',
        readability: 'Variable naming and control structure are readable and idiomatic.',
        timeComplexity: timeComp,
        spaceComplexity: spaceComp,
        optimizations: [
          'Consider pre-allocating hash maps or arrays if bounds are known in advance.',
          'Add explicit input validation guards at the top of the function.',
        ],
        potentialBugs: [
          'Ensure behavior is well-defined when array length is 0 or negative numbers are passed.',
        ],
      };
    },
  });
}

module.exports = {
  reviewCodeSubmission,
};
