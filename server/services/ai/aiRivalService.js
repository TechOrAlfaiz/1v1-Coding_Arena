/**
 * AI Rival Service
 * Simulates intelligent, realistic algorithmic opponents for solo 1v1 battle practice.
 * Emits progressive test case passes and human-like typing cadence.
 */

const AI_RIVALS = [
  { name: 'NeuralGladiator', elo: 1120, difficulty: 'casual', avgSolveSec: 180, failChance: 0.25 },
  { name: 'CyberKnight_AI', elo: 1250, difficulty: 'ranked', avgSolveSec: 130, failChance: 0.15 },
  { name: 'DeepSolve_Bot', elo: 1480, difficulty: 'expert', avgSolveSec: 85, failChance: 0.08 },
  { name: 'Grandmaster_Core', elo: 1820, difficulty: 'master', avgSolveSec: 50, failChance: 0.02 },
];

/**
 * Get an AI rival matching user's rating
 */
function getMatchingRival(userRating = 1000) {
  let closest = AI_RIVALS[0];
  let minDiff = Infinity;
  for (const rival of AI_RIVALS) {
    const diff = Math.abs(rival.elo - userRating);
    if (diff < minDiff) {
      minDiff = diff;
      closest = rival;
    }
  }
  return { ...closest, id: `bot_${closest.name.toLowerCase()}` };
}

/**
 * Generate simulated progress steps for the AI rival during a match
 * @param {Number} totalTests
 * @param {Number} durationLimit
 * @param {Object} rivalConfig
 */
function generateRivalProgressSchedule(totalTests = 4, durationLimit = 900, rivalConfig = AI_RIVALS[1]) {
  const willPass = Math.random() > rivalConfig.failChance;
  const targetSolveTime = Math.min(
    durationLimit - 10,
    Math.max(40, rivalConfig.avgSolveSec + Math.floor((Math.random() - 0.5) * 40))
  );

  const steps = [];
  const timePerTest = Math.floor(targetSolveTime / totalTests);

  for (let i = 1; i <= totalTests; i++) {
    const isFinal = i === totalTests;
    const testPassed = isFinal ? willPass : true;
    steps.push({
      second: i * timePerTest + Math.floor((Math.random() - 0.5) * 6),
      passedCount: testPassed ? i : i - 1,
      totalCount: totalTests,
      solved: isFinal && willPass,
    });
  }

  return {
    willWin: willPass,
    targetSolveTime,
    steps,
  };
}

module.exports = {
  AI_RIVALS,
  getMatchingRival,
  generateRivalProgressSchedule,
};
