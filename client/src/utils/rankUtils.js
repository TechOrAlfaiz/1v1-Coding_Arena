/**
 * Rank tiers & badge presentation utilities
 */

export const RANK_TIERS = [
  {
    name: 'Grandmaster',
    min: 1800,
    color: 'text-[var(--error)]',
    border: 'border-[rgba(217,115,106,0.35)]',
    bg: 'bg-[rgba(217,115,106,0.12)]',
    glow: '',
  },
  {
    name: 'Diamond',
    min: 1600,
    color: 'text-[var(--accent)]',
    border: 'border-[rgba(79,163,147,0.35)]',
    bg: 'bg-[rgba(79,163,147,0.12)]',
    glow: '',
  },
  {
    name: 'Platinum',
    min: 1400,
    color: 'text-[var(--accent)]',
    border: 'border-[rgba(79,163,147,0.35)]',
    bg: 'bg-[rgba(79,163,147,0.12)]',
    glow: '',
  },
  {
    name: 'Gold',
    min: 1200,
    color: 'text-[var(--accent-secondary)]',
    border: 'border-[rgba(227,179,65,0.35)]',
    bg: 'bg-[rgba(227,179,65,0.12)]',
    glow: '',
  },
  {
    name: 'Silver',
    min: 1000,
    color: 'text-[var(--text-secondary)]',
    border: 'border-[var(--border)]',
    bg: 'bg-[var(--surface-raised)]',
    glow: '',
  },
  {
    name: 'Bronze',
    min: 0,
    color: 'text-[var(--text-secondary)]',
    border: 'border-[var(--border)]',
    bg: 'bg-[var(--surface-raised)]',
    glow: '',
  },
];

export function getTierBadge(rating = 1000) {
  const r = Number(rating) || 1000;
  for (const tier of RANK_TIERS) {
    if (r >= tier.min) return tier;
  }
  return RANK_TIERS[RANK_TIERS.length - 1];
}

export const BADGE_METADATA = {
  ARENA_GLADIATOR: {
    id: 'ARENA_GLADIATOR',
    name: 'Arena Gladiator',
    description: 'Claimed your very first 1v1 duel victory.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
  },
  FIRST_BLOOD: {
    id: 'FIRST_BLOOD',
    name: 'First Blood',
    description: 'Secured a flawless win on your very first submission.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30',
  },
  COMEBACK_KID: {
    id: 'COMEBACK_KID',
    name: 'Comeback Kid',
    description: 'Achieved victory after falling behind or recovering from failed tests.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  HOT_STREAK: {
    id: 'HOT_STREAK',
    name: 'Hot Streak',
    description: 'Achieved a 3-game winning streak.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
  },
  ON_FIRE: {
    id: 'ON_FIRE',
    name: 'On Fire',
    description: 'Achieved a 5-game winning streak.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
  },
  UNSTOPPABLE: {
    id: 'UNSTOPPABLE',
    name: 'Unstoppable',
    description: 'Achieved an extraordinary 10-game winning streak.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  GRANDMASTER: {
    id: 'GRANDMASTER',
    name: 'Grandmaster',
    description: 'Ascended to the Grandmaster tier (1800+ rating).',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
};
