/**
 * Question Model
 * Stores coding problems used in matches
 */

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy',
  },
  // Tags like "arrays", "strings", "dynamic programming"
  tags: [{ type: String }],
  // Example test cases shown to the user
  examples: [
    {
      input: { type: String },
      output: { type: String },
      explanation: { type: String },
    },
  ],
  // Hidden test cases used for validation (not shown to user)
  testCases: [
    {
      input: { type: String, required: true },
      expectedOutput: { type: String, required: true },
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

module.exports = mongoose.model('Question', questionSchema);
