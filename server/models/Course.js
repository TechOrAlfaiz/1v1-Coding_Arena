/**
 * Course Model
 * Interactive learning tracks, deep-dive lessons, quizzes, and visual diagrams.
 */

const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['dsa', 'system_design', 'frontend', 'backend', 'behavioral'],
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: 'BookOpen',
  },
  color: {
    type: String,
    default: '#00d4ff',
  },
  xpReward: {
    type: Number,
    default: 150,
  },
  estimatedHours: {
    type: Number,
    default: 4,
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
  },
  modules: [
    {
      title: { type: String, required: true },
      lessons: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          duration: { type: String, default: '15 mins' },
          summary: { type: String },
          contentMarkdown: { type: String, required: true },
          codeSnippet: { type: String, default: '' },
          keyTakeaways: [{ type: String }],
          quiz: [
            {
              question: { type: String, required: true },
              options: [{ type: String, required: true }],
              correctAnswer: { type: Number, required: true }, // Index 0..3
              explanation: { type: String },
            },
          ],
        },
      ],
    },
  ],
  enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

courseSchema.index({ category: 1 });

module.exports = mongoose.model('Course', courseSchema);
