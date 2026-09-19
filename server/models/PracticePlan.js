/**
 * PracticePlan Model
 * Personalized AI-generated 7-Day learning roadmaps targeted to a candidate's diagnostic weak areas.
 */

const mongoose = require('mongoose');

const practicePlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetRole: {
    type: String,
    default: 'Software Engineer',
  },
  targetCompanies: [{ type: String }],
  weakAreas: [{ type: String }],
  strengths: [{ type: String }],
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  days: [
    {
      dayNumber: { type: Number, required: true }, // 1 to 7
      date: { type: Date, default: Date.now },
      theme: { type: String, required: true },
      focusTopic: { type: String, default: 'General Problem Solving' },
      estimatedMinutes: { type: Number, default: 45 },
      isDayCompleted: { type: Boolean, default: false },
      tasks: [
        {
          id: {
            type: String,
            default: () => 'task_' + Math.random().toString(36).substring(2, 9),
          },
          title: { type: String, required: true },
          description: { type: String, default: '' },
          type: {
            type: String,
            default: 'coding_problem',
          },
          estimatedMinutes: { type: Number, default: 30 },
          question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            default: null,
          },
          targetGoal: { type: String, default: 'Solve within benchmark with optimal complexity' },
          completed: { type: Boolean, default: false },
          completedAt: { type: Date, default: null },
        },
      ],
    },
  ],
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active',
  },
  completionPercentage: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

practicePlanSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PracticePlan', practicePlanSchema);
