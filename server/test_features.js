/**
 * Verification test script for Feature 1 (ELO / Rank Tiers) and Feature 5 (Badges)
 */

const { calculateElo, getKFactor, getRankTier } = require('./utils/helpers');
const { evaluateMatchBadges, BADGES } = require('./utils/badgeManager');

console.log('--- TEST 1: ELO & Rank Tiers ---');
const player1Rating = 1000;
const player2Rating = 1100;
const p1WinRating = calculateElo(player1Rating, player2Rating, 1, 32);
const p2LossRating = calculateElo(player2Rating, player1Rating, 0, 32);

console.log(`Player 1 (1000) beats Player 2 (1100): P1 new rating = ${p1WinRating} (+${p1WinRating - player1Rating}), P2 new rating = ${p2LossRating} (${p2LossRating - player2Rating})`);
if (p1WinRating > player1Rating && p2LossRating < player2Rating) {
  console.log('✅ ELO calculation passed.');
} else {
  console.error('❌ ELO calculation failed.');
  process.exit(1);
}

// Test Tiers
console.log('\n--- TEST 2: Rank Tiers ---');
const tiersToTest = [
  { r: 850, expected: 'Bronze' },
  { r: 1050, expected: 'Silver' },
  { r: 1250, expected: 'Gold' },
  { r: 1450, expected: 'Platinum' },
  { r: 1650, expected: 'Diamond' },
  { r: 1850, expected: 'Grandmaster' },
];

tiersToTest.forEach(({ r, expected }) => {
  const tier = getRankTier(r);
  console.log(`Rating ${r} -> ${tier.name} (expected: ${expected})`);
  if (tier.name !== expected) {
    console.error(`❌ Mismatch for rating ${r}`);
    process.exit(1);
  }
});
console.log('✅ Rank tiers passed.');

// Test Badges
console.log('\n--- TEST 3: Badge Engine ---');
const mockWinner = {
  username: 'Alice',
  rating: 1000,
  badges: [],
  streaks: { current: 2, longest: 2 },
};
const mockLoser = {
  username: 'Bob',
  rating: 1000,
  badges: [],
  streaks: { current: 1, longest: 1 },
};

// Case A: First win + Hot Streak (current becomes 3) + First Blood (1 attempt, 0 failures)
const badgesA = evaluateMatchBadges(mockWinner, mockLoser, {
  winnerAttempts: 1,
  winnerHadFailures: false,
  isComeback: false,
  winnerNewRating: 1030,
});
console.log('Badges awarded in Case A:', badgesA.map((b) => b.name));
const hasFirstBlood = badgesA.some((b) => b.id === 'FIRST_BLOOD');
const hasGladiator = badgesA.some((b) => b.id === 'ARENA_GLADIATOR');
const hasHotStreak = badgesA.some((b) => b.id === 'HOT_STREAK');

if (hasFirstBlood && hasGladiator && hasHotStreak) {
  console.log('✅ Badges Case A passed (First Blood, Gladiator, Hot Streak awarded).');
} else {
  console.error('❌ Badges Case A failed.');
  process.exit(1);
}

// Case B: Comeback Kid
const mockWinner2 = {
  username: 'Charlie',
  rating: 1780,
  badges: [{ id: 'ARENA_GLADIATOR' }],
  streaks: { current: 0, longest: 0 },
};
const badgesB = evaluateMatchBadges(mockWinner2, mockLoser, {
  winnerAttempts: 3,
  winnerHadFailures: true,
  isComeback: true,
  winnerNewRating: 1810,
});
console.log('Badges awarded in Case B:', badgesB.map((b) => b.name));
const hasComeback = badgesB.some((b) => b.id === 'COMEBACK_KID');
const hasGrandmaster = badgesB.some((b) => b.id === 'GRANDMASTER');

if (hasComeback && hasGrandmaster) {
  console.log('✅ Badges Case B passed (Comeback Kid, Grandmaster awarded).');
} else {
  console.error('❌ Badges Case B failed.');
  process.exit(1);
}

console.log('\n🎉 ALL BACKEND VERIFICATIONS PASSED SUCCESSFULLY!');
