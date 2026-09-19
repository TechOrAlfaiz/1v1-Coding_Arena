const Course = require('../models/Course');
const User = require('../models/User');

/**
 * Get all courses / tracks
 */
exports.getAllCourses = async (req, res) => {
  try {
    const { track, category } = req.query;
    let filter = {};
    const selectedCategory = category || track;
    if (selectedCategory && selectedCategory !== 'all') {
      filter.category = selectedCategory.toLowerCase();
    }
    const courses = await Course.find(filter).sort({ order: 1 });
    res.json({ success: true, courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

/**
 * Get single course with curriculum
 */
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ success: true, course });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

/**
 * Submit quiz answer and earn XP
 */
exports.submitQuiz = async (req, res) => {
  try {
    const { courseId, moduleId, quizId, selectedOption } = req.body;
    const userId = req.user.userId;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    let targetQuiz = null;
    for (const mod of course.modules) {
      if (mod._id.toString() === moduleId) {
        for (const lesson of mod.lessons || []) {
          const q = (lesson.quiz || []).find((qz) => qz._id.toString() === quizId);
          if (q) {
            targetQuiz = q;
            break;
          }
        }
      }
    }

    if (!targetQuiz) {
      return res.status(404).json({ error: 'Quiz question not found' });
    }

    const isCorrect = targetQuiz.correctAnswer === parseInt(selectedOption, 10);
    let xpEarned = 0;

    if (isCorrect) {
      xpEarned = 35;
      const user = await User.findById(userId);
      if (user) {
        user.xp = (user.xp || 0) + xpEarned;
        user.level = Math.floor((user.xp || 0) / 500) + 1;
        await user.save();
      }
    }

    res.json({
      success: true,
      isCorrect,
      explanation: targetQuiz.explanation,
      correctAnswer: targetQuiz.correctAnswer,
      xpEarned,
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: 'Failed to evaluate quiz submission' });
  }
};
