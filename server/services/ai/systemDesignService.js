/**
 * System Design Service
 * Evaluates candidate whiteboard diagrams, data models, throughput calculations,
 * and formulates architectural probing questions.
 */

const { generateCompletion } = require('./aiProvider');

const SYSTEM_DESIGN_TOPICS = [
  {
    title: 'Design a Distributed Rate Limiter',
    description: 'Design a high-throughput, low-latency rate limiter capable of enforcing per-user sliding window quotas across thousands of API gateway instances.',
    requirements: ['100,000 requests/sec', '< 5ms p99 latency overhead', 'Cluster fault tolerance and redis failover'],
    difficulty: 'medium',
  },
  {
    title: 'Design a Real-Time Collaborative Code Editor',
    description: 'Design an operational-transformation or CRDT-based multi-user document editor with presence tracking and low-latency keystroke sync.',
    requirements: ['Sub-50ms peer latency', 'Conflict-free concurrent edits', 'Offline mode and reconnect sync'],
    difficulty: 'hard',
  },
  {
    title: 'Design a URL Shortener (TinyURL)',
    description: 'Design a globally distributed URL shortening service with analytics, custom alias support, and automatic expiration.',
    requirements: ['1 Billion URLs generated / month', '10:1 read-to-write ratio', '99.999% availability with zero redirect latency'],
    difficulty: 'easy',
  },
  {
    title: 'Design a Real-Time Video Streaming Platform (YouTube/Netflix)',
    description: 'Design a video upload, transcoding, CDN distribution, and adaptive bitrate streaming service.',
    requirements: ['Petabyte video storage', 'Adaptive HLS/DASH streaming', 'Global edge caching'],
    difficulty: 'hard',
  },
];

/**
 * Analyze candidate whiteboard diagram elements
 */
async function analyzeSystemDesignDiagram(param1, param2, param3 = '') {
  let problemTitle = 'Distributed Architecture';
  let elements = [];
  let candidateNotes = '';

  if (Array.isArray(param2)) {
    problemTitle = param1 || problemTitle;
    elements = param2 || [];
    candidateNotes = param3 || '';
  } else if (param1 && typeof param1 === 'object') {
    problemTitle = param1.prompt || param1.problemTitle || problemTitle;
    elements = param1.elements || [];
    candidateNotes = param1.candidateNotes || '';
  }

  const componentSummary = (elements || [])
    .map((e) => `${e.type} (${e.label || 'Unnamed'})`)
    .join(', ');

  const prompt = `You are a Principal Distributed Systems Architect reviewing a candidate's architecture diagram for: "${problemTitle}".
Candidate Whiteboard Components: ${componentSummary || 'API Gateway, Application Servers, Database'}
Candidate Notes: "${candidateNotes}"

Analyze the architecture and return pure JSON:
{
  "scalabilityScore": 4.1,
  "identifiedBottlenecks": ["Single database write master creates throughput bottleneck", "Lack of distributed cache layer"],
  "cachingStrategy": "Recommend introducing a Redis cluster with write-around or cache-aside pattern",
  "databaseSelectionAnalysis": "Good choice of NoSQL/SQL for the specific data access patterns",
  "grillingQuestion": "What happens when your primary database replica crashes during peak write spikes?"
}`;

  const messages = [
    { role: 'system', content: 'You are an expert system design interviewer evaluating architectures in pure JSON.' },
    { role: 'user', content: prompt },
  ];

  return await generateCompletion(messages, {
    jsonMode: true,
    temperature: 0.5,
    fallbackGenerator: () => {
      const hasCache = elements.some((e) => /cache|redis|memcached/i.test(e.label || e.type));
      const hasQueue = elements.some((e) => /queue|kafka|rabbitmq|sqs/i.test(e.label || e.type));
      const hasLB = elements.some((e) => /balancer|lb|gateway|nginx/i.test(e.label || e.type));

      const bottlenecks = [];
      if (!hasLB) bottlenecks.push('Direct traffic to application servers without load balancer will cause uneven utilization.');
      if (!hasCache) bottlenecks.push('High read volume hits primary database directly without caching layer.');
      if (!hasQueue) bottlenecks.push('Synchronous processing of write operations risks thread exhaustion during traffic spikes.');

      return {
        scalabilityScore: hasCache && hasLB ? 4.2 : 3.4,
        identifiedBottlenecks: bottlenecks.length > 0 ? bottlenecks : ['Network bandwidth between application tier and persistence cluster.'],
        cachingStrategy: hasCache
          ? 'Solid multi-tiered caching structure in place to shield underlying data stores.'
          : 'Introduce a distributed Redis/Memcached cluster in front of the database tier to absorb 85%+ of read queries.',
        databaseSelectionAnalysis: 'Partitioning strategy matches the query workload; consider read replicas for scaling read-heavy paths.',
        grillingQuestion: hasQueue
          ? 'How do you handle consumer lag and message idempotency when processing queue messages during failover?'
          : 'How would you decouple slow background processes from the synchronous user request-response lifecycle?',
      };
    },
  });
}

module.exports = {
  SYSTEM_DESIGN_TOPICS,
  analyzeSystemDesignDiagram,
};
