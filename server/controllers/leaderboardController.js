/**
 * Leaderboard Controller
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const { getRankTier } = require('../utils/helpers');

/**
 * GET /api/leaderboard
 * Get top players by rating / ELO
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const players = await User.find({ 'stats.totalMatches': { $gt: 0 } })
      .select('username rating elo stats streaks badges avatarColor createdAt')
      .sort({ rating: -1, elo: -1 })
      .limit(limit);

    const leaderboard = players.map((player, index) => {
      const userRating = player.rating || player.elo || 1000;
      return {
        rank: index + 1,
        id: player._id,
        username: player.username,
        rating: userRating,
        elo: userRating,
        tier: getRankTier(userRating),
        wins: player.stats?.wins || 0,
        losses: player.stats?.losses || 0,
        draws: player.stats?.draws || 0,
        totalMatches: player.stats?.totalMatches || 0,
        winStreak: player.streaks?.current || 0,
        badgeCount: player.badges?.length || 0,
        winRate: player.stats?.totalMatches > 0
          ? Math.round(((player.stats.wins || 0) / player.stats.totalMatches) * 100)
          : 0,
        avatarColor: player.avatarColor,
      };
    });

    res.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

/**
 * GET /api/leaderboard/rank/:userId
 * Get a specific user's rank
 */
exports.getUserRank = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || userId === 'undefined' || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    const user = await User.findById(userId).select('username rating elo stats streaks badges');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userRating = user.rating || user.elo || 1000;
    const rank = await User.countDocuments({
      $or: [
        { rating: { $gt: userRating } },
        { elo: { $gt: userRating } },
      ],
    }) + 1;

    res.json({
      rank,
      username: user.username,
      rating: userRating,
      elo: userRating,
      tier: getRankTier(userRating),
      stats: user.stats,
      streaks: user.streaks,
      badges: user.badges,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
};
