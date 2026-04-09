/**
 * LobbyPage
 * Players can create a room, join one by ID, or enter the matchmaking queue.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

export default function LobbyPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [mode, setMode] = useState(null); // 'create' | 'join' | 'queue'
  const [roomInput, setRoomInput] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);

  // Queue timer
  useEffect(() => {
    let interval;
    if (inQueue) {
      interval = setInterval(() => setQueueTime((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [inQueue]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    // Matchmaking found a match!
    socket.on('match_found', ({ roomId, opponent }) => {
      setInQueue(false);
      navigate(`/match/${roomId}`);
    });

    socket.on('queue_joined', ({ position }) => {
      setInQueue(true);
    });

    socket.on('queue_left', () => {
      setInQueue(false);
      setQueueTime(0);
    });

    return () => {
      socket.off('match_found');
      socket.off('queue_joined');
      socket.off('queue_left');
    };
  }, [socket, navigate]);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/matches/create`);
      setCreatedRoomId(res.data.roomId);
      setMode('created');
      // Auto-navigate to the match page (will show waiting screen)
      navigate(`/match/${res.data.roomId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      const roomId = roomInput.trim().toUpperCase();
      await axios.post(`${API_URL}/api/matches/join/${roomId}`);
      navigate(`/match/${roomId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Room not found');
      setLoading(false);
    }
  };

  const handleJoinQueue = () => {
    if (!socket) return;
    socket.emit('join_queue');
  };

  const handleLeaveQueue = () => {
    if (!socket) return;
    socket.emit('leave_queue');
    setInQueue(false);
    setQueueTime(0);
    setMode(null);
  };

  const formatQueueTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-arena-bg bg-grid">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Welcome header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-white font-display mb-3">
            Welcome back, <span className="text-cyan-400">{user?.username}</span>
          </h1>
          <p className="text-gray-400 text-lg">Choose your battle</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-400">{user?.elo}</p>
              <p className="text-xs text-gray-500">ELO Rating</p>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{user?.stats?.wins || 0}</p>
              <p className="text-xs text-gray-500">Wins</p>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{user?.stats?.totalMatches || 0}</p>
              <p className="text-xs text-gray-500">Matches</p>
            </div>
          </div>
        </div>

        {/* Matchmaking Queue UI */}
        {inQueue && (
          <div className="max-w-md mx-auto mb-8 card border-cyan-500/30 text-center animate-fade-in">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-1">Searching for opponent...</h2>
            <p className="text-gray-400 text-sm mb-4">{formatQueueTime(queueTime)}</p>
            <p className="text-xs text-gray-500 mb-4">You'll be matched with someone of similar ELO</p>
            <button onClick={handleLeaveQueue} className="btn-ghost text-sm">
              Leave Queue
            </button>
          </div>
        )}

        {/* Mode cards */}
        {!inQueue && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Create Room */}
            <div className="card hover:border-cyan-500/40 transition-all group cursor-pointer"
              onClick={() => setMode(mode === 'create' ? null : 'create')}>
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="text-xl font-bold text-white mb-2">Create Room</h3>
              <p className="text-gray-400 text-sm mb-4">
                Generate a room ID and share it with a friend to battle 1v1.
              </p>
              <span className="text-cyan-400 text-sm font-medium group-hover:translate-x-1 inline-block transition-transform">
                Create →
              </span>
            </div>

            {/* Join Room */}
            <div className="card hover:border-purple-500/40 transition-all group cursor-pointer"
              onClick={() => setMode(mode === 'join' ? null : 'join')}>
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="text-xl font-bold text-white mb-2">Join Room</h3>
              <p className="text-gray-400 text-sm mb-4">
                Enter a Room ID shared by your friend to join their match.
              </p>
              <span className="text-purple-400 text-sm font-medium group-hover:translate-x-1 inline-block transition-transform">
                Join →
              </span>
            </div>

            {/* Matchmaking */}
            <div className="card hover:border-yellow-500/40 transition-all group cursor-pointer"
              onClick={() => { setMode('queue'); handleJoinQueue(); }}>
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-white mb-2">Quick Match</h3>
              <p className="text-gray-400 text-sm mb-4">
                Enter the ranked queue. Get matched automatically with a player near your ELO.
              </p>
              <span className="text-yellow-400 text-sm font-medium group-hover:translate-x-1 inline-block transition-transform">
                Find Match →
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Create room action */}
        {mode === 'create' && !inQueue && (
          <div className="mt-6 max-w-md mx-auto card animate-slide-in text-center">
            <h3 className="text-lg font-bold text-white mb-3">Create New Room</h3>
            <p className="text-gray-400 text-sm mb-4">
              A random question will be assigned. Share the room ID with your opponent.
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="btn-accent w-full py-3 disabled:opacity-50"
            >
              {loading ? 'Creating...' : '⚡ Create Room & Start Waiting'}
            </button>
          </div>
        )}

        {/* Join room action */}
        {mode === 'join' && !inQueue && (
          <div className="mt-6 max-w-md mx-auto card animate-slide-in">
            <h3 className="text-lg font-bold text-white mb-3">Join a Room</h3>
            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="Enter Room ID (e.g. X7K2M9)"
                className="input flex-1 font-mono tracking-widest uppercase"
                maxLength={6}
              />
              <button type="submit" disabled={loading} className="btn-accent disabled:opacity-50">
                {loading ? '...' : 'Join'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
