import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="card text-center">
      <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/matches/history?page=${page}&limit=10`);
      setMatches(res.data.matches);
      setTotalPages(res.data.pagination.pages);
    } catch (err) {
      console.error('History error:', err);
    } finally {
      setLoading(false);
    }
  };

  const winRate = user.stats?.totalMatches > 0
    ? Math.round((user.stats.wins / user.stats.totalMatches) * 100)
    : 0;

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-arena-bg bg-grid">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-white font-display mb-1">
            📊 {user.username}'s Dashboard
          </h1>
          <p className="text-gray-400">Your coding arena stats and match history</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 animate-fade-in">
          <StatCard label="ELO" value={user.elo || 1200} color="text-cyan-400" />
          <StatCard label="Wins" value={user.stats?.wins || 0} color="text-emerald-400" />
          <StatCard label="Losses" value={user.stats?.losses || 0} color="text-red-400" />
          <StatCard label="Draws" value={user.stats?.draws || 0} color="text-gray-400" />
          <StatCard label="Win Rate" value={`${winRate}%`} color="text-yellow-400" />
        </div>

        {/* Match history */}
        <div className="card animate-fade-in">
          <h2 className="text-xl font-bold text-white mb-4">Match History</h2>

          {loading ? (
            <div className="py-10 text-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : matches.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <p className="text-4xl mb-3">🎮</p>
              <p>No matches yet. Go play!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    match.result === 'win'
                      ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                      : match.result === 'loss'
                      ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {/* Result indicator */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      match.result === 'win'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : match.result === 'loss'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D'}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-white">
                        {match.question?.title || 'Unknown Problem'}
                        {match.question?.difficulty && (
                          <span className={`ml-2 text-xs badge-${match.question.difficulty}`}>
                            {match.question.difficulty}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        vs <span className="text-gray-300">{match.opponent?.username || '?'}</span>
                        {' · '}{match.endedAt ? new Date(match.endedAt).toLocaleDateString() : ''}
                        {match.duration && ` · ${formatDuration(match.duration)}`}
                      </p>
                    </div>
                  </div>

                  {/* ELO change */}
                  {match.eloChange !== 0 && (
                    <div className={`text-sm font-bold ${match.eloChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {match.eloChange > 0 ? '+' : ''}{match.eloChange}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-gray-400 text-sm py-1.5 px-3">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
