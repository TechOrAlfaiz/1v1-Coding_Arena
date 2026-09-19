/**
 * Seed Interview Preparation Ecosystem Data:
 * - Companies (FAANG + Tier 1 Tech)
 * - Questions (Coding, System Design, Behavioral)
 * - Courses & Learning Modules
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Company = require('./models/Company');
const Question = require('./models/Question');
const Course = require('./models/Course');

const defaultCompaniesData = [
  {
    name: 'Google',
    slug: 'google',
    logo: '🔍',
    brandColor: '#4285F4',
    tier: 'FAANG',
    description: 'Engineering excellence focused on distributed systems, high throughput, and algorithmic mastery.',
    roles: [
      { title: 'Software Engineer (L4/L5)', experienceLevel: 'mid', salaryRange: '$185k - $320k' },
      { title: 'Site Reliability Engineer', experienceLevel: 'mid', salaryRange: '$170k - $280k' },
    ],
    interviewStages: [
      { stageName: 'Recruiter Screen', duration: '30 mins', description: 'Resume review and role alignment' },
      { stageName: 'Technical Phone Screen', duration: '45 mins', description: 'Core data structures and algorithms' },
      { stageName: 'Onsite: Algorithms & Complexity', duration: '45 mins', description: 'Graph algorithms, DP, and optimizations' },
      { stageName: 'Onsite: System Design', duration: '45 mins', description: 'Large-scale distributed infrastructure' },
      { stageName: 'Onsite: Googleyness & Leadership', duration: '45 mins', description: 'Behavioral, team navigation, and growth mindset' },
    ],
    keyFocusAreas: ['Graphs', 'Dynamic Programming', 'Distributed Caching', 'Scalability', 'Googliness'],
    questionCount: 42,
  },
  {
    name: 'Meta',
    slug: 'meta',
    logo: '♾️',
    brandColor: '#0668E1',
    tier: 'FAANG',
    description: 'Rapid execution, product sense, and massive scale social infrastructure.',
    roles: [
      { title: 'Software Engineer (E4/E5)', experienceLevel: 'mid', salaryRange: '$190k - $340k' },
      { title: 'Production Engineer', experienceLevel: 'senior', salaryRange: '$200k - $360k' },
    ],
    interviewStages: [
      { stageName: 'Technical Screening', duration: '45 mins', description: 'Two coding problems with speed and precision' },
      { stageName: 'Virtual Onsite: Coding 1', duration: '45 mins', description: 'Trees, recursion, and data manipulation' },
      { stageName: 'Virtual Onsite: Coding 2', duration: '45 mins', description: 'BFS/DFS and graph traversals' },
      { stageName: 'Virtual Onsite: System Design', duration: '45 mins', description: 'Feed, messaging, or live streaming architecture' },
      { stageName: 'Virtual Onsite: Behavioral', duration: '45 mins', description: 'Moving fast and cross-functional leadership' },
    ],
    keyFocusAreas: ['Binary Trees', 'BFS / DFS', 'Live Newsfeed Architecture', 'Tradeoff Analysis'],
    questionCount: 38,
  },
  {
    name: 'Amazon',
    slug: 'amazon',
    logo: '📦',
    brandColor: '#FF9900',
    tier: 'FAANG',
    description: 'Customer obsession, architectural resilience, and leadership principles at earth-scale.',
    roles: [
      { title: 'SDE II', experienceLevel: 'mid', salaryRange: '$165k - $275k' },
      { title: 'SDE III (Senior)', experienceLevel: 'senior', salaryRange: '$240k - $420k' },
    ],
    interviewStages: [
      { stageName: 'Online Assessment (OA)', duration: '90 mins', description: 'Debugging and coding problem sets' },
      { stageName: 'Technical Phone Screen', duration: '45 mins', description: 'Coding plus Leadership Principles' },
      { stageName: 'The Loop: Coding & Algorithms', duration: '60 mins', description: 'Data structures paired with LP deep-dive' },
      { stageName: 'The Loop: Object-Oriented & System Design', duration: '60 mins', description: 'Extensible software design' },
      { stageName: 'The Loop: Bar Raiser', duration: '60 mins', description: 'External senior evaluator testing cultural fit' },
    ],
    keyFocusAreas: ['Leadership Principles', 'OOP & Design Patterns', 'Queuing Systems', 'Trees & Tries'],
    questionCount: 45,
  },
  {
    name: 'Microsoft',
    slug: 'microsoft',
    logo: '🪟',
    brandColor: '#00A4EF',
    tier: 'FAANG',
    description: 'Cloud infrastructure, collaborative platforms, and robust enterprise software.',
    roles: [
      { title: 'Software Engineer II (L61-62)', experienceLevel: 'mid', salaryRange: '$160k - $260k' },
      { title: 'Senior Software Engineer (L63+)', experienceLevel: 'senior', salaryRange: '$210k - $330k' },
    ],
    interviewStages: [
      { stageName: 'Recruiter Chat & Online Assessment', duration: '45 mins', description: 'Coding fundamentals' },
      { stageName: 'Onsite Round 1: Algorithms', duration: '45 mins', description: 'String parsing and optimizations' },
      { stageName: 'Onsite Round 2: Data Structures', duration: '45 mins', description: 'Linked lists, trees, and hash tables' },
      { stageName: 'Onsite Round 3: Cloud Microservices', duration: '45 mins', description: 'Distributed systems and telemetry' },
      { stageName: 'Onsite Round 4: As Appropriate (AA)', duration: '45 mins', description: 'Executive partner interview' },
    ],
    keyFocusAreas: ['String Parsing', 'Linked Lists', 'Cloud Microservices', 'Team Collaboration'],
    questionCount: 35,
  },
  {
    name: 'Netflix',
    slug: 'netflix',
    logo: '🎬',
    brandColor: '#E50914',
    tier: 'FAANG',
    description: 'Freedom and responsibility, chaos engineering, and high-throughput streaming architecture.',
    roles: [
      { title: 'Senior Software Engineer (L5)', experienceLevel: 'senior', salaryRange: '$350k - $550k' },
      { title: 'Distributed Systems Architect', experienceLevel: 'staff', salaryRange: '$450k - $680k' },
    ],
    interviewStages: [
      { stageName: 'Recruiter Alignment', duration: '30 mins', description: 'Culture and compensation philosophy' },
      { stageName: 'Hiring Manager Chat', duration: '45 mins', description: 'Technical background and domain experience' },
      { stageName: 'Technical System Architecture', duration: '60 mins', description: 'High throughput streaming and resilience' },
      { stageName: 'Practical Coding & Pair Programming', duration: '60 mins', description: 'Clean, production-ready code' },
      { stageName: 'Culture & Freedom & Responsibility', duration: '60 mins', description: 'High autonomy and ownership' },
    ],
    keyFocusAreas: ['Resilience & Chaos Engineering', 'High Throughput Streaming', 'Microservices', 'Culture Fit'],
    questionCount: 28,
  },
  {
    name: 'Stripe',
    slug: 'stripe',
    logo: '💳',
    brandColor: '#635BFF',
    tier: 'Unicorn',
    description: 'Financial infrastructure, rock-solid APIs, idempotency, and developer-first craftsmanship.',
    roles: [
      { title: 'Full Stack Engineer (L3/L4)', experienceLevel: 'mid', salaryRange: '$220k - $380k' },
      { title: 'Infrastructure Engineer', experienceLevel: 'senior', salaryRange: '$250k - $410k' },
    ],
    interviewStages: [
      { stageName: 'Technical Screen / Take-Home Pairing', duration: '60 mins', description: 'Real-world problem solving' },
      { stageName: 'Integration / API Design', duration: '60 mins', description: 'RESTful API contracts and edge cases' },
      { stageName: 'Bug Bash / Code Navigation', duration: '60 mins', description: 'Diagnosing issues in existing codebases' },
      { stageName: 'System Architecture', duration: '60 mins', description: 'Data consistency and idempotency' },
    ],
    keyFocusAreas: ['Idempotency', 'Payment Flow Resiliency', 'Practical Clean Code', 'API Design'],
    questionCount: 30,
  },
];

const newQuestionsData = [
  // System Design Questions
  {
    title: 'Design a Distributed Rate Limiter',
    description: 'Architect a highly available, low-latency distributed rate limiter capable of throttling incoming HTTP requests across a fleet of microservices. The service must support token bucket or sliding window counter algorithms, limit client requests to 100 req/min per IP or user ID, and withstand node failures without blocking legitimate traffic.',
    category: 'system_design',
    difficulty: 'Medium',
    topic: 'Distributed Systems',
    tags: ['Redis', 'Rate Limiting', 'Token Bucket', 'Scalability', 'High Availability'],
    constraints: [
      'Sub-millisecond latency overhead (< 5ms per check)',
      'Multi-region active-active or active-passive deployment',
      'Graceful degradation when redis clusters experience partition',
    ],
    hints: [
      'Consider using Redis with Redis Lua scripts to achieve atomic sliding window increment operations.',
      'How will you handle clock drift if running sliding logs across distributed servers?',
      'Would client-side caching with local memory token refills minimize network roundtrips?',
    ],
    starterCode: {
      javascript: `// System Design Whiteboard - Architectural Components:\n// 1. Client / API Gateway\n// 2. Rate Limiting Middleware\n// 3. Distributed In-Memory Cache (Redis Cluster)\n// 4. Fallback Rule Engine\n\nclass RateLimiterService {\n  constructor(redisClient, windowMs = 60000, maxRequests = 100) {\n    this.redis = redisClient;\n    this.windowMs = windowMs;\n    this.maxRequests = maxRequests;\n  }\n\n  async isAllowed(clientId) {\n    // Implement token bucket or sliding window counter\n    return true;\n  }\n}\n`,
      python: `# Distributed Rate Limiter\nclass RateLimiterService:\n    def __init__(self, redis_client, window_seconds=60, max_requests=100):\n        self.redis = redis_client\n        self.window = window_seconds\n        self.max = max_requests\n\n    def is_allowed(self, client_id: str) -> bool:\n        # Implement sliding window algorithm\n        return True\n`,
    },
    testCases: [{ input: 'client_123', expectedOutput: 'allowed: true', isHidden: false }],
  },
  {
    title: 'Design a Real-Time Collaborative Document Editor',
    description: 'Design the architecture for a real-time collaborative document platform like Google Docs or Notion. The system must support hundreds of concurrent editors on the same document, resolve conflicting edits without data loss, provide sub-100ms sync latency, and maintain revision history with offline edit reconciliation.',
    category: 'system_design',
    difficulty: 'Hard',
    topic: 'System Design',
    tags: ['WebSockets', 'OT', 'CRDT', 'Document Store', 'Concurrency'],
    constraints: [
      'Document size up to 10 MB with 500 simultaneous typers',
      'Consistent final state across all clients (Eventual Consistency)',
      'Persistent audit log of operations for undo/redo',
    ],
    hints: [
      'Compare Operational Transformation (OT) vs Conflict-free Replicated Data Types (CRDTs).',
      'Use WebSocket connections managed by stateful gateway servers with pub/sub broker backplanes.',
      'Snapshot documents periodically into blob storage while streaming atomic deltas.',
    ],
    starterCode: {
      javascript: `// Architectural Overview:\n// Clients <-> WebSocket Gateway <-> Document Session Router <-> Redis Pub/Sub <-> Snapshot DB\n\nfunction applyOperation(documentState, deltaOperation) {\n  // Transform or merge delta operations\n  return documentState;\n}\n`,
      python: `def apply_operation(document_state: str, delta_operation: dict) -> str:\n    # Operational transformation logic\n    return document_state\n`,
    },
    testCases: [{ input: 'doc_1', expectedOutput: 'synced', isHidden: false }],
  },
  // Behavioral Questions
  {
    title: 'Handling a Disagreement with a Senior Technical Leader',
    description: 'Tell me about a time when you strongly disagreed with a tech lead, architect, or engineering manager regarding a critical technical direction or architectural choice. How did you navigate the conversation, what evidence did you present, and what was the ultimate resolution?',
    category: 'behavioral',
    difficulty: 'Medium',
    topic: 'Conflict Resolution & Leadership',
    tags: ['STAR Method', 'Communication', 'Disagreement', 'Leadership'],
    constraints: [
      'Structure answer using Situation, Task, Action, Result (STAR)',
      'Focus on objective data and customer impact rather than personal friction',
      'Highlight whether you committed to the final decision regardless of outcome',
    ],
    hints: [
      'Define the technical context clearly: What were the trade-offs between option A and option B?',
      'Emphasize how you tested hypotheses or constructed a small prototype/benchmark.',
      'Showcase the Amazon principle "Have Backbone; Disagree and Commit".',
    ],
    starterCode: {
      javascript: `/*\n * Use the STAR framework:\n * - Situation: What was the project and technical dilemma?\n * - Task: What was your specific responsibility or concern?\n * - Action: How did you communicate, benchmark, and propose alternatives?\n * - Result: What happened, what metrics improved, and what did you learn?\n */\n`,
      python: `"""\nSTAR Framework notes for this response:\n- Situation:\n- Task:\n- Action:\n- Result:\n"""\n`,
    },
    testCases: [{ input: 'Disagreement context', expectedOutput: 'Constructive resolution', isHidden: false }],
  },
  {
    title: 'Navigating a Production Incident under High Pressure',
    description: 'Describe a situation where a major bug or outage occurred in production that impacted active users. Walk through your diagnostic process, how you communicated with stakeholders during the crisis, how the immediate remediation was executed, and what long-term preventive measures were introduced.',
    category: 'behavioral',
    difficulty: 'Hard',
    topic: 'Incident Management',
    tags: ['STAR Method', 'Root Cause Analysis', 'Resilience', 'Post-Mortem'],
    constraints: [
      'Demonstrate calm prioritization: mitigate first, diagnose second',
      'Explain incident command communication channels',
      'Cover post-mortem culture and blameless analysis',
    ],
    hints: [
      'Clarify initial telemetry alerts and blast radius assessment.',
      'Explain rollback vs hotfix evaluation under time pressure.',
      'Discuss automated regression tests and circuit breakers added in the post-mortem.',
    ],
    starterCode: {
      javascript: `// Key Discussion Points:\n// 1. Alert acknowledgment & triage\n// 2. Stakeholder comms & status page update\n// 3. Rollback execution\n// 4. Blameless root-cause post-mortem\n`,
      python: `# Key Discussion Points:\n# 1. Triage\n# 2. Mitigation\n# 3. Blameless Post-Mortem\n`,
    },
    testCases: [{ input: 'Incident context', expectedOutput: 'Successful remediation', isHidden: false }],
  },
  // Advanced Coding Questions
  {
    title: 'LRU Cache Implementation',
    description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the `LRUCache` class with `get(key)` and `put(key, value)` both running in average O(1) time complexity.',
    category: 'coding',
    difficulty: 'Medium',
    topic: 'Data Structures',
    tags: ['Hash Table', 'Doubly Linked List', 'Design', 'LRU'],
    constraints: [
      '1 <= capacity <= 3000',
      '0 <= key <= 10^4',
      '0 <= value <= 10^5',
      'At most 2 * 10^5 calls will be made to get and put',
    ],
    hints: [
      'To achieve O(1) lookup, a Hash Map is required.',
      'To achieve O(1) removal and insertion of elements in order of usage, a Doubly Linked List is ideal.',
      'Combine the Hash Map with Doubly Linked List nodes where the map stores pointers to the list nodes.',
    ],
    starterCode: {
      javascript: `class Node {\n  constructor(key, val) {\n    this.key = key;\n    this.val = val;\n    this.prev = null;\n    this.next = null;\n  }\n}\n\nclass LRUCache {\n  /**\n   * @param {number} capacity\n   */\n  constructor(capacity) {\n    this.capacity = capacity;\n    this.map = new Map();\n    this.head = new Node(0, 0);\n    this.tail = new Node(0, 0);\n    this.head.next = this.tail;\n    this.tail.prev = this.head;\n  }\n\n  /** \n   * @param {number} key\n   * @return {number}\n   */\n  get(key) {\n    // Implement\n    return -1;\n  }\n\n  /** \n   * @param {number} key \n   * @param {number} value\n   * @return {void}\n   */\n  put(key, value) {\n    // Implement\n  }\n}\n`,
      python: `class Node:\n    def __init__(self, key: int, val: int):\n        self.key = key\n        self.val = val\n        self.prev = None\n        self.next = None\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n        self.cache = {}\n        self.head = Node(0, 0)\n        self.tail = Node(0, 0)\n        self.head.next = self.tail\n        self.tail.prev = self.head\n\n    def get(self, key: int) -> int:\n        return -1\n\n    def put(self, key: int, value: int) -> None:\n        pass\n`,
    },
    testCases: [
      { input: '["LRUCache","put","put","get","put","get"]\n[[2],[1,1],[2,2],[1],[3,3],[2]]', expectedOutput: '[null,null,null,1,null,-1]', isHidden: false },
    ],
  },
  {
    title: 'Word Search II (Boggle with Trie)',
    description: 'Given an m x n board of characters and a list of strings `words`, return all words on the board. Each word must be constructed from letters of sequentially adjacent cells (horizontal or vertical neighboring). The same letter cell may not be used more than once in a word.',
    category: 'coding',
    difficulty: 'Hard',
    topic: 'Trie & Backtracking',
    tags: ['Trie', 'Backtracking', 'DFS', 'Matrix', 'Google'],
    constraints: [
      'm == board.length',
      'n == board[i].length',
      '1 <= m, n <= 12',
      'board[i][j] is a lowercase English letter',
      '1 <= words.length <= 3 * 10^4',
    ],
    hints: [
      'Searching for each word individually causes redundant board traversals.',
      'Store all target words in a Prefix Tree (Trie).',
      'Backtrack through the grid while traversing the Trie simultaneously.',
    ],
    starterCode: {
      javascript: `/**\n * @param {character[][]} board\n * @param {string[]} words\n * @return {string[]}\n */\nfunction findWords(board, words) {\n  // Implement Trie + DFS\n  return [];\n}\n`,
      python: `class Solution:\n    def findWords(self, board: list[list[str]], words: list[str]) -> list[str]:\n        return []\n`,
    },
    testCases: [
      { input: 'board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]', expectedOutput: '["eat","oath"]', isHidden: false },
    ],
  },
];

