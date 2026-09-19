/**
 * Utility Helper Functions
 */

/**
 * Generate a random 6-character alphanumeric room ID
 * e.g., "X7K2M9"
 */
exports.generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * ELO Rating Calculation
 * Standard chess ELO formula
 * 
 * @param {number} playerElo - Current player ELO
 * @param {number} opponentElo - Opponent's ELO
 * @param {number} result - 1 for win, 0.5 for draw, 0 for loss
 * @param {number} kFactor - K-factor (32 for new players, 16 for experienced)
 * @returns {number} New ELO rating
 */
exports.calculateElo = (playerElo, opponentElo, result, kFactor = 32) => {
  // Expected score (probability of winning based on ELO difference)
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  
  // New ELO: winner gains, loser loses, scaled by rating difference
  const newElo = Math.round(playerElo + kFactor * (result - expectedScore));
  
  // Minimum ELO is 100
  return Math.max(100, newElo);
};

/**
 * Get K-factor based on number of matches played (standard K ~ 32)
 */
exports.getKFactor = (totalMatches = 0) => {
  if (totalMatches < 10) return 32; // Standard / active
  if (totalMatches < 30) return 32;
  return 24; // Experienced player
};

/**
 * Rank tier mapping (Bronze to Grandmaster)
 * Rating bands:
 * - Bronze: < 1000
 * - Silver: 1000 - 1199
 * - Gold: 1200 - 1399
 * - Platinum: 1400 - 1599
 * - Diamond: 1600 - 1799
 * - Grandmaster: 1800+
 */
exports.getRankTier = (rating = 1000) => {
  const r = Number(rating) || 1000;
  if (r >= 1800) return { name: 'Grandmaster', tier: 'GRANDMASTER', color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-500/10' };
  if (r >= 1600) return { name: 'Diamond', tier: 'DIAMOND', color: 'text-cyan-400', border: 'border-cyan-500/40', bg: 'bg-cyan-500/10' };
  if (r >= 1400) return { name: 'Platinum', tier: 'PLATINUM', color: 'text-teal-400', border: 'border-teal-500/40', bg: 'bg-teal-500/10' };
  if (r >= 1200) return { name: 'Gold', tier: 'GOLD', color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' };
  if (r >= 1000) return { name: 'Silver', tier: 'SILVER', color: 'text-slate-300', border: 'border-slate-400/40', bg: 'bg-slate-400/10' };
  return { name: 'Bronze', tier: 'BRONZE', color: 'text-amber-600', border: 'border-amber-700/40', bg: 'bg-amber-700/10' };
};

/**
 * Judge0 language ID mapping
 */
exports.getLanguageId = (language) => {
  const map = {
    javascript: 63,  // Node.js
    python: 71,      // Python 3
    cpp: 54,         // C++ (GCC 9.2.0)
    java: 62,        // Java (OpenJDK 13)
    c: 50,           // C (GCC 9.2.0)
  };
  return map[language] || 63;
};

/**
 * Normalize output for comparison
 * Trims whitespace, normalizes line endings
 */
exports.normalizeOutput = (output) => {
  if (!output) return '';
  return output.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};
