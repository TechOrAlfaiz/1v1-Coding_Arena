/**
 * Match Model
 * Stores match data including participants, question, and result
 */

const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  // Two players in the match
  players: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      username: { type: String, required: true },
      socketId: { type: String },
      // Did this player submit a correct solution?
      solved: { type: Boolean, default: false },
      // When did they submit?
      solvedAt: { type: Date },
      // Rating / ELO before this match
      ratingAtMatch: { type: Number },
      ratingChange: { type: Number, default: 0 },
      eloAtMatch: { type: Number },
      eloChange: { type: Number, default: 0 },
      // Their submitted code
      lastCode: { type: String, default: '' },
      // Language used
      language: { type: String, default: 'javascript' },
      // Submission metrics for post-match approach diff
      executionTime: { type: Number, default: 0 },
      memory: { type: Number, default: 0 },
      linesOfCode: { type: Number, default: 0 },
      passedTests: { type: Number, default: 0 },
      totalTests: { type: Number, default: 0 },
    },
  ],
  // The coding question used in this match
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  },
  // Match status
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'abandoned'],
    default: 'waiting',
  },
  // Match type
  type: {
    type: String,
    enum: ['room', 'ranked', 'casual'],
    default: 'room',
  },
  // Interview battle mode
  mode: {
    type: String,
    enum: ['coding', 'system_design', 'behavioral'],
    default: 'coding',
  },
  // Winner (null = draw or ongoing)
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  winnerUsername: { type: String, default: null },
  // Match result reason
  resultReason: {
    type: String,
    enum: ['correct_submission', 'draw', 'timeout', 'opponent_left', null],
    default: null,
  },
  // Timestamps
  startedAt: { type: Date },
  endedAt: { type: Date },
  // Duration limit in seconds (default 15 minutes)
  durationLimit: { type: Number, default: 900 },
  // Interviewer Swap Round Q&A transcript
  transcript: [
    {
      sender: { type: String },
      role: { type: String, enum: ['interviewer', 'candidate', 'system'] },
      text: { type: String },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Index for faster queries
matchSchema.index({ createdAt: -1 });
matchSchema.index({ 'players.userId': 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ 'players.userId': 1, status: 1, endedAt: -1 });

module.exports = mongoose.model('Match', matchSchema);
