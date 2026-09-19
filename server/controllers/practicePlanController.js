const PracticePlan = require('../models/PracticePlan');
const User = require('../models/User');
const practicePlanService = require('../services/ai/practicePlanService');

/**
 * Get current active 7-day plan or generate a fresh adaptive plan
 */
exports.getActivePlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    let plan = await PracticePlan.findOne({ userId, status: 'active' });

    if (!plan) {
      // Determine weak areas from interview stats
      const weakAreas = [];
      if (user && user.interviewStats) {
        if ((user.interviewStats.codingAvg || 0) < 65) weakAreas.push('Dynamic Programming & Trees');
        if ((user.interviewStats.systemDesignAvg || 0) < 65) weakAreas.push('Distributed Caching & Sharding');
        if ((user.interviewStats.behavioralAvg || 0) < 65) weakAreas.push('STAR Framework & Conflict Resolution');
      }
      if (weakAreas.length === 0) {
        weakAreas.push('Graph Algorithms', 'Microservice Resiliency', 'Leadership Scenarios');
      }

      const generated = await practicePlanService.generatePersonalizedPlan({
        userRole: 'Software Engineer',
        targetCompanies: ['Google', 'Meta', 'Amazon'],
        weakAreas,
      });

      const today = new Date();
      const rawDays = Array.isArray(generated) ? generated : (generated.dailyTasks || generated.days || []);
      const planDays = rawDays.map((dayObj, idx) => {
        const d = new Date(today);
        d.setDate(today.getDate() + idx);
        return {
          dayNumber: idx + 1,
          date: d,
          theme: dayObj.theme || `Day ${idx + 1} Review`,
          tasks: (dayObj.tasks || []).map((t) => ({
            title: t.title || t.targetGoal || 'Practice module',
            description: t.description || t.targetGoal || 'Complete practice problem',
            type: t.type || 'coding_problem',
            estimatedMinutes: t.estimatedMinutes || 30,
            completed: false,
          })),
          isDayCompleted: false,
        };
      });

      plan = new PracticePlan({
        userId,
        targetRole: 'Full Stack / Backend Engineer',
        targetCompanies: ['Google', 'Meta', 'Stripe'],
        startDate: today,
        endDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        days: planDays,
      });

      await plan.save();
    }

    res.json({ success: true, plan });
  } catch (error) {
    console.error('Error fetching practice plan:', error);
    res.status(500).json({ error: 'Failed to fetch practice plan' });
  }
};

/**
 * Mark a task inside the 7-day plan as completed
 */
exports.completeTask = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { planId, dayNumber, taskIndex } = req.body;

    const plan = await PracticePlan.findOne({ _id: planId, userId });
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const day = plan.days.find((d) => d.dayNumber === parseInt(dayNumber, 10));
    if (!day || !day.tasks[taskIndex]) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = day.tasks[taskIndex];
    if (!task.completed) {
      task.completed = true;
      task.completedAt = new Date();

      // Check if all tasks in this day are done
      day.isDayCompleted = day.tasks.every((t) => t.completed);

      // Award XP
      const user = await User.findById(userId);
      if (user) {
        user.xp = (user.xp || 0) + 20;
        user.level = Math.floor((user.xp || 0) / 500) + 1;
        await user.save();
      }

      await plan.save();
    }

    res.json({ success: true, plan, xpEarned: 20 });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
};
