import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

function getTierInfo(elo) {
  if (elo >= 2000) return { name: 'Grandmaster', color: 'text-red-400', bg: 'bg-red-500/10' };
  if (elo >= 1800) return { name: 'Master', color: 'text-purple-400', bg: 'bg-purple-500/10' };
  if (elo >= 1600) return { name: 'Diamond', color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
  if (elo >= 1400) return { name: 'Platinum', color: 'text-teal-400', bg: 'bg-teal-500/10' };
  if (elo >= 1200) return { name: 'Gold', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  if (elo >= 1000) return { name: 'Silver', color: 'text-gray-400', bg: 'bg-gray-500/10' };
  return { name: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-700/10' };
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lbRes, rankRes] = await Promise.all([
          axios.get(`${API_URL}/api/leaderboard`),
          axios.get(`${API_URL}/api/leaderboard/rank/${user.id}`),
        ]);
        setLeaderboard(lbRes.data.leaderboard);
        setMyRank(rankRes.data);
      } catch (err) {
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.id]);

  const myEntry = leaderboard.find((p) => p.username === user.username);
  const myTier = getTierInfo(user.elo || 1200);

  return (
    <div className="min-h-screen bg-arena-bg bg-grid">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-white font-display mb-2">🏆 Leaderboard</h1>
          <p className="text-gray-400">Top players by ELO rating</p>
        </div>

        {/* My stats card */}
        <div className="card mb-6 border-cyan-500/20 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-black"
                style={{ backgroundColor: user.avatarColor || '#00d4ff' }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-white">{user.username}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${myTier.color} ${myTier.bg}`}>
                  {myTier.name}
                </span>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-cyan-400">{user.elo}</p>
                <p className="text-xs text-gray-500">ELO</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">#{myRank?.rank || '—'}</p>
                <p className="text-xs text-gray-500">Rank</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{user.stats?.wins || 0}</p>
                <p className="text-xs text-gray-500">Wins</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{user.stats?.totalMatches || 0}</p>
                <p className="text-xs text-gray-500">Matches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard table */}
        <div className="card p-0 overflow-hidden animate-fade-in">
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              No players on the leaderboard yet. Play some matches!
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4 text-left">Rank</th>
                  <th className="py-3 px-4 text-left">Player</th>
                  <th className="py-3 px-4 text-right">ELO</th>
                  <th className="py-3 px-4 text-right hidden sm:table-cell">W</th>
                  <th className="py-3 px-4 text-right hidden sm:table-cell">L</th>
                  <th className="py-3 px-4 text-right hidden md:table-cell">Win Rate</th>
                  <th className="py-3 px-4 text-right hidden md:table-cell">Tier</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((player) => {
                  const isMe = player.username === user.username;
                  const tier = getTierInfo(player.elo);

                  return (
                    <tr
                      key={player.id}
                      className={`border-b border-gray-800/50 transition-colors ${
                        isMe ? 'bg-cyan-500/5 border-cyan-500/20' : 'hover:bg-gray-800/30'
                      }`}
                    >
                      <td className="py-3 px-4">
                        {player.rank <= 3 ? (
                          <span className="text-xl">{RANK_EMOJIS[player.rank - 1]}</span>
                        ) : (
                          <span className="text-gray-500 font-mono">#{player.rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                            style={{ backgroundColor: player.avatarColor || '#00d4ff' }}
                          >
                            {player.username[0].toUpperCase()}
                          </div>
                          <span className={`font-medium ${isMe ? 'text-cyan-400' : 'text-white'}`}>
                            {player.username}
                            {isMe && <span className="text-xs text-gray-500 ml-1">(you)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-cyan-400">{player.elo}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 hidden sm:table-cell">{player.wins}</td>
                      <td className="py-3 px-4 text-right text-red-400 hidden sm:table-cell">{player.losses}</td>
                      <td className="py-3 px-4 text-right hidden md:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${player.winRate}%` }}
                            />
                          </div>
                          <span className="text-gray-400 text-xs w-8">{player.winRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right hidden md:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color} ${tier.bg}`}>
                          {tier.name}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
