/**
 * InterviewReport Model
 * Stores comprehensive AI evaluation dossiers, 0–5 transparent rubric scores,
 * code reviews, strengths, weaknesses, and personalized recommendations.
 */

const mongoose = require('mongoose');

const interviewReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
  },
  interviewType: {
    type: String,
    enum: ['coding', 'system_design', 'behavioral', 'mixed', 'live_avatar', 'technical', 'hr'],
    default: 'coding',
  },
  role: {
    type: String,
    default: 'Software Engineer',
  },
  targetRole: {
    type: String,
    default: 'Software Engineer',
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
  },
  companyName: {
    type: String,
    default: 'Tech',
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    default: null,
  },
  questionTitle: {
    type: String,
    default: '',
  },
  durationMinutes: {
    type: Number,
    default: 45,
  },
  difficulty: {
    type: String,
    default: 'Medium',
  },
  overallRating: {
    type: Number,
    default: 3.5,
  },
  overallScore: {
    type: Number,
    default: 70,
  },
  verdict: {
    type: String,
    default: 'Hire',
  },
  performanceVerdict: {
    type: String,
    default: 'Hire',
  },
  executiveSummary: {
    type: String,
    default: '',
  },
  rubric: {
    type: Object,
    default: {
      problemSolving: 3.5,
      codeQuality: 3.5,
      technicalKnowledge: 3.5,
      communication: 4.0,
      complexityAnalysis: 3.0,
      edgeCaseHandling: 3.0,
      systemDesign: 3.5,
      behavioralResponse: 3.5,
    },
  },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  improvementAreas: [{ type: String }],
  keyRecommendations: [{ type: String }],
  codeReview: {
    type: Object,
    default: {
      correctness: 'Code demonstrates logical flow.',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      suggestions: [],
    },
  },
  systemDesignReview: {
    type: Object,
    default: null,
  },
  systemDesignCritique: {
    type: Object,
    default: null,
  },
  behavioralCritique: {
    type: Object,
    default: null,
  },
  recommendations: {
    type: Array,
    default: [],
  },
  transcriptSummary: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save synchronization hook to ensure dual field consistency
interviewReportSchema.pre('save', function (next) {
  if (this.role && !this.targetRole) this.targetRole = this.role;
  else if (this.targetRole && !this.role) this.role = this.targetRole;

  if (this.verdict && !this.performanceVerdict) this.performanceVerdict = this.verdict;
  else if (this.performanceVerdict && !this.verdict) this.verdict = this.performanceVerdict;

  if (this.overallRating !== undefined && this.overallScore === undefined) {
    this.overallScore = Math.round(this.overallRating * 20);
  } else if (this.overallScore !== undefined && this.overallRating === undefined) {
    this.overallRating = parseFloat((this.overallScore / 20).toFixed(1));
  }
  next();
});

interviewReportSchema.index({ userId: 1, createdAt: -1 });
interviewReportSchema.index({ sessionId: 1 });

module.exports = mongoose.model('InterviewReport', interviewReportSchema);
