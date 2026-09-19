/**
 * Bulk Question Import Pipeline
 * Supports importing large question bank datasets (JSON or CSV)
 * Features:
 *   - Duplicate detection by slug & title
 *   - Dry-run validation mode (--dry-run)
 *   - Upsert or skip mode (--upsert)
 *   - Batch insertion for high volume (4000+ items)
 *   - Normalization of difficulty, topics, companies, and links
 *
 * Usage:
 *   node server/scripts/importQuestions.js --file=path/to/questions.json --dry-run
 *   node server/scripts/importQuestions.js --file=path/to/questions.json
 *   node server/scripts/importQuestions.js --file=path/to/questions.csv --upsert
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configure public DNS resolvers to handle SRV queries on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported
}

const Question = require('../models/Question');

// Parse CLI flags
const args = process.argv.slice(2);
const getArg = (name) => {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  return match ? match.split('=')[1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const filePath = getArg('file');
const isDryRun = hasFlag('dry-run');
const isUpsert = hasFlag('upsert');
const batchSize = parseInt(getArg('batch-size') || '500', 10);

if (!filePath) {
  console.log(`
========================================================================
⚡ 1v1 Coding Arena - Bulk Question Importer ⚡
========================================================================
Usage:
  node server/scripts/importQuestions.js --file=<filepath> [options]

Options:
  --file=<path>        Path to JSON or CSV question dataset (Required)
  --dry-run            Validate & report without committing to database
  --upsert             Update existing questions matching by slug/title
  --batch-size=<num>   Batch insert size (default: 500)

Supported Format (JSON array of objects or CSV):
  {
    "title": "Two Sum",
    "difficulty": "Easy",
    "topics": ["Array", "Hash Table"],
    "companies": ["Google", "Amazon", "Meta"],
    "sourceLink": "https://leetcode.com/problems/two-sum/",
    "statement": "Optional original statement...",
    "constraints": ["2 <= nums.length <= 10^4"],
    "testCases": [{ "input": "...", "expectedOutput": "..." }]
  }
========================================================================
`);
  process.exit(1);
}

// Generate URL-safe slug
function generateSlug(title) {
  return (title || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Normalize company names
function normalizeCompany(company) {
  if (!company) return '';
  const trimmed = company.trim();
  const lower = trimmed.toLowerCase();
  const knownMap = {
    google: 'Google',
    amazon: 'Amazon',
    meta: 'Meta',
    facebook: 'Meta',
    microsoft: 'Microsoft',
    apple: 'Apple',
    netflix: 'Netflix',
    uber: 'Uber',
    airbnb: 'Airbnb',
    linkedin: 'LinkedIn',
    twitter: 'Twitter / X',
    bloomberg: 'Bloomberg',
    adobe: 'Adobe',
    salesforce: 'Salesforce',
    bytedance: 'ByteDance',
    tiktok: 'ByteDance',
    goldman: 'Goldman Sachs',
    'goldman sachs': 'Goldman Sachs',
    oracle: 'Oracle',
    stripe: 'Stripe',
    palantir: 'Palantir',
    databricks: 'Databricks',
  };
  return knownMap[lower] || trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// Normalize array of items (comma-separated string or array)
function normalizeArray(val, isCompany = false) {
  if (!val) return [];
  let items = [];
  if (Array.isArray(val)) {
    items = val;
  } else if (typeof val === 'string') {
    // Check if JSON array string
    if (val.trim().startsWith('[') && val.trim().endsWith(']')) {
      try {
        items = JSON.parse(val);
      } catch (e) {
        items = val.split(',');
      }
    } else {
      items = val.split(/[,;|]/);
    }
  }

  const cleaned = items
    .map((item) => (isCompany ? normalizeCompany(String(item)) : String(item).trim()))
    .filter(Boolean);

  // Deduplicate
  return Array.from(new Set(cleaned));
}

// Parse CSV simple parser
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // CSV regex supporting quoted strings
    const match = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!match) continue;

    const row = {};
    headers.forEach((h, colIdx) => {
      let val = match[colIdx] || '';
      val = val.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
      row[h] = val;
    });
    records.push(row);
  }
  return records;
}

async function run() {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ File not found at path: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`\n📂 Reading input file: ${resolvedPath}`);
  const rawData = fs.readFileSync(resolvedPath, 'utf8');
  let rawList = [];

  if (resolvedPath.endsWith('.json')) {
    try {
      rawList = JSON.parse(rawData);
      if (!Array.isArray(rawList)) {
        if (Array.isArray(rawList.questions)) rawList = rawList.questions;
        else if (Array.isArray(rawList.data)) rawList = rawList.data;
        else throw new Error('Root JSON must be an array or contain a "questions" array.');
      }
    } catch (err) {
      console.error('❌ Failed to parse JSON file:', err.message);
      process.exit(1);
    }
  } else if (resolvedPath.endsWith('.csv')) {
    rawList = parseCSV(rawData);
  } else {
    console.error('❌ Unsupported file format. Please provide a .json or .csv file.');
    process.exit(1);
  }

  console.log(`📊 Found ${rawList.length} candidate problem records in file.`);

  // Connect to MongoDB
  const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/coding-arena';
  console.log(`🔌 Connecting to MongoDB: ${mongoURI.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(mongoURI);
  console.log('✅ Connected to MongoDB.');

  // Pre-fetch all existing question slugs and titles for duplicate detection
  console.log('🔍 Fetching existing question slugs & titles from database for duplicate detection...');
  const existingRecords = await Question.find({}).select('slug title').lean();
  const existingSlugMap = new Map();
  const existingTitleMap = new Map();

  existingRecords.forEach((r) => {
    if (r.slug) existingSlugMap.set(r.slug, r._id);
    if (r.title) existingTitleMap.set(r.title.toLowerCase().trim(), r._id);
  });

  console.log(`ℹ️  Found ${existingRecords.length} existing questions currently in DB.`);

  let validToInsert = [];
  let validToUpdate = [];
  let skippedDuplicates = 0;
  let invalidRecords = 0;

  const seenInBatch = new Set();

  for (let idx = 0; idx < rawList.length; idx++) {
    const item = rawList[idx];
    const title = (item.title || item.name || '').trim();

    if (!title) {
      invalidRecords++;
      continue;
    }

    const slug = item.slug ? item.slug.toLowerCase().trim() : generateSlug(title);
    if (!slug || seenInBatch.has(slug)) {
      skippedDuplicates++;
      continue;
    }
    seenInBatch.add(slug);

    // Normalize difficulty
    let diff = (item.difficulty || 'easy').toLowerCase().trim();
    if (!['easy', 'medium', 'hard'].includes(diff)) {
      diff = 'medium';
    }

    // Normalize topics & companies
    const topics = normalizeArray(item.topics || item.topic || item.tags || item.topic_tags);
    const companies = normalizeArray(item.companies || item.companyTags || item.company_tags, true);
    const sourceLink = (item.sourceLink || item.link || item.url || item.source_link || '').trim();
    const description = (item.statement || item.description || (sourceLink ? `Refer to the problem description via the link below.` : '')).trim();

    // Test cases and playability
    const testCases = Array.isArray(item.testCases) ? item.testCases : [];
    const isPlayable = testCases.length > 0 && description.length > 20;

    const doc = {
      title,
      slug,
      difficulty: diff,
      category: item.category || 'coding',
      topic: topics[0] || 'Algorithms',
      topics,
      companies,
      tags: topics,
      companyTags: companies,
      sourceLink,
      description,
      isPlayable,
      constraints: Array.isArray(item.constraints) ? item.constraints : [],
      examples: Array.isArray(item.examples) ? item.examples : [],
      testCases,
      starterCode: item.starterCode || {
        javascript: '// Write your solution here\n',
        python: '# Write your solution here\n',
        cpp: '// Write your solution here\n',
        java: '// Write your solution here\n',
      },
      idealSolveTime: item.idealSolveTime || (diff === 'easy' ? 15 : diff === 'medium' ? 25 : 40),
    };

    const isDuplicate = existingSlugMap.has(slug) || existingTitleMap.has(title.toLowerCase().trim());

    if (isDuplicate) {
      if (isUpsert) {
        const existingId = existingSlugMap.get(slug) || existingTitleMap.get(title.toLowerCase().trim());
        validToUpdate.push({ id: existingId, data: doc });
      } else {
        skippedDuplicates++;
      }
    } else {
      validToInsert.push(doc);
    }
  }

  console.log('\n========================================================================');
  console.log('📋 IMPORT PIPELINE ANALYSIS REPORT');
  console.log('========================================================================');
  console.log(`Total records read from file : ${rawList.length}`);
  console.log(`Valid new questions to insert: ${validToInsert.length}`);
  console.log(`Existing questions to update : ${validToUpdate.length} (upsert: ${isUpsert})`);
  console.log(`Duplicates skipped           : ${skippedDuplicates}`);
  console.log(`Invalid records skipped      : ${invalidRecords}`);
  console.log('========================================================================');

  if (isDryRun) {
    console.log('\n🛡️  DRY-RUN MODE ACTIVE: No changes were committed to MongoDB.');
    console.log('Run without --dry-run to commit these records.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Execute actual database operations
  let insertedCount = 0;
  let updatedCount = 0;

  if (validToInsert.length > 0) {
    console.log(`\n🚀 Inserting ${validToInsert.length} new questions in batches of ${batchSize}...`);
    for (let i = 0; i < validToInsert.length; i += batchSize) {
      const batch = validToInsert.slice(i, i + batchSize);
      const res = await Question.insertMany(batch, { ordered: false });
      insertedCount += res.length;
      process.stdout.write(`  Inserted ${insertedCount}/${validToInsert.length} questions...\r`);
    }
    console.log(`\n✅ Completed insertion of ${insertedCount} new questions.`);
  }

  if (isUpsert && validToUpdate.length > 0) {
    console.log(`\n🔄 Updating ${validToUpdate.length} existing questions...`);
    for (const item of validToUpdate) {
      await Question.findByIdAndUpdate(item.id, { $set: item.data });
      updatedCount++;
    }
    console.log(`✅ Updated ${updatedCount} existing questions.`);
  }

  const finalTotal = await Question.countDocuments();
  console.log(`\n🎉 Success! Database now contains ${finalTotal} total questions.`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Fatal error during question import:', err);
  process.exit(1);
});
