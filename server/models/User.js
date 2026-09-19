/**
 * User Model
 * Stores user authentication data and ELO rating
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password in queries by default
  },
  // Rating / ELO System (default 1000)
  rating: {
    type: Number,
    default: 1000,
    min: 0,
  },
  elo: {
    type: Number,
    default: 1000,
    min: 0,
  },
  // Per-mode Elo ratings (coding, system-design, behavioral)
  ratings: {
    coding: { type: Number, default: 1000, min: 0 },
    systemDesign: { type: Number, default: 1000, min: 0 },
    behavioral: { type: Number, default: 1000, min: 0 },
  },
  // Streaks (arena matches)
  streaks: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
  },
  // Daily Challenge Streaks & Badges (LeetCode-style)
  dailyChallenge: {
    lastSolvedDate: { type: String, default: null }, // e.g. "2026-09-18"
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    solvedDates: [{ type: String }], // list of "YYYY-MM-DD"
    monthlyBadges: [
      {
        month: { type: String, required: true },
        year: { type: Number, required: true },
        type: { type: String, default: 'perfect-streak' },
        earnedAt: { type: Date, default: Date.now },
      },
    ],
  },
  // Special Wins
  specialWins: {
    firstBlood: { type: Number, default: 0 },
    comeback: { type: Number, default: 0 },
  },
  // Achievement Badges
  badges: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String },
      icon: { type: String },
      earnedAt: { type: Date, default: Date.now },
    },
  ],
  // Match statistics
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 },
  },
  // Gamification & XP System
  xp: {
    type: Number,
    default: 0,
    min: 0,
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
  },
  // Interview performance tracking
  interviewStats: {
    totalInterviews: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    codingAvg: { type: Number, default: 0 },
    systemDesignAvg: { type: Number, default: 0 },
    behavioralAvg: { type: Number, default: 0 },
  },
  // User role for admin permissions
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  // Avatar color (randomly assigned on signup)
  avatarColor: {
    type: String,
    default: () => {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
      return colors[Math.floor(Math.random() * colors.length)];
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for leaderboard rankings and matchmaking lookups
userSchema.index({ rating: -1 });
userSchema.index({ elo: -1 });
userSchema.index({ 'stats.totalMatches': 1, rating: -1 });

// Hash password before saving & sync rating/elo
userSchema.pre('save', async function (next) {
  if (this.rating !== undefined && this.elo === undefined) {
    this.elo = this.rating;
  } else if (this.elo !== undefined && this.rating === undefined) {
    this.rating = this.elo;
  }
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to calculate win rate
userSchema.virtual('winRate').get(function () {
  if (this.stats.totalMatches === 0) return 0;
  return Math.round((this.stats.wins / this.stats.totalMatches) * 100);
});

module.exports = mongoose.model('User', userSchema);
