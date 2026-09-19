/**
 * Company Model
 * Represents tech companies, their interview archetypes, roles, and patterns.
 */

const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  logo: {
    type: String, // SVG path or URL or brand color
    default: '',
  },
  brandColor: {
    type: String,
    default: '#00d4ff',
  },
  description: {
    type: String,
    default: '',
  },
  tier: {
    type: String,
    enum: ['FAANG', 'Tier 1 Product', 'Unicorn', 'Enterprise', 'High-Growth Startup'],
    default: 'Tier 1 Product',
  },
  roles: [
    {
      title: { type: String, required: true },
      experienceLevel: { type: String, enum: ['junior', 'mid', 'senior', 'staff'], default: 'mid' },
      salaryRange: { type: String },
    },
  ],
  interviewStages: [
    {
      stageName: { type: String, required: true }, // e.g., "Online Assessment", "Technical Phone Screen", "Virtual Onsite System Design"
      duration: { type: String, default: '45 mins' },
      description: { type: String },
    },
  ],
  keyFocusAreas: [{ type: String }], // e.g. ["Scalability", "Concurrency", "Clean Code", "Low Latency"]
  questionCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

companySchema.index({ tier: 1 });

module.exports = mongoose.model('Company', companySchema);
