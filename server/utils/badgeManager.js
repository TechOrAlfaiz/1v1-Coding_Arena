/**
 * Badge & Achievement System
 * Evaluates streaks, win records, and duel performance to award badges.
 */

const BADGES = {
  ARENA_GLADIATOR: {
    id: 'ARENA_GLADIATOR',
    name: 'Arena Gladiator',
    description: 'Claimed your very first 1v1 duel victory.',
    icon: 'Swords',
  },
  FIRST_BLOOD: {
    id: 'FIRST_BLOOD',
    name: 'First Blood',
    description: 'Secured a flawless win on your very first submission without any failed test runs.',
    icon: 'Flame',
  },
  COMEBACK_KID: {
    id: 'COMEBACK_KID',
    name: 'Comeback Kid',
    description: 'Achieved victory after falling behind on test cases or recovering from an early failed test.',
    icon: 'Zap',
  },
  HOT_STREAK: {
    id: 'HOT_STREAK',
    name: 'Hot Streak',
    description: 'Achieved a 3-game winning streak.',
    icon: 'Flame',
  },
  ON_FIRE: {
    id: 'ON_FIRE',
    name: 'On Fire',
    description: 'Achieved a 5-game winning streak.',
    icon: 'Sparkles',
  },
  UNSTOPPABLE: {
    id: 'UNSTOPPABLE',
    name: 'Unstoppable',
    description: 'Achieved an extraordinary 10-game winning streak.',
    icon: 'Crown',
  },
  GRANDMASTER: {
    id: 'GRANDMASTER',
    name: 'Grandmaster',
    description: 'Reached the elite Grandmaster rank tier (1800+ rating).',
    icon: 'Trophy',
  },
};

/**
 * Check and award badges to winner (and evaluate loser streak reset).
 *
 * @param {Object} winner - Mongoose User document or plain object for winner
 * @param {Object} loser - Mongoose User document or plain object for loser
 * @param {Object} matchContext - { winnerAttempts, loserAttempts, winnerHadFailures, loserHadSuccessEarlier, winnerNewRating }
 * @returns {Array} newlyAwardedBadges for the winner
 */
function evaluateMatchBadges(winner, loser, matchContext = {}) {
  const newBadges = [];
  const existingBadgeIds = new Set((winner.badges || []).map((b) => b.id));

  const addBadgeIfEligible = (badgeDef) => {
    if (!existingBadgeIds.has(badgeDef.id)) {
      newBadges.push({
        id: badgeDef.id,
        name: badgeDef.name,
        description: badgeDef.description,
        icon: badgeDef.icon,
        earnedAt: new Date(),
      });
      existingBadgeIds.add(badgeDef.id);
    }
  };

  // 1. First victory badge
  addBadgeIfEligible(BADGES.ARENA_GLADIATOR);

  // 2. First Blood: Winner submitted only once and won, with 0 prior failed attempts
  if (matchContext.winnerAttempts === 1 && !matchContext.winnerHadFailures) {
    addBadgeIfEligible(BADGES.FIRST_BLOOD);
  }

  // 3. Comeback Kid: Winner had an earlier failed attempt or opponent was ahead in passed test cases
  if (matchContext.isComeback) {
    addBadgeIfEligible(BADGES.COMEBACK_KID);
  }

  // 4. Streaks
  const currentStreak = (winner.streaks?.current || 0) + 1;
  if (currentStreak >= 3) addBadgeIfEligible(BADGES.HOT_STREAK);
  if (currentStreak >= 5) addBadgeIfEligible(BADGES.ON_FIRE);
  if (currentStreak >= 10) addBadgeIfEligible(BADGES.UNSTOPPABLE);

  // 5. Grandmaster tier (1800+ rating)
  const rating = matchContext.winnerNewRating || winner.rating || winner.elo || 1000;
  if (rating >= 1800) {
    addBadgeIfEligible(BADGES.GRANDMASTER);
  }

  return newBadges;
}

module.exports = {
  BADGES,
  evaluateMatchBadges,
};
