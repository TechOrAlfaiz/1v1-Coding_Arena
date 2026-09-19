/**
 * Parser & Aggregator for Company-Wise Question Lists
 * Reads metadata-only CSV files across company directories in:
 * server/data/sources/leetcode-company-wise-problems/<Company>/5. All.csv
 *
 * Normalizes into:
 * {
 *   title: string,
 *   slug: string,
 *   difficulty: 'easy' | 'medium' | 'hard',
 *   topics: string[],
 *   companies: string[],
 *   sourceLink: string,
 *   frequency: number,
 *   isPlayable: boolean
 * }
 *
 * Merges duplicates by slug/title with combined companies[] and topics[].
 * Integrates original playable starter problems with verified testCases.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../data/sources/leetcode-company-wise-problems');
const PLAYABLE_PATH = path.join(__dirname, '../data/starterPlayableProblems.json');
const OUTPUT_PATH = path.join(__dirname, '../data/unifiedQuestionBank.json');

function generateSlug(title) {
  return (title || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Simple robust CSV line splitter taking quotes into account
function parseCSVLine(text) {
  const result = [];
  let curr = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        curr += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(curr.trim());
      curr = '';
    } else {
      curr += c;
    }
  }
  result.push(curr.trim());
  return result;
}

function normalizeCompany(name) {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const map = {
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
    x: 'Twitter / X',
    bloomberg: 'Bloomberg',
    adobe: 'Adobe',
    salesforce: 'Salesforce',
    bytedance: 'ByteDance',
    tiktok: 'ByteDance',
    'goldman sachs': 'Goldman Sachs',
    oracle: 'Oracle',
    stripe: 'Stripe',
    palantir: 'Palantir',
    databricks: 'Databricks',
    cisco: 'Cisco',
    walmart: 'Walmart Labs',
    'walmart labs': 'Walmart Labs',
  };
  return map[lower] || trimmed;
}

function parseTopics(raw) {
  if (!raw) return [];
  return raw
    .split(/[,;|]/)
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function runAggregation() {
  console.log('🔍 Starting Company-Wise Question Parser & Aggregator...');

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const companyDirs = fs.readdirSync(SOURCE_DIR).filter((f) => {
    return fs.statSync(path.join(SOURCE_DIR, f)).isDirectory() && !f.startsWith('.');
  });

  console.log(`📁 Found ${companyDirs.length} company directories.`);

  // Map: slug -> unified question object
  const questionMap = new Map();
  let totalRowsParsed = 0;
  let totalErrors = 0;

  for (const companyFolder of companyDirs) {
    const companyName = normalizeCompany(companyFolder);
    const companyPath = path.join(SOURCE_DIR, companyFolder);

    // Prefer "5. All.csv", else largest CSV file
    const csvFiles = fs.readdirSync(companyPath).filter((f) => f.endsWith('.csv'));
    if (csvFiles.length === 0) continue;

    let targetCSV = csvFiles.find((f) => f.toLowerCase().includes('all')) || csvFiles[csvFiles.length - 1];
    const fullCSVPath = path.join(companyPath, targetCSV);

    try {
      const content = fs.readFileSync(fullCSVPath, 'utf8');
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) continue;

      const header = lines[0].toLowerCase();
      const colMap = {};
      parseCSVLine(header).forEach((col, idx) => {
        colMap[col.trim()] = idx;
      });

      const diffIdx = colMap['difficulty'] ?? 0;
      const titleIdx = colMap['title'] ?? 1;
      const freqIdx = colMap['frequency'] ?? 2;
      const linkIdx = colMap['link'] ?? 4;
      const topicIdx = colMap['topics'] ?? 5;

      for (let i = 1; i < lines.length; i++) {
        totalRowsParsed++;
        const row = parseCSVLine(lines[i]);
        const title = row[titleIdx] ? row[titleIdx].replace(/^["']|["']$/g, '').trim() : '';
        if (!title) continue;

        let diff = (row[diffIdx] || 'medium').toLowerCase().trim();
        if (!['easy', 'medium', 'hard'].includes(diff)) diff = 'medium';

        const freq = parseFloat(row[freqIdx] || '0') || 0;
        const link = (row[linkIdx] || '').replace(/^["']|["']$/g, '').trim();
        const rawTopics = row[topicIdx] || '';
        const topics = parseTopics(rawTopics);

        // Determine slug
        let slug = generateSlug(title);
        if (link && link.includes('/problems/')) {
          const m = link.match(/\/problems\/([^/]+)/);
          if (m && m[1]) slug = m[1].toLowerCase().trim();
        }

        if (questionMap.has(slug)) {
          const existing = questionMap.get(slug);
          // Add company if not present
          if (companyName && !existing.companies.includes(companyName)) {
            existing.companies.push(companyName);
          }
          // Merge topics
          topics.forEach((t) => {
            if (!existing.topics.includes(t)) existing.topics.push(t);
          });
          // Update frequency (keep highest frequency recorded across company interviews)
          if (freq > existing.frequency) {
            existing.frequency = freq;
          }
          if (!existing.sourceLink && link) {
            existing.sourceLink = link;
          }
        } else {
          questionMap.set(slug, {
            title,
            slug,
            difficulty: diff,
            category: 'coding',
            topic: topics[0] || 'Algorithms',
            topics,
            companies: companyName ? [companyName] : [],
            tags: topics,
            companyTags: companyName ? [companyName] : [],
            sourceLink: link || `https://leetcode.com/problems/${slug}/`,
            frequency: freq,
            isPlayable: false,
            description: `Refer to the problem statement via the source link.`,
            constraints: [],
            examples: [],
            testCases: [],
            starterCode: {
              javascript: '// Solution template\n',
              python: '# Solution template\n',
              cpp: '// Solution template\n',
              java: '// Solution template\n',
            },
          });
        }
      }
    } catch (err) {
      totalErrors++;
      console.warn(`⚠️ Error reading company file ${fullCSVPath}:`, err.message);
    }
  }

  console.log(`\n📊 Parsed ${totalRowsParsed} company problem entries.`);
  console.log(`✨ Deduplicated into ${questionMap.size} unique questions.`);

  // Also ingest metadata from codejeet (3400+ problems with topic/difficulty tags)
  const CODEJEET_DIR = path.join(__dirname, '../data/sources/codejeet/data/problems');
  if (fs.existsSync(CODEJEET_DIR)) {
    console.log(`\n📚 Ingesting topic-tagged problem metadata from: ${CODEJEET_DIR}...`);
    try {
      const codejeetFiles = fs.readdirSync(CODEJEET_DIR).filter((f) => f.endsWith('.json'));
      let addedFromCodejeet = 0;
      for (const f of codejeetFiles) {
        try {
          const filePath = path.join(CODEJEET_DIR, f);
          const p = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const title = (p.title || '').trim();
          if (!title) continue;

          let slug = p.slug ? p.slug.toLowerCase().trim() : generateSlug(title);
          let diff = (p.difficulty || 'medium').toLowerCase().trim();
          if (!['easy', 'medium', 'hard'].includes(diff)) diff = 'medium';

          const topics = Array.isArray(p.topics) ? p.topics : [];

          if (questionMap.has(slug)) {
            const existing = questionMap.get(slug);
            topics.forEach((t) => {
              if (!existing.topics.includes(t)) existing.topics.push(t);
            });
          } else {
            questionMap.set(slug, {
              title,
              slug,
              difficulty: diff,
              category: 'coding',
              topic: topics[0] || 'Algorithms',
              topics,
              companies: [],
              tags: topics,
              companyTags: [],
              sourceLink: `https://leetcode.com/problems/${slug}/`,
              frequency: 0,
              isPlayable: false,
              description: `Refer to the problem statement via the source link.`,
              constraints: [],
              examples: [],
              testCases: [],
              starterCode: {
                javascript: '// Solution template\n',
                python: '# Solution template\n',
                cpp: '// Solution template\n',
                java: '// Solution template\n',
              },
            });
            addedFromCodejeet++;
          }
        } catch (e) {
          // Ignore individual malformed files
        }
      }
      console.log(`✅ Ingested ${addedFromCodejeet} additional unique problems from codejeet.`);
    } catch (e) {
      console.warn('⚠️ Could not read codejeet dataset:', e.message);
    }
  }

  // Overlay original playable problems if available
  if (fs.existsSync(PLAYABLE_PATH)) {
    console.log(`\n🎮 Merging original playable problems with test cases from: ${PLAYABLE_PATH}`);
    try {
      const playableList = JSON.parse(fs.readFileSync(PLAYABLE_PATH, 'utf8'));
      let mergedPlayable = 0;

      for (const p of playableList) {
        const slug = p.slug || generateSlug(p.title);
        if (questionMap.has(slug)) {
          const target = questionMap.get(slug);
          target.isPlayable = true;
          target.description = p.description || target.description;
          target.constraints = p.constraints || target.constraints;
          target.examples = p.examples || target.examples;
          target.testCases = p.testCases || target.testCases;
          target.starterCode = p.starterCode || target.starterCode;
          // Merge companies & topics
          (p.companies || []).forEach((c) => {
            if (!target.companies.includes(c)) target.companies.push(c);
          });
          (p.topics || []).forEach((t) => {
            if (!target.topics.includes(t)) target.topics.push(t);
          });
          mergedPlayable++;
        } else {
          p.isPlayable = true;
          questionMap.set(slug, p);
          mergedPlayable++;
        }
      }
      console.log(`✅ Integrated ${mergedPlayable} playable questions into the bank.`);
    } catch (e) {
      console.warn('⚠️ Could not overlay playable problems:', e.message);
    }
  }

  const finalList = Array.from(questionMap.values());

  // Sort by frequency descending
  finalList.sort((a, b) => b.frequency - a.frequency);

  // Breakdown statistics
  const diffCount = { easy: 0, medium: 0, hard: 0 };
  const companyCounts = {};
  const topicCounts = {};
  let playableCount = 0;

  finalList.forEach((q) => {
    diffCount[q.difficulty] = (diffCount[q.difficulty] || 0) + 1;
    if (q.isPlayable) playableCount++;
    q.companies.forEach((c) => {
      companyCounts[c] = (companyCounts[c] || 0) + 1;
    });
    q.topics.forEach((t) => {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
  });

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log('\n========================================================================');
  console.log('📈 UNIFIED QUESTION BANK STATISTICS');
  console.log('========================================================================');
  console.log(`Total Unique Questions : ${finalList.length}`);
  console.log(`In-App Playable Duels  : ${playableCount}`);
  console.log(`Difficulty Breakdown   : Easy: ${diffCount.easy} | Medium: ${diffCount.medium} | Hard: ${diffCount.hard}`);
  console.log('\nTop 15 Company Tag Counts:');
  topCompanies.forEach(([c, cnt]) => console.log(`  - ${c.padEnd(20)}: ${cnt} questions`));
  console.log('\nTop 15 Topic Tag Counts:');
  topTopics.forEach(([t, cnt]) => console.log(`  - ${t.padEnd(25)}: ${cnt} questions`));
  console.log('========================================================================');

  // Save to JSON
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalList, null, 2), 'utf8');
  console.log(`\n💾 Saved unified dataset to: ${OUTPUT_PATH} (${(fs.statSync(OUTPUT_PATH).size / (1024 * 1024)).toFixed(2)} MB)\n`);
}

runAggregation();
