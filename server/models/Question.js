/**
 * Question Model
 * Stores coding problems used in matches, interview prep, and practice mode
 */

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy',
    index: true,
  },
  // Category: coding | system_design | behavioral
  category: {
    type: String,
    enum: ['coding', 'system_design', 'behavioral'],
    default: 'coding',
    index: true,
  },
  // Primary topic (e.g. Arrays, Two Pointers, Graphs, Dynamic Programming)
  topic: {
    type: String,
    default: 'Algorithms',
  },
  // Topics array (first-class indexed)
  topics: [{ type: String, trim: true, index: true }],
  // Companies array (first-class indexed)
  companies: [{ type: String, trim: true, index: true }],

  // Backward compatibility mirrors
  tags: [{ type: String, index: true }],
  companyTags: [{ type: String, index: true }],

  // External reference link (e.g. LeetCode / open problem link)
  sourceLink: {
    type: String,
    trim: true,
    default: '',
  },

  // Frequency metric (e.g. appearance count across interviews)
  frequency: {
    type: Number,
    default: 0,
    index: true,
  },

  // Problem statement / description
  description: {
    type: String,
    default: '',
  },

  // Flag indicating if question is playable in-app with verified testCases
  isPlayable: {
    type: Boolean,
    default: false,
    index: true,
  },

  // Ideal solve time benchmark in minutes (e.g. Easy=15, Medium=25, Hard=40)
  idealSolveTime: { type: Number, default: 25 },
  // Problem constraints (e.g. 1 <= nums.length <= 10^5)
  constraints: [{ type: String }],
  // Progressive hints provided during interview when candidate is stuck
  hints: [{ type: String }],
  // Detailed solution explanation for post-interview learning
  solutionExplanation: {
    type: String,
    default: '',
  },
  // Follow-up probe questions asked by the AI interviewer
  followUpQuestions: [{ type: String }],
  // Example test cases shown to the user
  examples: [
    {
      input: { type: String },
      output: { type: String },
      explanation: { type: String },
    },
  ],
  // Hidden test cases used for validation (Judge0 / child_process execution)
  testCases: [
    {
      input: { type: String },
      expectedOutput: { type: String },
    },
  ],
  // Starter code templates for each language
  starterCode: {
    javascript: { type: String, default: '// Write your solution here\n' },
    python: { type: String, default: '# Write your solution here\n' },
    cpp: { type: String, default: '// Write your solution here\n#include<bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your code\n    return 0;\n}\n' },
    java: { type: String, default: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // your code\n    }\n}\n' },
  },
  createdAt: { type: Date, default: Date.now },
});

// Helper to generate a URL-safe slug from title
function generateSlug(title) {
  return (title || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Auto-sync hooks and slug generator
questionSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = generateSlug(this.title);
  }

  // Sync topics <-> tags
  if (Array.isArray(this.topics) && this.topics.length > 0) {
    if (!this.tags || this.tags.length === 0) {
      this.tags = [...this.topics];
    }
  } else if (Array.isArray(this.tags) && this.tags.length > 0) {
    this.topics = [...this.tags];
  }

  // Sync companies <-> companyTags
  if (Array.isArray(this.companies) && this.companies.length > 0) {
    if (!this.companyTags || this.companyTags.length === 0) {
      this.companyTags = [...this.companies];
    }
  } else if (Array.isArray(this.companyTags) && this.companyTags.length > 0) {
    this.companies = [...this.companyTags];
  }

  // Update isPlayable flag if test cases exist
  if (Array.isArray(this.testCases) && this.testCases.length > 0) {
    this.isPlayable = true;
  }

  // Normalize difficulty to lowercase
  if (this.difficulty) {
    this.difficulty = this.difficulty.toLowerCase();
  }

  next();
});

// Compound indexes for ultra-fast filtered queries (avoid indexing two arrays together)
questionSchema.index({ companies: 1, difficulty: 1 });
questionSchema.index({ topics: 1, difficulty: 1 });
questionSchema.index({ isPlayable: 1, difficulty: 1 });
questionSchema.index({ frequency: -1 });

module.exports = mongoose.model('Question', questionSchema);
