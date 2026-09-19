import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Swords, 
  PlusCircle, 
  LogIn, 
  Radar, 
  Trophy, 
  X, 
  ArrowRight, 
  Users,
  Timer,
  Eye,
  CheckCircle2,
  Briefcase,
  Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import { getTierBadge } from '../utils/rankUtils';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

export default function LobbyPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const selectedInterviewMode = location.state?.interviewMode || searchParams.get('mode') || sessionStorage.getItem('arena_interview_mode') || 'coding';

  // Persist mode selection in session storage
  useEffect(() => {
    sessionStorage.setItem('arena_interview_mode', selectedInterviewMode);
  }, [selectedInterviewMode]);

  const [mode, setMode] = useState(null); // 'create' | 'join' | 'queue' | 'spectate'
  const [roomInput, setRoomInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inQueue, setInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [activeMatches, setActiveMatches] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);

  // Queue timer
  useEffect(() => {
    let interval;
    if (inQueue) {
      interval = setInterval(() => setQueueTime((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [inQueue]);

  const fetchActiveMatches = async () => {
    setLoadingActive(true);
    try {
      const res = await axios.get(`${API_URL}/api/matches/active`);
      setActiveMatches(res.data.matches || []);
    } catch (err) {
      console.warn('Active matches:', err.message);
    } finally {
      setLoadingActive(false);
    }
  };

  useEffect(() => {
    if (mode === 'spectate') {
      fetchActiveMatches();
      const poll = setInterval(fetchActiveMatches, 5000);
      return () => clearInterval(poll);
    }
  }, [mode]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

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

    socket.on('queue_error', ({ message }) => {
      setInQueue(false);
      setQueueTime(0);
      setError(message || 'Failed to join matchmaking queue');
    });

    return () => {
      socket.off('match_found');
      socket.off('queue_joined');
      socket.off('queue_left');
      socket.off('queue_error');
    };
  }, [socket, navigate]);

  const handleCreateRoom = async () => {
    if (inQueue) handleLeaveQueue();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/matches/create`, {
        mode: selectedInterviewMode || 'coding',
      });
      navigate(`/match/${res.data.roomId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const roomId = roomInput.trim().toUpperCase();
    if (!roomId) {
      setError('Please enter a room code');
      return;
    }
    if (!/^[A-Z0-9]{6}$/.test(roomId)) {
      setError('Room code must be exactly 6 alphanumeric characters (e.g. X7K2M9)');
      return;
    }
    if (inQueue) handleLeaveQueue();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/api/matches/join/${roomId}`);
      navigate(`/match/${roomId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Room not found or match full');
      setLoading(false);
    }
  };

  const handleJoinQueue = () => {
    if (!socket || !socket.connected) {
      setError('Matchmaking socket is still connecting. Please wait a moment and try again.');
      return;
    }
    setError('');
    setMode(null);
    setInQueue(true);
    socket.emit('join_queue', { mode: selectedInterviewMode || 'coding' });
  };

  const handleLeaveQueue = () => {
    if (socket) {
      socket.emit('leave_queue');
    }
    setInQueue(false);
    setQueueTime(0);
    setMode(null);
  };

  const formatQueueTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const userRating = user?.rating || user?.elo || 1000;
  const tier = getTierBadge(userRating);
  const winRate = user?.stats?.totalMatches > 0 
    ? Math.round(((user?.stats?.wins || 0) / user.stats.totalMatches) * 100) 
    : 0;

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Interview Duel Mode Banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border)] px-4 py-3 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {selectedInterviewMode === 'system_design' ? '🏛️' : selectedInterviewMode === 'behavioral' ? '🌟' : '💻'}
            </span>
            <div>
              <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                Selected duel format
              </div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {selectedInterviewMode === 'system_design' 
                  ? 'System Design Whiteboard (React Flow)' 
                  : selectedInterviewMode === 'behavioral' 
                  ? 'Behavioral & Leadership (STAR Method)' 
                  : 'Coding & Algorithms (Sandboxed Runner)'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-mono px-3 py-1.5 rounded-md bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>← Switch format</span>
          </button>
        </div>

        {/* Welcome & Stats Banner */}
        <div className="rounded-xl p-5 sm:p-6 bg-[var(--surface)] border border-[var(--border)] mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono mb-2">
                <span>Gladiator Matchmaking Grid</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                Welcome, {user?.username || 'Gladiator'}
              </h1>
              <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1">
                Enter matchmaking to pair with peers or initialize a private duel room.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center">
              <div className="bg-[var(--surface-raised)] border border-[var(--border)] px-3.5 py-2 rounded-lg text-center min-w-[85px]">
                <p className="text-base font-semibold font-mono text-[var(--text-primary)]">{userRating}</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className={`text-[10px] font-mono px-1 py-0.2 rounded border ${tier.border} ${tier.color} ${tier.bg}`}>
                    {tier.name}
                  </span>
                </div>
              </div>

              <div className="bg-[var(--surface-raised)] border border-[var(--border)] px-3.5 py-2 rounded-lg text-center min-w-[85px]">
                <p className="text-base font-semibold font-mono text-[var(--accent)]">{user?.stats?.wins || 0}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Victories</p>
              </div>

              <div className="bg-[var(--surface-raised)] border border-[var(--border)] px-3.5 py-2 rounded-lg text-center min-w-[85px]">
                <p className="text-base font-semibold font-mono text-[var(--accent-secondary)]">{winRate}%</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Win Rate</p>
              </div>

              <div className="bg-[var(--surface-raised)] border border-[var(--border)] px-3.5 py-2 rounded-lg text-center min-w-[85px]">
                <p className="text-base font-semibold font-mono text-[var(--text-secondary)]">{user?.stats?.totalMatches || 0}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Duels</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3.5 bg-[var(--error-subtle)] border border-[var(--error)] rounded-lg text-[var(--error)] text-xs flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-[var(--error)] hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* 4 MODE ACTION CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Quick Ranked Match */}
          <div 
            className={`rounded-xl p-5 bg-[var(--surface)] border transition-colors flex flex-col justify-between cursor-pointer ${
              inQueue ? 'border-[var(--accent)] shadow-[0_0_15px_rgba(79,163,147,0.15)]' : 'border-[var(--border)] hover:border-[var(--border-active)]'
            }`}
            onClick={() => {
              if (inQueue) {
                handleLeaveQueue();
              } else {
                setMode(null);
                handleJoinQueue();
              }
            }}
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mb-3">
                <Swords className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-[var(--accent)] font-medium">
                  Ranked
                </span>
                {inQueue && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[10px] font-mono text-[var(--accent)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                    Searching
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">Quick Duel</h3>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-4">
                Enter the automatic matchmaking queue. Paired within ±150 rating of your tier.
              </p>
            </div>

            <div className="flex items-center text-[var(--accent)] text-xs font-medium">
              <span>{inQueue ? 'Cancel search' : 'Find match'}</span>
              {inQueue ? <X className="w-3.5 h-3.5 ml-1" /> : <ArrowRight className="w-3.5 h-3.5 ml-1" />}
            </div>
          </div>

          {/* Create Custom Room */}
          <div 
            className={`rounded-xl p-5 bg-[var(--surface)] border transition-colors flex flex-col justify-between cursor-pointer ${
              mode === 'create' ? 'border-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--border-active)]'
            }`}
            onClick={() => {
              if (inQueue) handleLeaveQueue();
              setMode(mode === 'create' ? null : 'create');
            }}
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] mb-3">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-mono text-[var(--text-secondary)] font-medium mb-1">
                Private
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">Create Room</h3>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-4">
                Generate a 6-character room code to invite a peer or practice partner.
              </p>
            </div>

            <div className="flex items-center text-[var(--text-primary)] text-xs font-medium">
              <span>{mode === 'create' ? 'Hide options' : 'Setup room'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Join Room */}
          <div 
            className={`rounded-xl p-5 bg-[var(--surface)] border transition-colors flex flex-col justify-between cursor-pointer ${
              mode === 'join' ? 'border-[var(--accent-secondary)]' : 'border-[var(--border)] hover:border-[var(--border-active)]'
            }`}
            onClick={() => {
              if (inQueue) handleLeaveQueue();
              setMode(mode === 'join' ? null : 'join');
            }}
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-secondary)] mb-3">
                <LogIn className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-mono text-[var(--accent-secondary)] font-medium mb-1">
                Direct Code
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">Join by Code</h3>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-4">
                Have an invitation code? Enter the 6-character code to join the duel.
              </p>
            </div>

            <div className="flex items-center text-[var(--accent-secondary)] text-xs font-medium">
              <span>{mode === 'join' ? 'Hide input' : 'Enter code'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Live Spectate Hub */}
          <div 
            className={`rounded-xl p-5 bg-[var(--surface)] border transition-colors flex flex-col justify-between cursor-pointer ${
              mode === 'spectate' ? 'border-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--border-active)]'
            }`}
            onClick={() => {
              if (inQueue) handleLeaveQueue();
              setMode(mode === 'spectate' ? null : 'spectate');
            }}
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] mb-3">
                <Eye className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-mono text-[var(--text-secondary)] font-medium mb-1">
                Observation
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">Spectate</h3>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-4">
                Watch ongoing duels in real-time and observe test case progress live.
              </p>
            </div>

            <div className="flex items-center text-[var(--text-secondary)] text-xs font-medium">
              <span>{mode === 'spectate' ? 'Hide spectate' : 'View active'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        </div>

        {/* AI Mock Technical Interview Ecosystem Banner */}
        <Link
          to="/interviews/new"
          className="mt-5 block rounded-xl p-4 sm:p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/60 transition-all group shadow-sm hover:shadow-md"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] flex-shrink-0 group-hover:border-[var(--accent)] transition-colors">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-mono text-[var(--accent)] font-medium mb-0.5">
                  AI Mock Interview Studio
                </div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  Simulate FAANG-level mock technical interviews with interactive whiteboard & speech
                </h4>
                <p className="text-[var(--text-secondary)] text-xs mt-0.5">
                  Practice coding, system design, and behavioral interviews with actionable 0–5 rubric feedback.
                </p>
              </div>
            </div>

            <div className="btn btn-accent px-4 py-2 text-xs font-semibold whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 rounded-lg shadow-sm group-hover:bg-[var(--accent-hover)] transition-all">
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </Link>

        {/* MATCHMAKING RADAR SCANNER (When inQueue is active) */}
        <AnimatePresence>
          {inQueue && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, height: 0 }}
              animate={{ opacity: 1, scale: 1, height: 'auto' }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 max-w-md mx-auto bg-[var(--surface)] rounded-2xl p-7 text-center border border-[var(--accent)]/60 overflow-hidden shadow-[0_8px_32px_rgba(79,163,147,0.18)] relative backdrop-blur-md"
            >
              {/* Top ambient radial glow */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[var(--accent)]/15 rounded-full blur-2xl pointer-events-none" />

              {/* Radar Scanner Centerpiece */}
              <div className="relative w-44 h-44 mx-auto mb-5 flex items-center justify-center bg-[#0B1017] rounded-full border border-[var(--accent)]/40 shadow-[inset_0_0_24px_rgba(79,163,147,0.18)] overflow-hidden">
                {/* Sonar Expanding Ripple Pulse */}
                <div 
                  className="absolute inset-0 rounded-full border border-[var(--accent)]/40 pointer-events-none"
                  style={{ animation: 'radarPulseRing 2.8s ease-out infinite' }}
                />
                <div 
                  className="absolute inset-0 rounded-full border border-[var(--accent)]/30 pointer-events-none"
                  style={{ animation: 'radarPulseRing 2.8s ease-out infinite 1.4s' }}
                />

                {/* Concentric rings */}
                <div className="absolute inset-0 rounded-full border border-[var(--accent)]/30" />
                <div className="absolute inset-5 rounded-full border border-[var(--border)]/70" />
                <div className="absolute inset-10 rounded-full border border-[var(--border)]/50" />
                <div className="absolute inset-15 rounded-full border border-[var(--accent)]/40" />

                {/* Crosshairs */}
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
                <div className="absolute inset-y-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-[var(--accent)]/40 to-transparent" />

                {/* Simulated Radar Target Blips */}
                <div 
                  className="absolute top-8 right-10 w-2 h-2 rounded-full bg-[var(--accent-secondary)] shadow-[0_0_8px_var(--accent-secondary)] pointer-events-none"
                  style={{ animation: 'radarPingBlip 2.4s ease-out infinite 0.6s' }}
                />
                <div 
                  className="absolute bottom-11 left-12 w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] pointer-events-none"
                  style={{ animation: 'radarPingBlip 2.4s ease-out infinite 1.8s' }}
                />

                {/* Rotating Sweep Beam with Framer Motion (Smooth 360 Rotation) */}
                <motion.div 
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(79, 163, 147, 0.05) 300deg, rgba(79, 163, 147, 0.5) 360deg)',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
                >
                  {/* Leading edge laser beam */}
                  <div className="absolute top-0 left-1/2 w-[2px] h-1/2 -translate-x-1/2 bg-gradient-to-t from-[var(--accent)] via-[var(--accent)]/70 to-transparent shadow-[0_0_10px_var(--accent)]" />
                </motion.div>

                {/* Center Core Node */}
                <div className="relative z-10 w-5 h-5 rounded-full bg-[var(--accent)]/25 border border-[var(--accent)] flex items-center justify-center shadow-[0_0_12px_var(--accent)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_6px_#fff] animate-pulse" />
                </div>
              </div>

              {/* Status Header Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-raised)] border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-mono mb-2 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
                <span className="font-semibold tracking-wide">Searching for Opponent...</span>
              </div>

              {/* Live HUD Timer */}
              <div className="text-[var(--text-primary)] font-mono text-2xl sm:text-3xl font-black tracking-wider mb-2 drop-shadow-[0_0_12px_rgba(255,255,255,0.08)]">
                {formatQueueTime(queueTime)}
              </div>

              {/* Matchmaking Range Telemetry */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] font-mono text-xs mb-3">
                <span>Rating: <strong className="text-[var(--text-primary)] font-bold">{userRating}</strong></span>
                <span className="text-[var(--text-tertiary)]">•</span>
                <span>Search Range: <strong className="text-[var(--accent)] font-bold">±{150 + Math.floor(queueTime / 5) * 100}</strong></span>
              </div>

              <p className="text-[var(--text-secondary)] text-xs mb-6 max-w-xs mx-auto leading-relaxed">
                Pairing with opponents near your Elo tier. The search radius expands every 5 seconds.
              </p>

              {/* Proper Cancel Button */}
              <div>
                <button
                  type="button"
                  onClick={handleLeaveQueue}
                  className="btn btn-danger px-6 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                  <span>Cancel Matchmaking</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CREATE ROOM PANEL */}
        <AnimatePresence>
          {mode === 'create' && !inQueue && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 max-w-lg mx-auto bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)] text-center"
            >
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">Initialize Private Duel Room</h3>
              <p className="text-[var(--text-secondary)] text-xs mb-4">
                A problem from the competitive pool will be assigned. You will receive a 6-character room code to share with your opponent.
              </p>
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full btn-accent py-2.5 text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Initializing room...' : 'Generate room & enter arena'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* JOIN ROOM PANEL */}
        <AnimatePresence>
          {mode === 'join' && !inQueue && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 max-w-lg mx-auto bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]"
            >
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1 text-center">Enter Room Code</h3>
              <p className="text-[var(--text-secondary)] text-xs mb-3.5 text-center">
                Type the 6-character code provided by your peer:
              </p>

              <form onSubmit={handleJoinRoom} className="flex gap-2">
                <input
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. X7K2M9"
                  className="input flex-1 font-mono tracking-widest uppercase text-center text-sm"
                  maxLength={6}
                  autoFocus
                />
                <button 
                  type="submit" 
                  disabled={loading || !roomInput.trim()} 
                  className="btn-accent px-4 py-2 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Connecting...' : 'Join duel'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LIVE SPECTATE PANEL */}
        <AnimatePresence>
          {mode === 'spectate' && !inQueue && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 max-w-3xl mx-auto bg-[var(--surface)] p-5 rounded-xl border border-[var(--border)]"
            >
              <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Arena Duels</h3>
                </div>
                <button
                  onClick={fetchActiveMatches}
                  className="text-xs font-mono text-[var(--accent)] hover:underline"
                >
                  Refresh
                </button>
              </div>

              {loadingActive ? (
                <div className="py-6 text-center text-[var(--text-secondary)] font-mono text-xs">
                  Scanning live battles...
                </div>
              ) : activeMatches.length === 0 ? (
                <div className="py-6 text-center text-[var(--text-secondary)] text-xs">
                  No active duels in progress right now. Start a match or invite a colleague.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeMatches.map((m) => (
                    <div 
                      key={m.roomId}
                      className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[var(--text-primary)] text-xs">{m.question?.title || 'Problem'}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">
                            {m.question?.difficulty || 'easy'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-[var(--text-secondary)] flex items-center gap-2">
                          <span className="text-[var(--text-primary)] font-medium">{m.players[0]?.username || 'P1'}</span>
                          <span className="text-[var(--text-tertiary)]">vs</span>
                          <span className="text-[var(--text-primary)] font-medium">{m.players[1]?.username || 'P2'}</span>
                          <span className="text-[var(--text-tertiary)]">• Room #{m.roomId}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => navigate(`/match/${m.roomId}?spectate=true`)}
                        className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Spectate</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
