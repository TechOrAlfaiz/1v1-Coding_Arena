/**
 * syncCompanies.js
 * Merges manual curated metadata from companyMeta.json with
 * auto-derived topics and question counts from derivedCompanyStats.json,
 * and upserts into MongoDB.
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Company = require('../models/Company');
const { extractStatsForCompany } = require('./extractCompanyStats');

const META_FILE = path.join(__dirname, '../data/companyMeta.json');
const STATS_FILE = path.join(__dirname, '../data/derivedCompanyStats.json');

async function syncCompanies() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arena';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  const rawMeta = fs.readFileSync(META_FILE, 'utf8');
  const companyMetaList = JSON.parse(rawMeta);

  let derivedStats = {};
  if (fs.existsSync(STATS_FILE)) {
    try {
      derivedStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    } catch (e) {
      console.warn('Could not read derivedCompanyStats.json, extracting on the fly...');
    }
  }

  console.log(`Processing ${companyMetaList.length} companies from companyMeta.json...`);

  const results = [];
  for (const item of companyMetaList) {
    // Look up stats in derivedStats or calculate dynamically
    let stats = derivedStats[item.name] || derivedStats[item.name.toLowerCase()] || derivedStats[item.slug];
    if (!stats || stats.questionCount === 0) {
      stats = extractStatsForCompany(item.name);
    }

    const questionCount = (stats && stats.questionCount > 0) ? stats.questionCount : (item.fallbackQuestionCount || 30);
    const keyFocusAreas = (stats && stats.keyFocusAreas && stats.keyFocusAreas.length > 0)
      ? stats.keyFocusAreas
      : (item.fallbackTopics || ['Data Structures', 'Algorithms', 'System Design']);

    const roles = item.roles || [
      {
        title: item.role?.title || 'Software Development Engineer',
        salaryRange: item.role?.salaryRange || '$180k - $300k',
        experienceLevel: item.role?.experienceLevel || 'mid',
      },
    ];

    const companyDoc = {
      name: item.name,
      slug: item.slug,
      tier: item.tier || 'Tier 1 Product',
      logo: item.logo || '🏢',
      brandColor: item.brandColor || '#4FA393',
      description: item.description || '',
      roles,
      interviewStages: item.interviewStages || [],
      keyFocusAreas,
      questionCount,
    };

    const updated = await Company.findOneAndUpdate(
      { slug: item.slug },
      companyDoc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`✅ Synced: ${item.name} (${item.tier}) - ${questionCount} questions, Focus: ${keyFocusAreas.slice(0, 3).join(', ')}`);
    results.push(updated);
  }

  console.log(`\n🎉 Successfully synced ${results.length} companies into MongoDB!`);
  await mongoose.disconnect();
}

if (require.main === module) {
  syncCompanies().catch(err => {
    console.error('Failed syncing companies:', err);
    process.exit(1);
  });
}

module.exports = { syncCompanies };