const coursesData = [
  {
    title: 'Technical Interview Mastery: Algorithms & Data Structures',
    slug: 'dsa-mastery',
    category: 'dsa',
    description: 'Step-by-step masterclass covering the core algorithmic patterns asked by FAANG & Tier-1 tech firms.',
    badgeIcon: '⚡',
    brandColor: '#00d4ff',
    xpReward: 150,
    estimatedHours: 6,
    difficulty: 'intermediate',
    modules: [
      {
        title: 'Two Pointers & Sliding Window Patterns',
        lessons: [
          {
            id: 'lesson-dsa-1',
            title: 'Dynamic Window vs Fixed Window',
            duration: '12 mins',
            summary: 'Transform O(N²) quadratic nested loops into clean O(N) linear time algorithms.',
            contentMarkdown: 'The sliding window technique converts O(N²) nested loops into clean O(N) single-pass solutions by maintaining a window boundary [left, right] that expands and contracts dynamically based on constraints.',
            codeSnippet: `function maxSubarraySum(arr, k) {\n  let maxSum = 0, windowSum = 0;\n  for (let i = 0; i < k; i++) windowSum += arr[i];\n  maxSum = windowSum;\n  for (let i = k; i < arr.length; i++) {\n    windowSum += arr[i] - arr[i - k];\n    maxSum = Math.max(maxSum, windowSum);\n  }\n  return maxSum;\n}`,
            keyTakeaways: ['Sliding window operates in O(N)', 'Reuses computed results from overlapping ranges'],
            quiz: [
              {
                question: 'What is the primary benefit of the Sliding Window technique over brute-force nested loops?',
                options: [
                  'It lowers memory usage to O(N)',
                  'It lowers time complexity from O(N²) to O(N) by reusing overlapping window state',
                  'It guarantees constant O(1) space and time',
                  'It allows parallel multi-threaded sorting',
                ],
                correctAnswer: 1,
                explanation: 'Sliding window updates state in O(1) by subtracting the left exiting item and adding the right entering item, yielding O(N) overall time.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Large-Scale Distributed Systems Architecture',
    slug: 'system-design-architecture',
    category: 'system_design',
    description: 'Learn the architectural building blocks for high availability, fault tolerance, and multi-region scalability.',
    badgeIcon: '🏛️',
    brandColor: '#10b981',
    xpReward: 200,
    estimatedHours: 8,
    difficulty: 'advanced',
    modules: [
      {
        title: 'Caching Strategies & Cache Invalidation',
        lessons: [
          {
            id: 'lesson-sd-1',
            title: 'Cache-Aside (Lazy Loading) Architecture',
            duration: '15 mins',
            summary: 'Handling high read throughput with low latencies using distributed Redis/Memcached layers.',
            contentMarkdown: 'In Cache-Aside, the application first queries the cache. If hit, data returns immediately. On cache miss, the application queries the database, writes the result into cache with a TTL, and returns.',
            codeSnippet: `async function getUser(id) {\n  const cached = await redis.get(\`user:\${id}\`);\n  if (cached) return JSON.parse(cached);\n  const user = await db.users.findById(id);\n  await redis.setex(\`user:\${id}\`, 3600, JSON.stringify(user));\n  return user;\n}`,
            keyTakeaways: ['Cache-Aside avoids caching stale data indefinitely', 'Requires defensive TTL strategy'],
            quiz: [
              {
                question: 'What is a major risk with Cache-Aside when hundreds of concurrent requests query an expired key?',
                options: [
                  'Database deadlocks due to distributed transactions',
                  'Cache Stampede (Thundering Herd), where all requests slam the backend database simultaneously',
                  'Redis memory overflow',
                  'Network timeout on the client device',
                ],
                correctAnswer: 1,
                explanation: 'A Cache Stampede occurs when many requests miss at the exact same moment, overwhelming the database.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Behavioral & Leadership Excellence (STAR Framework)',
    slug: 'behavioral-star-excellence',
    category: 'behavioral',
    description: 'Master Amazon Leadership Principles, Googleyness, conflict resolution, and executive storytelling.',
    badgeIcon: '🌟',
    brandColor: '#f59e0b',
    xpReward: 120,
    estimatedHours: 4,
    difficulty: 'beginner',
    modules: [
      {
        title: 'Structuring High-Impact STAR Stories',
        lessons: [
          {
            id: 'lesson-beh-1',
            title: 'Action & Result Focus',
            duration: '10 mins',
            summary: 'Shift your emphasis from the team problem to your individual ownership and measurable business impact.',
            contentMarkdown: 'Candidates often spend 70% of their time on Situation and Task. Elite candidates spend 70% on Action (what YOU individually did) and Result (quantifiable business impact).',
            codeSnippet: '// STAR Formula:\n// Situation: 15%\n// Task: 15%\n// Action: 50%\n// Result: 20%',
            keyTakeaways: ['Focus on "I", not just "We"', 'Back results with verifiable metrics'],
            quiz: [
              {
                question: 'What should constitute the largest portion of your behavioral response?',
                options: [
                  'The background history of your company and team structure',
                  'The exact specific Actions you personally took to overcome the challenge',
                  'The mistakes made by other engineers',
                  'The initial feelings you experienced',
                ],
                correctAnswer: 1,
                explanation: 'Interviewers look for your individual contribution, technical ownership, and decisions.',
              },
            ],
          },
        ],
      },
    ],
  },
];

function getMergedCompanies() {
  const metaPath = path.join(__dirname, 'data/companyMeta.json');
  const statsPath = path.join(__dirname, 'data/derivedCompanyStats.json');

  if (fs.existsSync(metaPath)) {
    try {
      const rawMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      let statsData = {};
      if (fs.existsSync(statsPath)) {
        try {
          statsData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        } catch (e) {}
      }

      return rawMeta.map((item) => {
        const stats = statsData[item.name] || statsData[item.name.toLowerCase()] || statsData[item.slug];
        const questionCount = (stats && stats.questionCount > 0) ? stats.questionCount : (item.fallbackQuestionCount || 30);
        const keyFocusAreas = (stats && stats.keyFocusAreas && stats.keyFocusAreas.length > 0)
          ? stats.keyFocusAreas
          : (item.fallbackTopics || ['Algorithms', 'Data Structures', 'System Design']);

        const roles = item.roles || [
          {
            title: item.role?.title || 'Software Development Engineer',
            salaryRange: item.role?.salaryRange || '$180k - $300k',
            experienceLevel: item.role?.experienceLevel || 'mid',
          },
        ];

        return {
          name: item.name,
          slug: item.slug,
          tier: item.tier || 'Tier 1 Product',
          logo: item.logo || '🏢',
          brandColor: item.brandColor || '#4FA393',
          description: item.description || '',
          roles,
          interviewStages: item.interviewStages || [],
          keyFocusAreas,
          questionCount,
        };
      });
    } catch (err) {
      console.warn('Error reading companyMeta.json:', err.message);
    }
  }
  return defaultCompaniesData;
}

async function seedInterviewData() {
  try {
    const companiesData = getMergedCompanies();
    // 1. Seed Companies
    for (const comp of companiesData) {
      await Company.findOneAndUpdate(
        { slug: comp.slug },
        comp,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Seeded ${companiesData.length} target tech companies.`);

    // 2. Seed Questions
    for (const q of newQuestionsData) {
      await Question.findOneAndUpdate(
        { title: q.title },
        q,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Seeded ${newQuestionsData.length} interview questions (System Design, Behavioral, Coding).`);

    // 3. Seed Courses
    for (const crs of coursesData) {
      await Course.findOneAndUpdate(
        { slug: crs.slug },
        crs,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Seeded ${coursesData.length} interactive learning tracks.`);
  } catch (error) {
    console.error('❌ Error seeding interview ecosystem data:', error);
  }
}

module.exports = seedInterviewData;

if (require.main === module) {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coding-arena';
  mongoose.connect(MONGO_URI).then(async () => {
    console.log('Connected to MongoDB. Starting seed...');
    await seedInterviewData();
    mongoose.disconnect();
  });
}
