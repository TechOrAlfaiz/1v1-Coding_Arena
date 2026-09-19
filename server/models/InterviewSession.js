/**
 * InterviewSession Model
 * Stores active and archived AI mock interview conversations,
 * candidate code, whiteboard diagram states, and evaluation references.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['interviewer', 'candidate', 'system'],
    default: 'interviewer',
  },
  speaker: {
    type: String,
    default: 'interviewer',
  },
  content: {
    type: String,
  },
  message: {
    type: String,
  },
  isHint: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const interviewSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['coding', 'system_design', 'behavioral', 'mixed', 'live_avatar'],
    default: 'coding',
  },
  mode: {
    type: String,
    enum: ['standard', 'live_avatar'],
    default: 'standard',
  },
  interviewType: {
    type: String,
    enum: ['technical', 'hr', 'coding', 'system_design', 'behavioral', 'mixed'],
    default: 'technical',
  },
  jobDescription: {
    type: String,
    default: '',
  },
  resumeText: {
    type: String,
    default: '',
  },
  experienceLevel: {
    type: String,
    default: 'mid',
  },
  targetRole: {
    type: String,
    default: 'Software Engineer',
  },
  role: {
    type: String,
    default: 'Software Engineer',
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
  },
  companyName: {
    type: String,
    default: 'General Tech',
  },
  difficulty: {
    type: String,
    default: 'Medium',
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    default: null,
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
  questionDescription: {
    type: String,
    default: '',
  },
  interviewerPersona: {
    type: String,
    default: 'Balanced & Encouraging',
  },
  questions: [
    {
      index: { type: Number, default: 0 },
      question: { type: String, required: true },
      topic: { type: String, default: '' },
      phase: { type: String, default: '' },
      expectedCompetencies: [{ type: String }],
    },
  ],
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['configuring', 'in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
  },
  isClosing: {
    type: Boolean,
    default: false,
  },
  durationLimit: {
    type: Number,
    default: 2700,
  },
  durationMinutes: {
    type: Number,
    default: 45,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
  candidateCode: {
    type: String,
    default: '',
  },
  codeLanguage: {
    type: String,
    default: 'javascript',
  },
  language: {
    type: String,
    default: 'javascript',
  },
  // Whiteboard canvas elements
  systemDesignElements: {
    type: Array,
    default: [],
  },
  systemDesignDiagram: {
    elements: {
      type: Array,
      default: [],
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  // Unified transcript / messages list
  transcript: [messageSchema],
  messages: [messageSchema],
  hintsUsed: {
    type: Number,
    default: 0,
  },
  codeExecutions: {
    type: Number,
    default: 0,
  },
  evaluation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewReport',
    default: null,
  },
  score: {
    type: Number,
    default: null,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save synchronization hook to ensure dual field consistency
interviewSessionSchema.pre('save', function (next) {
  if (this.company && !this.companyId) this.companyId = this.company;
  else if (this.companyId && !this.company) this.company = this.companyId;

  if (this.question && !this.questionId) this.questionId = this.question;
  else if (this.questionId && !this.question) this.question = this.questionId;

  if (this.role && !this.targetRole) this.targetRole = this.role;
  else if (this.targetRole && !this.role) this.role = this.targetRole;

  if (this.durationMinutes && !this.durationLimit) this.durationLimit = this.durationMinutes * 60;
  else if (this.durationLimit && !this.durationMinutes) this.durationMinutes = Math.round(this.durationLimit / 60);

  if (Array.isArray(this.transcript)) {
    this.transcript.forEach((msg) => {
      if (msg.speaker && !msg.role) msg.role = msg.speaker;
      else if (msg.role && !msg.speaker) msg.speaker = msg.role;

      if (msg.message && !msg.content) msg.content = msg.message;
      else if (msg.content && !msg.message) msg.message = msg.content;
    });
  }
  next();
});

interviewSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
