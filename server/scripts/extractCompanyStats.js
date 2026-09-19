/**
 * extractCompanyStats.js
 * Parses leetcode-company-wise-problems and codejeet CSV datasets
 * to derive total question counts and top 4-5 focus topics per company.
 */

const fs = require('fs');
const path = require('path');

const LEETCODE_DIR = path.join(__dirname, '../data/sources/leetcode-company-wise-problems');
const CODEJEET_DIR = path.join(__dirname, '../data/sources/codejeet/data/companies');
const OUTPUT_FILE = path.join(__dirname, '../data/derivedCompanyStats.json');

// Helper to parse CSV line with quoted commas
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Clean topic string
function cleanTopic(topic) {
  return topic
    .trim()
    .replace(/^"|"$/g, '')
    .trim();
}

/**
 * Extract stats for a given company name / slug
 */
function extractStatsForCompany(companyName) {
  const topicCounts = {};
  const seenProblems = new Set();

  // 1. Try leetcode-company-wise-problems first (contains 5. All.csv)
  const leetcodePath = path.join(LEETCODE_DIR, companyName, '5. All.csv');
  if (fs.existsSync(leetcodePath)) {
    try {
      const content = fs.readFileSync(leetcodePath, 'utf8');
      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
      
      // Header: Difficulty,Title,Frequency,Acceptance Rate,Link,Topics
      for (let i = 1; i < lines.length; i++) {
        const parts = parseCsvLine(lines[i]);
        if (parts.length >= 2) {
          const title = parts[1]?.toLowerCase().trim();
          if (title && !seenProblems.has(title)) {
            seenProblems.add(title);

            // Topics column is usually at index 5
            const topicsRaw = parts.slice(5).join(',');
            if (topicsRaw) {
              const rawList = topicsRaw.split(',');
              rawList.forEach(t => {
                const cleaned = cleanTopic(t);
                if (cleaned && cleaned.length > 1) {
                  topicCounts[cleaned] = (topicCounts[cleaned] || 0) + 1;
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[WARN] Failed parsing ${leetcodePath}:`, err.message);
    }
  }

  // 2. Supplement / fallback with codejeet dataset
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const codejeetPath = path.join(CODEJEET_DIR, `${slug}.csv`);
  if (fs.existsSync(codejeetPath)) {
    try {
      const content = fs.readFileSync(codejeetPath, 'utf8');
      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

      // Header: ID,URL,Title,Difficulty,Acceptance %,Frequency %,Topics,Timeframe
      for (let i = 1; i < lines.length; i++) {
        const parts = parseCsvLine(lines[i]);
        if (parts.length >= 3) {
          const title = parts[2]?.toLowerCase().trim();
          if (title && !seenProblems.has(title)) {
            seenProblems.add(title);

            // Topics is at index 6
            const topicsRaw = parts[6];
            if (topicsRaw) {
              const rawList = topicsRaw.split(',');
              rawList.forEach(t => {
                const cleaned = cleanTopic(t);
                if (cleaned && cleaned.length > 1) {
                  topicCounts[cleaned] = (topicCounts[cleaned] || 0) + 1;
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[WARN] Failed parsing ${codejeetPath}:`, err.message);
    }
  }

  // Sort topics by frequency descending
  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);

  return {
    questionCount: seenProblems.size,
    keyFocusAreas: sortedTopics.slice(0, 5),
    allTopicsRanked: sortedTopics.slice(0, 10),
  };
}

// If run directly, process all available companies or a specific list
function run() {
  console.log('Extracting stats from local GitHub datasets...');
  const results = {};

  // Find all available companies in leetcode-company-wise-problems
  let companyFolders = [];
  if (fs.existsSync(LEETCODE_DIR)) {
    companyFolders = fs.readdirSync(LEETCODE_DIR).filter(f => {
      const full = path.join(LEETCODE_DIR, f);
      return fs.statSync(full).isDirectory() && !f.startsWith('.');
    });
  }

  companyFolders.forEach(comp => {
    const stats = extractStatsForCompany(comp);
    if (stats.questionCount > 0) {
      results[comp] = stats;
      results[comp.toLowerCase()] = stats;
    }
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Successfully derived stats for ${companyFolders.length} companies -> saved to ${OUTPUT_FILE}`);
}

module.exports = { extractStatsForCompany };

if (require.main === module) {
  run();
}
