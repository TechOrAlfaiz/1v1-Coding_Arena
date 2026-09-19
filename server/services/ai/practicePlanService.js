/**
 * Practice Plan Service
 * Computes diagnostic weakness maps from candidate interview reports
 * and generates targeted 7-day recovery roadmaps.
 */

const Question = require('../../models/Question');
const { generateCompletion } = require('./aiProvider');

/**
 * Generate a 7-day personalized practice plan
 * @param {Object} user
 * @param {Array} recentReports
 */
async function generatePersonalizedPlan(user, recentReports = []) {
  // Aggregate weakness signals
  const topicFrequency = {};
  recentReports.forEach((r) => {
    (r.weaknesses || []).forEach((w) => {
      const topic = extractTopicFromWeakness(w);
      topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
    });
  });

  const weakAreas = Object.keys(topicFrequency).length > 0
    ? Object.keys(topicFrequency).slice(0, 3)
    : ['Dynamic Programming', 'Graph Algorithms', 'Distributed Caching'];

  const prompt = `You are a Principal Engineering Career Coach creating a 7-Day Personalized Technical Interview Prep Plan.
Candidate Role: ${user.targetRole || 'Full Stack Engineer'}
Diagnostic Weak Areas: ${weakAreas.join(', ')}

Return a JSON array of 7 day objects with the following schema:
[
  {
    "dayNumber": 1,
    "theme": "Two-Pointer and Linear Optimization",
    "focusTopic": "Arrays & Strings",
    "estimatedMinutes": 45,
    "tasks": [
      { "id": "task_1", "title": "Review Monotonic Pointers Concept", "type": "coding_problem", "targetGoal": "Solve optimal two-pointer variation" },
      { "id": "task_2", "title": "Solve Medium Array Problem", "type": "coding_problem", "targetGoal": "Complete within 25 min benchmark" }
    ]
  }
]`;

  const messages = [
    { role: 'system', content: 'You are an engineering curriculum designer that outputs pure JSON arrays.' },
    { role: 'user', content: prompt },
  ];

  const planDays = await generateCompletion(messages, {
    jsonMode: true,
    temperature: 0.4,
    fallbackGenerator: () => [
      {
        dayNumber: 1,
        theme: 'Core Algorithmic Foundations',
        focusTopic: weakAreas[0] || 'Arrays & Hash Maps',
        estimatedMinutes: 45,
        tasks: [
          { id: 'd1_t1', title: 'Master Two-Sum Hash Map Invariants', type: 'coding_problem', targetGoal: 'Achieve O(N) time and O(N) space', completed: false },
          { id: 'd1_t2', title: 'Two Pointers Monotonic Swapping Drill', type: 'speed_drill', targetGoal: 'Implement without auxiliary memory in < 15m', completed: false },
        ],
      },
      {
        dayNumber: 2,
        theme: 'Stack & Monotonic Data Structures',
        focusTopic: 'Stacks & Queues',
        estimatedMinutes: 50,
        tasks: [
          { id: 'd2_t1', title: 'Valid Parentheses Multi-Bracket Matcher', type: 'coding_problem', targetGoal: 'Handle all edge cases with O(N) stack', completed: false },
          { id: 'd2_t2', title: 'Evaluate Postfix Expressions Drill', type: 'coding_problem', targetGoal: 'Edge verification with single operator', completed: false },
        ],
      },
      {
        dayNumber: 3,
        theme: 'Subarray Optimization & Sliding Windows',
        focusTopic: weakAreas[1] || 'Dynamic Programming',
        estimatedMinutes: 60,
        tasks: [
          { id: 'd3_t1', title: "Kadane's Algorithm for Maximum Subarray", type: 'coding_problem', targetGoal: 'Explain subproblem memoization vs greedy state', completed: false },
          { id: 'd3_t2', title: 'Longest Substring Without Repeating Characters', type: 'coding_problem', targetGoal: 'Sliding window window expansion/shrink invariants', completed: false },
        ],
      },
      {
        dayNumber: 4,
        theme: 'Scalability & System Architecture Review',
        focusTopic: 'System Design Scaling',
        estimatedMinutes: 55,
        tasks: [
          { id: 'd4_t1', title: 'Study Distributed Caching Strategies (Cache-Aside vs Write-Through)', type: 'system_design_review', targetGoal: 'Learn cache invalidation patterns', completed: false },
          { id: 'd4_t2', title: 'Draw Architecture for Distributed Rate Limiter', type: 'system_design_review', targetGoal: 'Design sliding window counters in Redis', completed: false },
        ],
      },
      {
        dayNumber: 5,
        theme: 'STAR Behavioral Story Formulation',
        focusTopic: 'Behavioral Round',
        estimatedMinutes: 40,
        tasks: [
          { id: 'd5_t1', title: 'Draft Architectural Disagreement Story', type: 'behavioral_prep', targetGoal: 'Structure with Situation, Task, Action, Result', completed: false },
          { id: 'd5_t2', title: 'Practice Quantifying Production Impact and Metrics', type: 'behavioral_prep', targetGoal: 'Highlight personal contribution vs team effort', completed: false },
        ],
      },
      {
        dayNumber: 6,
        theme: 'Binary Search & Monotonic State',
        focusTopic: 'Binary Search',
        estimatedMinutes: 50,
        tasks: [
          { id: 'd6_t1', title: 'Search in Rotated Sorted Array', type: 'coding_problem', targetGoal: 'O(log N) runtime with pivot boundary deduction', completed: false },
          { id: 'd6_t2', title: 'Find First and Last Position in Sorted Array', type: 'coding_problem', targetGoal: 'Binary search boundary conditions', completed: false },
        ],
      },
      {
        dayNumber: 7,
        theme: 'Full Simulation & 1v1 Battle Capstone',
        focusTopic: 'Full Mock Arena',
        estimatedMinutes: 60,
        tasks: [
          { id: 'd7_t1', title: 'Complete a Full 45-Minute AI Mock Coding Interview', type: 'coding_problem', targetGoal: 'Score >= 4.0 overall rubric', completed: false },
          { id: 'd7_t2', title: 'Compete in 1 Ranked 1v1 Arena Duel', type: 'speed_drill', targetGoal: 'Achieve victory under live pressure', completed: false },
        ],
      },
    ],
  });

  return {
    targetRole: user.targetRole || 'Software Engineer',
    weakAreas,
    strengths: ['Algorithmic intuition', 'Code syntax clarity'],
    days: Array.isArray(planDays) ? planDays : planDays.days || [],
  };
}

function extractTopicFromWeakness(text) {
  const lower = text.toLowerCase();
  if (lower.includes('dp') || lower.includes('dynamic')) return 'Dynamic Programming';
  if (lower.includes('graph') || lower.includes('tree')) return 'Graphs & Trees';
  if (lower.includes('edge') || lower.includes('boundary')) return 'Edge Case Handling';
  if (lower.includes('system') || lower.includes('scale')) return 'System Design';
  if (lower.includes('space') || lower.includes('complexity')) return 'Complexity Analysis';
  return 'Algorithms';
}

module.exports = {
  generatePersonalizedPlan,
};
