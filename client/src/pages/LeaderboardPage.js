/**
 * LeaderboardPage
 * Global ranking of gladiators with Top-3 podium cards,
 * search & tier filters, and current player rank highlight.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Search, 
  Flame, 
  ShieldCheck, 
  TrendingUp, 
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';
import { getTierBadge } from '../utils/rankUtils';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const lbRes = await axios.get(`${API_URL}/api/leaderboard`);
        setLeaderboard(lbRes.data.leaderboard || []);
      } catch (err) {
        console.warn('Leaderboard fetch warning:', err.message);
      }

      const userId = user?.id || user?._id;
      if (userId) {
        try {
          const rankRes = await axios.get(`${API_URL}/api/leaderboard/rank/${userId}`);
          if (rankRes?.data) {
            setMyRank(rankRes.data);
          }
        } catch (err) {
          // If user rank cannot be found or is not yet indexed, fall back silently
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const userRating = user?.rating || user?.elo || 1000;
  const myTier = getTierBadge(userRating);

  // Top 3 players for Podium display
  const topThree = leaderboard.slice(0, 3);

  // Filtered leaderboard
  const filteredLeaderboard = leaderboard.filter((p) => {
    const matchesSearch = p.username.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedTier === 'ALL') return true;
    const tier = getTierBadge(p.rating || p.elo || 1000).name.toUpperCase();
    return tier === selectedTier;
  });

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <BreadcrumbNav 
          items={[{ label: 'Leaderboard' }]} 
          backTo="/lobby" 
          backLabel="Back to Arena" 
        />

        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--accent-secondary)] text-xs font-mono mb-3">
            <Trophy className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
            <span>Global Rankings</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
            Leaderboard
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Top ranked competitors by Elo rating. Battle opponents to climb tiers.
          </p>
        </div>

        {/* Current User Rank Card */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 mb-8"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center text-base font-bold text-black"
                  style={{ backgroundColor: user.avatarColor || '#4FA393' }}
                >
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-base">{user.username}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]">
                      you
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${myTier.border} ${myTier.color} ${myTier.bg}`}>
                      {myTier.name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5 sm:gap-8 text-center">
                <div>
                  <p className="text-xl font-bold font-mono text-[var(--accent)]">{userRating}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-mono">RATING</p>
                </div>
                <div className="w-[1px] h-7 bg-[var(--border)]" />
                <div>
                  <p className="text-xl font-bold font-mono text-[var(--accent-secondary)]">#{myRank?.rank || '—'}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-mono">GLOBAL RANK</p>
                </div>
                <div className="w-[1px] h-7 bg-[var(--border)]" />
                <div>
                  <p className="text-xl font-bold font-mono text-[var(--accent)]">{user.stats?.wins || 0}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-mono">WINS</p>
                </div>
                <div className="w-[1px] h-7 bg-[var(--border)]" />
                <div>
                  <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{user.stats?.totalMatches || 0}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-mono">DUELS</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TOP 3 PODIUM DISPLAY */}
        {topThree.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
            {/* 2nd Place - Silver */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-center order-2 md:order-1 relative">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center justify-center text-xs font-mono font-bold mx-auto mb-3">
                2nd
              </div>
              <div
                className="w-12 h-12 rounded-lg mx-auto flex items-center justify-center text-lg font-bold text-black mb-3"
                style={{ backgroundColor: topThree[1].avatarColor || '#8B93A1' }}
              >
                {topThree[1].username[0].toUpperCase()}
              </div>
              <p className="font-bold text-[var(--text-primary)] text-sm">{topThree[1].username}</p>
              <p className="text-xs font-mono text-[var(--accent)] font-semibold mt-0.5">{topThree[1].rating || topThree[1].elo} RATING</p>
              <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-1">{topThree[1].wins} Wins // {topThree[1].winRate}% WR</p>
            </div>

            {/* 1st Place - Gold Champion */}
            <div className="bg-[var(--surface)] border border-[var(--accent-secondary)]/40 rounded-xl p-6 text-center order-1 md:order-2 relative shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30 flex items-center justify-center mx-auto mb-3">
                <Crown className="w-4 h-4" />
              </div>
              <div
                className="w-14 h-14 rounded-lg mx-auto flex items-center justify-center text-xl font-bold text-black mb-3 border border-[var(--accent-secondary)]/40"
                style={{ backgroundColor: topThree[0].avatarColor || '#E3B341' }}
              >
                {topThree[0].username[0].toUpperCase()}
              </div>
              <p className="font-bold text-[var(--text-primary)] text-base flex items-center justify-center gap-1.5">
                <span>{topThree[0].username}</span>
                <Crown className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
              </p>
              <p className="text-xs font-mono text-[var(--accent-secondary)] font-bold mt-0.5">{topThree[0].rating || topThree[0].elo} RATING</p>
              <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-1">{topThree[0].wins} Wins // {topThree[0].winRate}% WR</p>
            </div>

            {/* 3rd Place - Bronze */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-center order-3 relative">
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center justify-center text-xs font-mono font-bold mx-auto mb-3">
                3rd
              </div>
              <div
                className="w-12 h-12 rounded-lg mx-auto flex items-center justify-center text-lg font-bold text-black mb-3"
                style={{ backgroundColor: topThree[2].avatarColor || '#4FA393' }}
              >
                {topThree[2].username[0].toUpperCase()}
              </div>
              <p className="font-bold text-[var(--text-primary)] text-sm">{topThree[2].username}</p>
              <p className="text-xs font-mono text-[var(--accent)] font-semibold mt-0.5">{topThree[2].rating || topThree[2].elo} RATING</p>
              <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-1">{topThree[2].wins} Wins // {topThree[2].winRate}% WR</p>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gladiator..."
              className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {['ALL', 'GRANDMASTER', 'DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'].map((tierName) => (
              <button
                key={tierName}
                onClick={() => setSelectedTier(tierName)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-medium transition-colors ${
                  selectedTier === tierName
                    ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tierName}
              </button>
            ))}
          </div>
        </div>

        {/* Full Ranked Table */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] text-xs font-mono">Syncing rankings...</p>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="p-16 text-center text-[var(--text-secondary)] font-mono text-sm">
              No competitors matched your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[11px] text-[var(--text-secondary)] font-mono uppercase bg-[var(--surface-raised)]">
                    <th className="py-3.5 px-5">Rank</th>
                    <th className="py-3.5 px-5">Gladiator</th>
                    <th className="py-3.5 px-5 text-right">Rating</th>
                    <th className="py-3.5 px-5 text-right hidden sm:table-cell">Streak</th>
                    <th className="py-3.5 px-5 text-right hidden sm:table-cell">Victories</th>
                    <th className="py-3.5 px-5 text-right hidden sm:table-cell">Defeats</th>
                    <th className="py-3.5 px-5 text-right hidden md:table-cell">Win Rate</th>
                    <th className="py-3.5 px-5 text-right hidden md:table-cell">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-xs font-mono">
                  {filteredLeaderboard.map((player) => {
                    const isMe = player.username === user.username;
                    const pRating = player.rating || player.elo || 1000;
                    const tier = getTierBadge(pRating);

                    return (
                      <tr
                        key={player.id}
                        className={`transition-colors ${
                          isMe 
                            ? 'bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]' 
                            : 'hover:bg-[var(--surface-raised)]/50'
                        }`}
                      >
                        <td className="py-3.5 px-5 text-[var(--text-secondary)]">
                          {player.rank === 1 ? '1' : player.rank === 2 ? '2' : player.rank === 3 ? '3' : `#${player.rank}`}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-black"
                              style={{ backgroundColor: player.avatarColor || '#4FA393' }}
                            >
                              {player.username[0].toUpperCase()}
                            </div>
                            <span className={`font-medium ${isMe ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                              {player.username}
                              {isMe && <span className="ml-1.5 text-[10px] text-[var(--accent)] font-normal">(you)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right font-bold text-[var(--accent)] text-sm">
                          {pRating}
                        </td>
                        <td className="py-3.5 px-5 text-right text-[var(--accent-secondary)] hidden sm:table-cell">
                          {player.winStreak > 0 ? `${player.winStreak} streak` : '—'}
                        </td>
                        <td className="py-3.5 px-5 text-right text-[var(--accent)] hidden sm:table-cell">
                          {player.wins}
                        </td>
                        <td className="py-3.5 px-5 text-right text-[var(--error)] hidden sm:table-cell">
                          {player.losses}
                        </td>
                        <td className="py-3.5 px-5 text-right hidden md:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--accent)] rounded-full"
                                style={{ width: `${player.winRate}%` }}
                              />
                            </div>
                            <span className="text-[var(--text-secondary)] w-8">{player.winRate}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-right hidden md:table-cell">
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${tier.border} ${tier.color} ${tier.bg}`}>
                            {tier.name}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
