const Question = require('../models/Question');

/**
 * Get all questions with multi-facet filters, company tags, and search
 */
exports.getQuestions = async (req, res) => {
  try {
    const {
      category,
      difficulty,
      topic,
      topics,
      company,
      companies,
      isPlayable,
      search,
      page = 1,
      limit = 50,
      sortBy = 'frequency',
    } = req.query;

    let filter = {};

    if (category) {
      filter.category = category;
    }

    // Difficulty filter (single or comma-separated list)
    if (difficulty) {
      const diffs = String(difficulty)
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      if (diffs.length === 1) {
        filter.difficulty = diffs[0];
      } else if (diffs.length > 1) {
        filter.difficulty = { $in: diffs };
      }
    }

    // Topics filter (single or comma-separated list)
    const topicParam = topics || topic;
    if (topicParam) {
      const topicList = String(topicParam)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (topicList.length === 1) {
        filter.topics = topicList[0];
      } else if (topicList.length > 1) {
        filter.topics = { $in: topicList };
      }
    }

    // Company filter (single or comma-separated list)
    const companyParam = companies || company;
    if (companyParam) {
      const companyList = String(companyParam)
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      if (companyList.length === 1) {
        filter.companies = companyList[0];
      } else if (companyList.length > 1) {
        filter.companies = { $in: companyList };
      }
    }

    // In-app playable filter
    if (isPlayable === 'true') {
      filter.isPlayable = true;
    }

    // Search by title or slug
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      filter.$or = [
        { title: { $regex: cleanSearch, $options: 'i' } },
        { slug: { $regex: cleanSearch, $options: 'i' } },
        { topics: { $in: [new RegExp(cleanSearch, 'i')] } },
        { companies: { $in: [new RegExp(cleanSearch, 'i')] } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    if (sortBy === 'frequency') {
      sortOption.frequency = -1;
      sortOption._id = -1;
    } else if (sortBy === 'difficulty') {
      sortOption.difficulty = 1;
    } else {
      sortOption.title = 1;
    }

    const total = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
      .select('title slug difficulty topic topics companies tags companyTags sourceLink isPlayable frequency hints')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      questions,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

/**
 * Get distinct topics, companies, and categories for filter UI
 */
exports.getFilterMeta = async (req, res) => {
  try {
    const [topics, companies, totalCount, playableCount] = await Promise.all([
      Question.distinct('topics'),
      Question.distinct('companies'),
      Question.countDocuments(),
      Question.countDocuments({ isPlayable: true }),
    ]);

    const categories = ['coding', 'system_design', 'behavioral'];
    const difficulties = ['Easy', 'Medium', 'Hard'];

    // Sort companies by popularity (or alphabetically)
    const sortedCompanies = companies.filter(Boolean).sort();
    const sortedTopics = topics.filter(Boolean).sort();

    res.json({
      success: true,
      totalCount,
      playableCount,
      companies: sortedCompanies,
      topics: sortedTopics,
      categories,
      difficulties,
    });
  } catch (error) {
    console.error('Error fetching filter meta:', error);
    res.status(500).json({ error: 'Failed to fetch meta' });
  }
};

/**
 * Get single question by ID or Slug
 */
exports.getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    let question;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      question = await Question.findById(id);
    } else {
      question = await Question.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ success: true, question });
  } catch (error) {
    console.error('Error fetching question by ID/Slug:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
};
