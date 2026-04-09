/**
 * Leaderboard Controller
 */

const User = require('../models/User');

/**
 * GET /api/leaderboard
 * Get top players by ELO rating
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const players = await User.find({ 'stats.totalMatches': { $gt: 0 } })
      .select('username elo stats avatarColor createdAt')
      .sort({ elo: -1 })
      .limit(limit);

    const leaderboard = players.map((player, index) => ({
      rank: index + 1,
      id: player._id,
      username: player.username,
      elo: player.elo,
      wins: player.stats.wins,
      losses: player.stats.losses,
      draws: player.stats.draws,
      totalMatches: player.stats.totalMatches,
      winRate: player.stats.totalMatches > 0
        ? Math.round((player.stats.wins / player.stats.totalMatches) * 100)
        : 0,
      avatarColor: player.avatarColor,
    }));

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
    const user = await User.findById(req.params.userId).select('username elo stats');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rank = await User.countDocuments({ elo: { $gt: user.elo } }) + 1;

    res.json({
      rank,
      username: user.username,
      elo: user.elo,
      stats: user.stats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
};
