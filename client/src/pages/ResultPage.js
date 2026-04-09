/**
 * ResultPage
 * Shows match outcome: winner/draw/loss, ELO changes, and options to play again.
 */

import React, { useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function ResultPage() {
  const { roomId } = useParams();
  const { state } = useLocation();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // If no state (direct navigation), redirect
  useEffect(() => {
    if (!state) navigate('/lobby');
  }, [state, navigate]);

  if (!state) return null;

  const { result, winner, reason, eloChanges = {} } = state;

  const isWinner = result === 'winner' && winner === user.username;
  const isDraw = result === 'draw';
  const isLoser = result === 'winner' && winner !== user.username;

  const myEloChange = eloChanges[user.username] || 0;

  // Update local user ELO after result
  useEffect(() => {
    if (myEloChange !== 0) {
      updateUser({ elo: (user.elo || 1200) + myEloChange });
    }
  }, []);

  const resultConfig = isWinner
    ? {
        emoji: '🏆',
        title: 'Victory!',
        subtitle: 'You crushed it!',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        glow: 'glow-gold',
      }
    : isDraw
    ? {
        emoji: '🤝',
        title: "It's a Draw",
        subtitle: reason === 'timeout' ? "Time ran out — nobody solved it!" : 'Both players solved it equally',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        glow: '',
      }
    : {
        emoji: '💀',
        title: 'Defeated',
        subtitle: `${winner} was faster. Better luck next time!`,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        glow: 'glow-red',
      };

  return (
    <div className="min-h-screen bg-arena-bg bg-grid">
      <Navbar />

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="max-w-lg w-full animate-fade-in">
          {/* Main result card */}
          <div className={`card ${resultConfig.bgColor} ${resultConfig.borderColor} ${resultConfig.glow} text-center mb-6`}>
            {/* Big emoji */}
            <div className="text-8xl mb-4" style={{ filter: isWinner ? 'drop-shadow(0 0 20px #ffd700)' : '' }}>
              {resultConfig.emoji}
            </div>

            <h1 className={`text-5xl font-bold mb-2 font-display ${resultConfig.color}`}>
              {resultConfig.title}
            </h1>
            <p className="text-gray-400 text-lg mb-6">{resultConfig.subtitle}</p>

            {/* ELO change */}
            {myEloChange !== 0 && (
              <div className="inline-flex items-center gap-2 bg-gray-800 rounded-xl px-5 py-3 mb-6 border border-gray-700">
                <span className="text-gray-400 text-sm">ELO Change</span>
                <span className={`text-2xl font-bold ${myEloChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {myEloChange > 0 ? '+' : ''}{myEloChange}
                </span>
                <span className="text-gray-500 text-sm">→ {(user.elo || 1200) + myEloChange}</span>
              </div>
            )}

            {/* Match details */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-sm text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Room</span>
                <span className="text-gray-300 font-mono">{roomId}</span>
              </div>
              {winner && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Winner</span>
                  <span className="text-yellow-400 font-bold">👑 {winner}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Reason</span>
                <span className="text-gray-300">
                  {reason === 'correct_submission' && '✅ First correct submission'}
                  {reason === 'timeout' && '⏰ Time limit reached'}
                  {reason === 'draw' && '🤝 Draw'}
                </span>
              </div>
            </div>

            {/* ELO changes for both players */}
            {Object.keys(eloChanges).length > 0 && (
              <div className="text-xs text-gray-500 mb-4">
                {Object.entries(eloChanges).map(([username, change]) => (
                  <span key={username} className="mr-4">
                    {username}: <span className={change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {change >= 0 ? '+' : ''}{change}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <Link to="/lobby" className="btn-accent px-6">
                ⚡ Play Again
              </Link>
              <Link to="/leaderboard" className="btn-ghost px-6">
                🏆 Leaderboard
              </Link>
              <Link to="/dashboard" className="btn-ghost px-6">
                📊 History
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
