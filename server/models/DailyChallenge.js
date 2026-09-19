const mongoose = require('mongoose');

const dailyChallengeSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  date: {
    type: String, // "YYYY-MM-DD"
    required: true,
    unique: true,
    index: true,
  },
  resetsAt: {
    type: Date,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
  },
  totalSolves: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);
