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
  
  // New ELO
  const newElo = Math.round(playerElo + kFactor * (result - expectedScore));
  
  // Minimum ELO is 100
  return Math.max(100, newElo);
};

/**
 * Get K-factor based on number of matches played
 * New players have higher K (more volatile), experienced lower
 */
exports.getKFactor = (totalMatches) => {
  if (totalMatches < 10) return 40; // New player - high volatility
  if (totalMatches < 30) return 32; // Regular player
  return 24; // Experienced player - lower volatility
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
