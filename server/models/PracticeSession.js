/**
 * PracticeSession Model
 * Stores solo mock interview runs, approach explanations,
 * benchmark comparisons, test results, and focus metrics.
 */

const mongoose = require('mongoose');

const practiceSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  duration: {
    type: Number, // Allotted minutes (e.g. 30, 45, 60)
    required: true,
  },
  timeTaken: {
    type: Number, // Seconds spent before submit/finish
    default: 0,
  },
  idealSolveTime: {
    type: Number, // Benchmark in minutes
    default: 25,
  },
  approachText: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    default: '',
  },
  language: {
    type: String,
    default: 'javascript',
  },
  allPassed: {
    type: Boolean,
    default: false,
  },
  results: [
    {
      input: { type: String },
      expectedOutput: { type: String },
      actualOutput: { type: String },
      passed: { type: Boolean },
      error: { type: String },
    },
  ],
  distractionCount: {
    type: Number,
    default: 0,
  },
  complexity: {
    time: { type: String, default: 'O(N)' },
    space: { type: String, default: 'O(1)' },
    note: { type: String, default: 'Algorithmic efficiency meets standard interview benchmarks.' },
  },
  status: {
    type: String,
    enum: ['completed', 'timed_out'],
    default: 'completed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for user practice history queries
practiceSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PracticeSession', practiceSessionSchema);
