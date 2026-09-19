const Company = require('../models/Company');
const Question = require('../models/Question');

/**
 * Get all company prep profiles
 */
exports.getAllCompanies = async (req, res) => {
  try {
    const { tier, role } = req.query;
    let filter = {};

    if (tier && tier !== 'ALL') {
      filter.tier = tier;
    }
    if (role) {
      filter['roles.title'] = { $regex: role, $options: 'i' };
    }

    let companies = await Company.find(filter).sort({ name: 1 });

    // Auto-sync if DB has fewer entries than companyMeta.json
    const fs = require('fs');
    const path = require('path');
    const metaPath = path.join(__dirname, '../data/companyMeta.json');
    if (fs.existsSync(metaPath)) {
      try {
        const metaList = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const totalInDb = await Company.countDocuments();
        if (totalInDb < metaList.length) {
          const seedInterviewData = require('../seed_interview_data');
          await seedInterviewData();
          companies = await Company.find(filter).sort({ name: 1 });
        }
      } catch (e) {
        console.warn('Auto-sync companies check warning:', e.message);
      }
    }

    res.json({ success: true, companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
};

/**
 * Get single company by slug
 */
exports.getCompanyBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const company = await Company.findOne({ slug });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Find questions matching the company name across companies and companyTags
    const companyRegex = new RegExp(`^${company.name.trim()}$`, 'i');
    let questions = await Question.find({
      $or: [
        { companies: companyRegex },
        { companyTags: companyRegex },
      ],
    })
      .sort({ frequency: -1 })
      .limit(10)
      .select('title difficulty topic category tags companies isPlayable frequency');

    // If company has no direct tagged questions, fallback to matching key focus areas
    if (questions.length === 0 && company.keyFocusAreas && company.keyFocusAreas.length > 0) {
      questions = await Question.find({
        $or: [
          { topics: { $in: company.keyFocusAreas } },
          { topic: { $in: company.keyFocusAreas } },
          { tags: { $in: company.keyFocusAreas } },
        ],
      })
        .limit(10)
        .select('title difficulty topic category tags companies isPlayable frequency');
    }

    res.json({
      success: true,
      company,
      recommendedQuestions: questions,
    });
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
};
