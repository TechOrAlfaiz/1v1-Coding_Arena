/**
 * Question Generator Service
 * Dynamically generates 5 tailored, progressive interview questions
 * based on the provided Job Description, Candidate Resume, and Interview Track (Technical vs HR).
 */

const { generateCompletion } = require('./aiProvider');

/**
 * Heuristic extractor for technical keywords from text
 */
function extractTechKeywords(text = '') {
  const commonTechs = [
    'Node.js', 'React', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Golang',
    'Java', 'C++', 'Rust', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Kafka', 'RabbitMQ',
    'GraphQL', 'REST', 'gRPC', 'Microservices', 'Distributed Systems',
    'CI/CD', 'Next.js', 'Tailwind', 'System Design', 'Caching', 'Elasticsearch'
  ];

  const found = commonTechs.filter((tech) =>
    new RegExp(`\\b${tech.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(text)
  );

  return found.length > 0 ? found : ['Distributed Systems', 'Modern Web Services', 'Databases'];
}

/**
 * Generate progressive questions based on JD, Resume, track, and session duration
 * @param {Object} params { jobDescription, resumeText, interviewType, role, durationMinutes }
 * @returns {Promise<Array>} Array of structured questions
 */
async function generateInterviewPlan({
  jobDescription = '',
  resumeText = '',
  interviewType = 'technical',
  role = 'Software Engineer',
  durationMinutes = 30,
}) {
  const isHr = interviewType.toLowerCase() === 'hr';
  const jdKeywords = extractTechKeywords(jobDescription);
  const resumeKeywords = extractTechKeywords(resumeText);
  const duration = parseInt(durationMinutes, 10) || 30;
  // Scale question count to session duration: ~5 mins per topic + buffer
  const targetCount = Math.max(5, Math.min(12, Math.round(duration / 5)));

  const systemPrompt = isHr
    ? `You are a Principal Talent Partner & Leadership Assessment Designer.
Analyze the provided Job Description and Candidate Resume.
Generate exactly ${targetCount} progressive behavioral questions structured around the STAR (Situation, Task, Action, Result) format.
Return a valid JSON object with a "questions" array containing exactly ${targetCount} items:
[
  {
    "index": 0,
    "topic": "Topic Name",
    "phase": "Phase Description",
    "question": "Question text...",
    "expectedCompetencies": ["Competency 1", "Competency 2"]
  }
]
Progress the questions logically: Introduction & Background -> Conflict Resolution -> Ownership & Failure -> Prioritization Under Constraints -> Mentorship & Culture -> Managing Ambiguity -> Stakeholder Negotiation.`
    : `You are a Principal Software Architect & Technical Hiring Lead.
Analyze the provided Job Description and Candidate Resume.
Generate exactly ${targetCount} progressive technical questions tailored to the candidate's background and the role requirements.
Return a valid JSON object with a "questions" array containing exactly ${targetCount} items:
[
  {
    "index": 0,
    "topic": "Topic Name",
    "phase": "Phase Description",
    "question": "Question text...",
    "expectedCompetencies": ["Competency 1", "Competency 2"]
  }
]
Progress the questions logically: Resume Past Architecture -> Core ${jdKeywords.slice(0, 2).join(' & ')} Deep Dive -> High-Scale Distributed Systems -> Architectural Trade-offs -> Production Observability & Incident Response -> Database Sharding & Concurrency -> Security & Auth.`;

  const userContent = `ROLE: ${role}
TRACK: ${interviewType.toUpperCase()}
PLANNED DURATION: ${duration} minutes (Target: ${targetCount} core topics)

JOB DESCRIPTION:
${jobDescription.slice(0, 2500) || 'General Tech Role with focus on scalable software engineering and collaboration.'}

CANDIDATE RESUME:
${resumeText.slice(0, 2500) || 'Experienced software professional with experience designing, building, and deploying applications.'}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  const result = await generateCompletion(messages, {
    temperature: 0.6,
    jsonMode: true,
    fallbackGenerator: () => generateHeuristicPlan({ isHr, role, jdKeywords, resumeKeywords, targetCount }),
  });

  if (result && Array.isArray(result.questions) && result.questions.length >= 3) {
    return result.questions.map((q, idx) => ({
      index: idx,
      question: q.question || `Question ${idx + 1}`,
      topic: q.topic || `Topic ${idx + 1}`,
      phase: q.phase || `Phase ${idx + 1}`,
      expectedCompetencies: Array.isArray(q.expectedCompetencies) ? q.expectedCompetencies : ['Technical Depth'],
    }));
  }

  return generateHeuristicPlan({ isHr, role, jdKeywords, resumeKeywords, targetCount });
}

/**
 * Deterministic fallback generator that crafts dynamic question plans sized to session duration
 */
function generateHeuristicPlan({ isHr, role, jdKeywords, resumeKeywords, targetCount = 6 }) {
  const topTech = jdKeywords[0] || 'Node.js';
  const secondaryTech = jdKeywords[1] || 'Distributed Caching';
  const resumeAnchor = resumeKeywords[0] || 'your recent projects';

  const hrQuestions = [
    {
      topic: 'Background & Role Alignment',
      phase: 'Introduction',
      question: `To kick off our session today, could you walk me through your career journey, highlighting the experiences on your resume that best prepare you for this ${role} position?`,
      expectedCompetencies: ['Executive Presence', 'Communication Clarity', 'Career Motivation'],
    },
    {
      topic: 'Technical Conflict & Alignment',
      phase: 'Conflict Resolution',
      question: `Can you share a specific situation where you strongly disagreed with a team member or stakeholder on a key engineering or architectural decision? How did you navigate the conversation and what was the resolution?`,
      expectedCompetencies: ['Emotional Intelligence', 'Persuasion', 'Constructive Disagreement'],
    },
    {
      topic: 'Ownership & Overcoming Failure',
      phase: 'Resilience & Accountability',
      question: `Tell me about a project, feature launch, or deadline where things went unexpectedly wrong or did not meet expectations. How did you take ownership of the setback, and what changes did you institute afterward?`,
      expectedCompetencies: ['Accountability', 'Post-Mortem Analysis', 'Growth Mindset'],
    },
    {
      topic: 'Prioritization Under Constraints',
      phase: 'Execution Under Pressure',
      question: `Describe a scenario where you faced competing high-priority demands with a strict deadline. How did you evaluate trade-offs, manage stakeholder expectations, and decide what to deliver first?`,
      expectedCompetencies: ['Time Management', 'Stakeholder Communication', 'Pragmatism'],
    },
    {
      topic: 'Leadership & Team Velocity',
      phase: 'Cultural Impact',
      question: `How do you elevate those around you? Could you provide an example where you mentored a junior engineer, resolved a cross-team roadblock, or improved overall engineering standards on your team?`,
      expectedCompetencies: ['Mentorship', 'Cultural Leadership', 'Multiplier Effect'],
    },
    {
      topic: 'Managing Ambiguity & Rapid Shifts',
      phase: 'Adaptability',
      question: `Software requirements often shift unpredictably. Can you describe a time when project scope or tech specifications changed drastically mid-stream, and how you kept the initiative moving forward?`,
      expectedCompetencies: ['Agility', 'Pragmatic Delivery', 'Risk Mitigation'],
    },
    {
      topic: 'Cross-Functional Collaboration',
      phase: 'Stakeholder Alignment',
      question: `How do you bridge communication gaps between technical engineering teams and non-technical stakeholders (such as product managers or business executives)? Can you share an example?`,
      expectedCompetencies: ['Empathy', 'Translation of Complexity', 'Consensus Building'],
    },
    {
      topic: 'Handling Constructive Feedback',
      phase: 'Growth Mindset',
      question: `Can you recall a piece of critical feedback you received from a peer, manager, or client that was difficult to hear initially? How did you process it and apply it to your professional growth?`,
      expectedCompetencies: ['Receptivity', 'Continuous Improvement', 'Maturity'],
    },
    {
      topic: 'Long-term Career Vision & Culture',
      phase: 'Strategic Alignment',
      question: `Looking ahead 2 to 3 years, what kind of technical challenges or leadership impact are you striving to lead, and how does this role align with those aspirations?`,
      expectedCompetencies: ['Strategic Vision', 'Self-Direction', 'Organizational Impact'],
    },
  ];

  const techQuestions = [
    {
      topic: 'Past Architecture Deep Dive',
      phase: 'Resume Deep Dive',
      question: `Looking at your resume, you highlighted building systems involving ${resumeAnchor}. Could you walk me through the high-level architecture of your most impactful project, the critical decisions you made, and how data flowed through the system?`,
      expectedCompetencies: ['System Walkthrough', 'Architecture Justification', 'Clarity'],
    },
    {
      topic: `${topTech} & Core Engineering`,
      phase: 'Technical Deep Dive',
      question: `This role heavily emphasizes hands-on mastery of ${topTech} and modern backend patterns. How would you design a high-performance concurrency or request-handling pipeline in ${topTech}, and how do you prevent event-loop or thread starvation?`,
      expectedCompetencies: ['Concurrency Model', 'Runtime Internals', 'Code Optimization'],
    },
    {
      topic: 'High Scale & Distributed Caching',
      phase: 'Scalability & System Design',
      question: `Suppose our service experiences a 10x traffic surge to 50,000 requests/sec with tight p99 latency SLA (<50ms). How would you architect ${secondaryTech} and database partitioning to prevent cascading failures?`,
      expectedCompetencies: ['Distributed Caching', 'Cache Invalidation', 'Database Sharding'],
    },
    {
      topic: 'Architecture Trade-offs & Decoupling',
      phase: 'System Trade-offs',
      question: `When designing microservices, how do you evaluate the trade-offs between synchronous RPC (like gRPC/REST) versus asynchronous event-driven messaging (like Kafka)? In what scenarios would you choose eventual consistency over strong consistency?`,
      expectedCompetencies: ['CAP Theorem', 'Event-Driven Architecture', 'Failure Isolation'],
    },
    {
      topic: 'Production Outages & Observability',
      phase: 'Production Reliability',
      question: `Imagine you are on-call and receive a production alert: API response times have tripled, but CPU and memory utilization on the host instances remain low. What systematic process would you follow to diagnose, isolate, and mitigate the issue?`,
      expectedCompetencies: ['Observability & Metrics', 'Bottleneck Isolation', 'Incident Response'],
    },
    {
      topic: 'Database Concurrency & ACID Guarantees',
      phase: 'Data Consistency',
      question: `In a high-throughput transaction processing environment, how do you prevent race conditions, deadlocks, and phantom reads? When would you choose optimistic concurrency control over pessimistic locking?`,
      expectedCompetencies: ['Isolation Levels', 'Locking Strategies', 'Transaction Integrity'],
    },
    {
      topic: 'Resilience Patterns & Circuit Breakers',
      phase: 'Fault Tolerance',
      question: `When an upstream downstream dependency begins timing out or returning 500 errors intermittently, what design patterns (circuit breakers, exponential backoff with jitter, bulkhead isolation) do you implement to safeguard the primary cluster?`,
      expectedCompetencies: ['Degradation Modes', 'Backoff Algorithms', 'Fault Tolerance'],
    },
    {
      topic: 'Security, Identity & Zero Trust',
      phase: 'System Security',
      question: `How do you design secure service-to-service authentication and authorization in a distributed microservices environment? How do you handle secrets rotation and defend against injection/SSRF vulnerabilities?`,
      expectedCompetencies: ['Zero Trust', 'Token Validation', 'Vulnerability Mitigation'],
    },
    {
      topic: 'Disaster Recovery & Multi-Region',
      phase: 'High Availability',
      question: `If an entire cloud availability zone or primary region experiences an outage, what is your strategy for automated failover, DNS routing, and state replication to satisfy Recovery Point Objective (RPO) and Recovery Time Objective (RTO)?`,
      expectedCompetencies: ['Geo-Replication', 'Failover Orchestration', 'RPO/RTO'],
    },
  ];

  const pool = isHr ? hrQuestions : techQuestions;
  const selected = pool.slice(0, Math.min(targetCount, pool.length));

  return selected.map((q, idx) => ({
    index: idx,
    ...q,
  }));
}

/**
 * Dynamically generate the next progressive question when time permits and the current list is exhausted
 */
async function generateNextAdaptiveQuestion({
  session,
  timeRemainingMinutes = 15,
  currentQuestionIndex = 5,
}) {
  const isHr = session.interviewType === 'hr';
  const role = session.role || 'Software Engineer';
  const jdKeywords = extractTechKeywords(session.jobDescription || '');
  const resumeKeywords = extractTechKeywords(session.resumeText || '');

  // Extract recent topics already asked
  const askedTopics = (session.questions || []).map((q) => q.topic).join(', ');

  const systemPrompt = isHr
    ? `You are a Principal Talent Partner conducting an executive behavioral interview for ${role}.
The candidate has already answered questions on: ${askedTopics}.
There are still approximately ${Math.round(timeRemainingMinutes)} minutes remaining in the session.
Generate ONE progressive, deep-dive behavioral or leadership follow-up question that has NOT been covered yet.
Focus on complex scenarios (e.g., cross-functional leadership, ethical dilemmas, organizational change).
Return a valid JSON object:
{
  "topic": "Concise Topic Name",
  "phase": "Advanced Deep Dive",
  "question": "Engaging, direct interview question...",
  "expectedCompetencies": ["Competency A", "Competency B"]
}`
    : `You are a Principal Software Architect conducting an advanced technical interview for ${role}.
The candidate has already answered questions on: ${askedTopics}.
There are still approximately ${Math.round(timeRemainingMinutes)} minutes remaining in the session.
Generate ONE progressive, deep-dive architectural or engineering trade-off question exploring areas not yet covered (such as zero-downtime database migrations, distributed consensus, security audits, or performance profiling).
Return a valid JSON object:
{
  "topic": "Concise Topic Name",
  "phase": "Advanced System Probe",
  "question": "Clear, technically rigorous interview question...",
  "expectedCompetencies": ["Technical Competency A", "Technical Competency B"]
}`;

  const result = await generateCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate the next progressive question for topic index ${currentQuestionIndex + 1}.` },
    ],
    {
      temperature: 0.7,
      jsonMode: true,
      fallbackGenerator: () => {
        const pool = isHr
          ? [
              {
                topic: 'Organizational Evolution & Culture',
                phase: 'Advanced Leadership',
                question: `As an engineering leader, how do you balance maintaining team velocity with ensuring code quality and psychological safety during periods of hypergrowth?`,
                expectedCompetencies: ['Culture Building', 'Engineering Rigor'],
              },
              {
                topic: 'Navigating Ethical Dilemmas',
                phase: 'Ethics & Integrity',
                question: `Have you ever faced a scenario where business pressure incentivized cutting critical corners in security or user privacy? How did you advocate for the right long-term path?`,
                expectedCompetencies: ['Integrity', 'Executive Influence'],
              },
            ]
          : [
              {
                topic: 'Zero-Downtime Data Migration',
                phase: 'Advanced Distributed Data',
                question: `How would you execute a zero-downtime database schema migration on a table with 500 million active rows under continuous read/write load without locking tables or degrading SLA?`,
                expectedCompetencies: ['Online DDL', 'Dual-Write Patterns', 'Zero-Downtime'],
              },
              {
                topic: 'Distributed Consensus & Raft/Paxos',
                phase: 'Distributed Systems',
                question: `Can you explain how distributed consensus protocols like Raft or Paxos guarantee linearizability during network partitions (split-brain scenarios)?`,
                expectedCompetencies: ['Consensus Protocols', 'Quorums', 'CAP Theorem'],
              },
            ];
        const item = pool[currentQuestionIndex % pool.length];
        return {
          topic: item.topic,
          phase: item.phase,
          question: item.question,
          expectedCompetencies: item.expectedCompetencies,
        };
      },
    }
  );

  return {
    index: currentQuestionIndex,
    topic: result?.topic || `Advanced Focus Area ${currentQuestionIndex + 1}`,
    phase: result?.phase || 'Extended Exploration',
    question: result?.question || `Let's dive into another key technical dimension: how do you manage high-availability state across distributed instances?`,
    expectedCompetencies: Array.isArray(result?.expectedCompetencies) ? result.expectedCompetencies : ['Analytical Reasoning'],
  };
}

module.exports = {
  generateInterviewPlan,
  generateNextAdaptiveQuestion,
  extractTechKeywords,
};
