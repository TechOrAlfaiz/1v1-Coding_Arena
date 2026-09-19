/**
 * ResultPage
 * Shows match outcome: victory / defeat / draw cinematic reveal,
 * victory confetti blast, ELO/rating change counters, newly unlocked badges,
 * and Post-Match Approach Diff (side-by-side syntax comparison & execution metrics).
 */

import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { 
  Trophy, 
  Skull, 
  Handshake, 
  Swords, 
  Share2, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Award,
  ChevronRight,
  BarChart3,
  Code2,
  Sparkles,
  Cpu,
  Layers,
  FileCode,
  Zap,
  Play,
  Pause,
  StepBack,
  StepForward,
  Vote,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import { getTierBadge, BADGE_METADATA } from '../utils/rankUtils';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function inferComplexity(code = '') {
  if (!code) return 'O(1)';
  const clean = code.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
  const loopMatches = (clean.match(/\b(for|while)\b/g) || []).length;
  const tripleNested = /\b(for|while)\b[\s\S]*?\{[\s\S]*?\b(for|while)\b[\s\S]*?\{[\s\S]*?\b(for|while)\b/.test(clean);
  const nestedLoop = /\b(for|while)\b[\s\S]*?\{[\s\S]*?\b(for|while)\b/.test(clean);
  const binarySearch = /\b(mid|left\s*<\s*right|low\s*<=\s*high)\b/i.test(clean);

  if (tripleNested) return 'O(N³)';
  if (nestedLoop) return 'O(N²)';
  if (binarySearch) return 'O(log N)';
  if (loopMatches >= 1) return 'O(N)';
  return 'O(1)';
}

export default function ResultPage() {
  const { roomId } = useParams();
  const { state } = useLocation();
  const { user, updateUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [copiedShare, setCopiedShare] = useState(false);

  // Post-match diff data
  const [matchDetails, setMatchDetails] = useState(null);
  const [loadingDiff, setLoadingDiff] = useState(true);

  // Feature 4: Post-Match Replay State
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [replayEvents, setReplayEvents] = useState([]);
  const [scrubberIndex, setScrubberIndex] = useState(0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loadingReplay, setLoadingReplay] = useState(false);

  // Feature 7: Spectator "Who'd You Hire" Vote State
  const [myVote, setMyVote] = useState(null);
  const [ballotTally, setBallotTally] = useState({ player1: 0, player2: 0, both: 0, neither: 0 });
  const [totalBallotVotes, setTotalBallotVotes] = useState(0);

  // Fetch full match details for Post-Match Diff & Replay
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/matches/${roomId}`);
        setMatchDetails(res.data.match || null);
      } catch (err) {
        console.warn('Failed to load approach diff:', err.message);
        if (!state) navigate('/lobby');
      } finally {
        setLoadingDiff(false);
      }
    };
    if (roomId) fetchMatch();
    else if (!state) navigate('/lobby');
  }, [roomId, state, navigate]);

  // Fetch replay timeline snapshots
  useEffect(() => {
    if (!roomId) return;
    const fetchReplay = async () => {
      setLoadingReplay(true);
      try {
        const token = localStorage.getItem('arena_token') || localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/matches/${roomId}/replay`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data?.events && res.data.events.length > 0) {
          setReplayEvents(res.data.events);
          setScrubberIndex(res.data.events.length - 1);
        }
      } catch (e) {
        console.warn('Replay fetch notice:', e.message);
      } finally {
        setLoadingReplay(false);
      }
    };
    fetchReplay();
  }, [roomId]);

  // Spectator Voting Socket Listener
  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit('spectate:join', { roomId });

    socket.on('spectator:vote_update', (data) => {
      if (data.tally) setBallotTally(data.tally);
      if (data.totalVotes !== undefined) setTotalBallotVotes(data.totalVotes);
    });

    return () => {
      socket.off('spectator:vote_update');
    };
  }, [socket, roomId]);

  // Auto-play scrubber animation
  useEffect(() => {
    if (!isPlayingReplay || replayEvents.length <= 1) return;
    const interval = setInterval(() => {
      setScrubberIndex((prev) => {
        if (prev >= replayEvents.length - 1) {
          setIsPlayingReplay(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200 / playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlayingReplay, replayEvents.length, playbackSpeed]);

  const handleCastVote = (candidateKey) => {
    setMyVote(candidateKey);
    if (socket) {
      socket.emit('spectator:vote', { roomId, voteCandidate: candidateKey });
    }
  };

  const username = user?.username || '';
  const result = state?.result || (
    matchDetails
      ? (matchDetails.winner ? 'winner' : 'draw')
      : 'draw'
  );
  const winner = state?.winner || matchDetails?.winnerUsername || matchDetails?.players?.find(p => p.solved)?.username || '';
  const reason = state?.reason || matchDetails?.resultReason || '';
  const eloChanges = state?.eloChanges || {};
  const ratingChanges = state?.ratingChanges || eloChanges;
  const newBadges = state?.newBadges || [];

  const isWinner = result === 'winner' && winner === username;
  const isDraw = result === 'draw';
  const isLoser = result === 'winner' && winner !== username;

  const myPlayerInMatch = matchDetails?.players?.find((p) => p.username === username);
  const myChange = ratingChanges[username] ?? eloChanges[username] ?? myPlayerInMatch?.ratingChange ?? 0;

  // Update local user ELO/rating after result if from live match
  useEffect(() => {
    if (state && myChange !== 0 && user) {
      const currentRating = user.rating || user.elo || 1000;
      updateUser({
        rating: currentRating + myChange,
        elo: currentRating + myChange,
      });
    }
  }, []);

  // Fire celebratory victory confetti on win
  useEffect(() => {
    if (isWinner) {
      const end = Date.now() + 2.5 * 1000;
      const colors = ['#00d4ff', '#00ff88', '#ffd700', '#c084fc'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [isWinner]);

  if (!state && !matchDetails && loadingDiff) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-slate-400">Loading duel results & solution diff...</p>
        </div>
      </div>
    );
  }

  if (!state && !matchDetails) return null;

  const handleShareResult = () => {
    const currentRating = (user?.rating || user?.elo || 1000) + myChange;
    const text = isWinner
      ? `🏆 I just won a 1v1 Coding Duel in Room #${roomId}! Rating: ${currentRating} (+${myChange})`
      : isDraw
      ? `🤝 Tied a fierce 1v1 Coding Duel in Room #${roomId}!`
      : `⚔️ Fought a brutal 1v1 duel in Room #${roomId}! Rematch incoming.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  const outcomeConfig = isWinner
    ? {
        icon: Trophy,
        title: 'VICTORY',
        subtitle: 'Flawless execution. You conquered the arena.',
        titleGradient: 'text-[var(--accent)]',
        border: 'border-[var(--accent)]/40',
        glow: '',
        badgeBg: 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30',
      }
    : isDraw
    ? {
        icon: Handshake,
        title: 'STALEMATE',
        subtitle: reason === 'timeout' ? 'Time expired with equal resilience.' : 'Both gladiators matched pace.',
        titleGradient: 'text-[var(--text-primary)]',
        border: 'border-[var(--border)]',
        glow: '',
        badgeBg: 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)]',
      }
    : {
        icon: Skull,
        title: 'DEFEAT',
        subtitle: `${winner} breached the solution first. Re-arm and strike back.`,
        titleGradient: 'text-[var(--error)]',
        border: 'border-[var(--error)]/40',
        glow: '',
        badgeBg: 'bg-[var(--error)]/15 text-[var(--error)] border-[var(--error)]/30',
      };

  const OutcomeIcon = outcomeConfig.icon;

  // Prepare players for approach diff
  const players = matchDetails?.players || [];
  const p1 = players[0];
  const p2 = players[1];

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Feature 5: Newly Unlocked Badges Banner */}
        {newBadges && newBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="mb-8 p-6 rounded-3xl bg-[var(--surface)] border border-[var(--accent-secondary)]/40 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2 text-[var(--accent-secondary)]">
              <Sparkles className="w-5 h-5" />
              <span className="font-display font-black text-lg tracking-wide uppercase">
                ACHIEVEMENT BADGES UNLOCKED!
              </span>
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-center gap-4 flex-wrap mt-3">
              {newBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)]"
                >
                  <Award className="w-5 h-5 text-[var(--accent-secondary)]" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-[var(--text-primary)]">{badge.name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Main Outcome Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto mb-10"
        >
          <div className={`bg-[var(--surface)] rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden border ${outcomeConfig.border}`}>
            {/* Outcome Icon */}
            <div className="relative z-10 w-20 h-20 mx-auto mb-5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center">
              <OutcomeIcon className={`w-10 h-10 ${
                isWinner ? 'text-[var(--accent)]' : isDraw ? 'text-[var(--text-secondary)]' : 'text-[var(--error)]'
              }`} />
            </div>

            {/* Outcome Title */}
            <h1 className={`text-4xl sm:text-5xl font-black font-display tracking-tight mb-2 ${outcomeConfig.titleGradient}`}>
              {outcomeConfig.title}
            </h1>
            <p className="text-[var(--text-secondary)] text-sm sm:text-base mb-6 max-w-sm mx-auto">
              {outcomeConfig.subtitle}
            </p>

            {/* Rating Delta Card */}
            {myChange !== 0 && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-3 bg-[var(--surface-raised)] rounded-2xl px-6 py-3.5 mb-6 border border-[var(--border)]"
              >
                <div className="text-left">
                  <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-widest">RATING</p>
                  <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
                    {(user.rating || user.elo || 1000) + myChange}
                  </p>
                </div>
                <div className="w-[1px] h-8 bg-[var(--border)] mx-2" />
                <div className="flex items-center gap-1.5">
                  {myChange > 0 ? (
                    <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-[var(--error)]" />
                  )}
                  <span className={`text-2xl font-black font-mono ${
                    myChange > 0 ? 'text-[var(--accent)]' : 'text-[var(--error)]'
                  }`}>
                    {myChange > 0 ? `+${myChange}` : myChange}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Match Telemetry Breakdown */}
            <div className="bg-[var(--surface-raised)] rounded-2xl p-4 mb-6 text-xs text-left font-mono border border-[var(--border)] space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">ROOM ID</span>
                <span className="text-[var(--accent)] font-bold">{roomId}</span>
              </div>
              {winner && (
                <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                  <span className="text-[var(--text-secondary)]">CHAMPION</span>
                  <span className="text-[var(--accent-secondary)] font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {winner}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">RESOLUTION REASON</span>
                <span className="text-[var(--text-primary)]">
                  {reason === 'correct_submission' && 'First Verified Submission'}
                  {reason === 'timeout' && 'Countdown Expired'}
                  {reason === 'draw' && 'Equal Resolution'}
                </span>
              </div>

              {/* Both Players Rating Deltas */}
              {Object.keys(ratingChanges).length > 0 && (
                <div className="pt-1 flex items-center justify-between text-[var(--text-secondary)]">
                  <span>RATING DELTAS:</span>
                  <div className="flex gap-3">
                    {Object.entries(ratingChanges).map(([pName, delta]) => (
                      <span key={pName} className="font-bold">
                        {pName}: <span className={delta >= 0 ? 'text-[var(--accent)]' : 'text-[var(--error)]'}>
                          {delta >= 0 ? `+${delta}` : delta}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
              <Link
                to="/lobby"
                className="w-full sm:w-auto btn-accent px-6 py-3 text-sm flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" />
                <span>Battle Again</span>
              </Link>

              {/* Feature 4: View Replay Button */}
              <button
                onClick={() => setShowReplayModal(true)}
                className="w-full sm:w-auto px-5 py-3 text-sm flex items-center justify-center gap-2 rounded-2xl bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] transition-all font-mono font-bold"
              >
                <Play className="w-4 h-4 text-[var(--accent)]" />
                <span>Match Replay ⏪</span>
              </button>

              <button
                onClick={handleShareResult}
                className="w-full sm:w-auto btn-ghost px-5 py-3 text-sm flex items-center justify-center gap-2"
              >
                {copiedShare ? <Check className="w-4 h-4 text-[var(--accent)]" /> : <Share2 className="w-4 h-4 text-[var(--text-secondary)]" />}
                <span>{copiedShare ? 'Copied Summary!' : 'Share Result'}</span>
              </button>

              <Link
                to="/leaderboard"
                className="w-full sm:w-auto btn-ghost px-5 py-3 text-sm flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4 text-[var(--accent-secondary)]" />
                <span>Leaderboard</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Feature 7: Spectator "Who'd You Hire" Ballot Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="max-w-2xl mx-auto mb-10 bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)] shadow-md"
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <Vote className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-display">
                  Spectator Ballot: Who Would You Hire?
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                  Cast your vote based on algorithmic elegance, syntax cleanliness, and performance.
                </p>
              </div>
            </div>
            {totalBallotVotes > 0 && (
              <span className="text-xs font-mono text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/30 px-2.5 py-1 rounded-xl">
                {totalBallotVotes} {totalBallotVotes === 1 ? 'Vote' : 'Votes'}
              </span>
            )}
          </div>

          {/* Ballot Voting Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { id: 'player1', label: p1?.username || 'Gladiator 1', sub: 'Candidate 1' },
              { id: 'player2', label: p2?.username || 'Gladiator 2', sub: 'Candidate 2' },
              { id: 'both', label: 'Both', sub: 'Strong Hires' },
              { id: 'neither', label: 'Neither', sub: 'Needs Work' },
            ].map((option) => {
              const isSelected = myVote === option.id;
              const count = ballotTally[option.id] || 0;
              const percent = totalBallotVotes > 0 ? Math.round((count / totalBallotVotes) * 100) : 0;

              return (
                <button
                  key={option.id}
                  onClick={() => handleCastVote(option.id)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--text-primary)]'
                      : 'bg-[var(--surface-raised)]/60 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <p className="text-xs font-bold font-mono truncate">{option.label}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-mono mb-1.5 opacity-75">{option.sub}</p>
                  <div className="text-xs font-black font-mono text-[var(--accent)]">
                    {percent}% <span className="text-[10px] text-[var(--text-secondary)] font-normal">({count})</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress Bar of Votes */}
          {totalBallotVotes > 0 && (
            <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--bg-base)] border border-[var(--border)] flex">
              <div
                style={{ width: `${Math.round(((ballotTally.player1 || 0) / totalBallotVotes) * 100)}%` }}
                className="bg-[var(--accent)] transition-all duration-500"
                title={`${p1?.username || 'P1'}: ${ballotTally.player1 || 0}`}
              />
              <div
                style={{ width: `${Math.round(((ballotTally.player2 || 0) / totalBallotVotes) * 100)}%` }}
                className="bg-[var(--accent-secondary)] transition-all duration-500"
                title={`${p2?.username || 'P2'}: ${ballotTally.player2 || 0}`}
              />
              <div
                style={{ width: `${Math.round(((ballotTally.both || 0) / totalBallotVotes) * 100)}%` }}
                className="bg-[var(--text-secondary)] transition-all duration-500"
                title={`Both: ${ballotTally.both || 0}`}
              />
              <div
                style={{ width: `${Math.round(((ballotTally.neither || 0) / totalBallotVotes) * 100)}%` }}
                className="bg-[var(--error)] transition-all duration-500"
                title={`Neither: ${ballotTally.neither || 0}`}
              />
            </div>
          )}
        </motion.div>

        {/* Feature 4: Post-Match Approach Comparison & Code Diff */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--surface)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-xl"
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)] font-display">
                  Post-Match Approach Comparison
                </h2>
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  Side-by-side solution analysis, Judge0 benchmarks, and algorithmic complexity.
                </p>
              </div>
            </div>
            {matchDetails?.question?.title && (
              <span className="text-xs font-mono px-3 py-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)]">
                Problem: {matchDetails.question.title}
              </span>
            )}
          </div>

          {loadingDiff ? (
            <div className="py-16 text-center text-[var(--text-secondary)] font-mono text-xs">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Fetching final submission artifacts...
            </div>
          ) : !p1 || !p2 ? (
            <div className="py-12 text-center text-[var(--text-secondary)] font-mono text-xs">
              Submissions diff is only generated when both duelists submit final solutions.
            </div>
          ) : (
            <div>
              {/* Computed Metric Comparison Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono text-xs">
                {/* Lines of Code */}
                <div className="p-3.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
                  <span className="text-[var(--text-secondary)] block mb-1 text-[10px] uppercase">Lines of Code (LOC)</span>
                  <div className="flex items-center justify-center gap-3 font-bold">
                    <span className="text-[var(--accent)]">{p1.username}: {p1.linesOfCode || (p1.lastCode ? p1.lastCode.split('\n').length : 0)}</span>
                    <span className="text-[var(--text-secondary)] opacity-50">vs</span>
                    <span className="text-[var(--accent-secondary)]">{p2.username}: {p2.linesOfCode || (p2.lastCode ? p2.lastCode.split('\n').length : 0)}</span>
                  </div>
                </div>

                {/* Execution Time */}
                <div className="p-3.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
                  <span className="text-[var(--text-secondary)] block mb-1 text-[10px] uppercase">Judge0 Exec Speed</span>
                  <div className="flex items-center justify-center gap-3 font-bold">
                    <span className="text-[var(--accent)]">{p1.executionTime ? `${p1.executionTime}ms` : '—'}</span>
                    <span className="text-[var(--text-secondary)] opacity-50">vs</span>
                    <span className="text-[var(--accent-secondary)]">{p2.executionTime ? `${p2.executionTime}ms` : '—'}</span>
                  </div>
                </div>

                {/* Memory Footprint */}
                <div className="p-3.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
                  <span className="text-[var(--text-secondary)] block mb-1 text-[10px] uppercase">Memory Footprint</span>
                  <div className="flex items-center justify-center gap-3 font-bold">
                    <span className="text-[var(--accent)]">{p1.memory ? `${p1.memory}KB` : '—'}</span>
                    <span className="text-[var(--text-secondary)] opacity-50">vs</span>
                    <span className="text-[var(--accent-secondary)]">{p2.memory ? `${p2.memory}KB` : '—'}</span>
                  </div>
                </div>

                {/* Inferred Complexity */}
                <div className="p-3.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] text-center">
                  <span className="text-[var(--text-secondary)] block mb-1 text-[10px] uppercase">Inferred Complexity</span>
                  <div className="flex items-center justify-center gap-3 font-bold">
                    <span className="text-[var(--accent)]">{inferComplexity(p1.lastCode)}</span>
                    <span className="text-[var(--text-secondary)] opacity-50">vs</span>
                    <span className="text-[var(--accent-secondary)]">{inferComplexity(p2.lastCode)}</span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Code Editors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Player 1 Solution */}
                <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)]">
                  <div className="p-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-[var(--accent)]" />
                      <span className="font-bold text-[var(--text-primary)]">{p1.username}'s Solution</span>
                      {p1.solved && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                          SOLVED
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] uppercase">{p1.language || 'javascript'}</span>
                  </div>

                  <div className="h-80">
                    <Editor
                      height="100%"
                      language={p1.language || 'javascript'}
                      value={p1.lastCode || '// No code submitted'}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        domReadOnly: true,
                      }}
                    />
                  </div>
                </div>

                {/* Player 2 Solution */}
                <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)]">
                  <div className="p-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-[var(--accent-secondary)]" />
                      <span className="font-bold text-[var(--text-primary)]">{p2.username}'s Solution</span>
                      {p2.solved && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                          SOLVED
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] uppercase">{p2.language || 'javascript'}</span>
                  </div>

                  <div className="h-80">
                    <Editor
                      height="100%"
                      language={p2.language || 'javascript'}
                      value={p2.lastCode || '// No code submitted'}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        domReadOnly: true,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Feature 4: Post-Match Replay Time Machine Modal */}
      {showReplayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md">
          <div className="bg-[var(--surface-raised)] max-w-4xl w-full rounded-3xl p-6 border border-[var(--border)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] font-display">
                    Duel Replay & Timeline Scrubbing
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                    Scrub through the keystrokes and code evolution during the battle.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : 1))}
                  className="px-2.5 py-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                >
                  {playbackSpeed}x Speed
                </button>
                <button
                  onClick={() => {
                    setIsPlayingReplay(false);
                    setShowReplayModal(false);
                  }}
                  className="p-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content / Editor */}
            {loadingReplay ? (
              <div className="py-24 text-center text-[var(--text-secondary)] font-mono text-xs">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading timeline snapshots...
              </div>
            ) : replayEvents.length === 0 ? (
              <div className="py-24 text-center text-[var(--text-secondary)] font-mono text-xs space-y-2">
                <p>No editor snapshots were recorded for this match session.</p>
                <p className="text-[var(--text-secondary)] text-[11px] opacity-75">
                  (Snapshots are automatically captured every 4 seconds during active combat duels)
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden py-4 gap-4">
                {/* Snapshot Meta Info */}
                <div className="flex items-center justify-between text-xs font-mono bg-[var(--surface)] px-4 py-2 rounded-xl border border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-secondary)]">Snapshot:</span>
                    <span className="text-[var(--accent)] font-bold">
                      {scrubberIndex + 1} / {replayEvents.length}
                    </span>
                    <span className="text-[var(--border)]">|</span>
                    <span className="text-[var(--text-secondary)]">Gladiator:</span>
                    <span className="text-[var(--text-primary)] font-bold">
                      {replayEvents[scrubberIndex]?.player || 'Duelist'}
                    </span>
                  </div>

                  <div className="text-[var(--text-secondary)]">
                    Timestamp:{' '}
                    <span className="text-[var(--text-primary)]">
                      {replayEvents[scrubberIndex]?.t
                        ? new Date(replayEvents[scrubberIndex].t).toLocaleTimeString()
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Monaco Editor in Read-only view */}
                <div className="flex-1 min-h-[300px] rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
                  <Editor
                    height="100%"
                    language={replayEvents[scrubberIndex]?.language || 'javascript'}
                    value={replayEvents[scrubberIndex]?.code || '// Snapshot empty'}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>

                {/* Timeline Scrubber & Playback Controls */}
                <div className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)] space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlayingReplay(!isPlayingReplay)}
                      className="btn-accent p-2 rounded-xl"
                    >
                      {isPlayingReplay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => {
                        setIsPlayingReplay(false);
                        setScrubberIndex((idx) => Math.max(0, idx - 1));
                      }}
                      className="p-2 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"
                    >
                      <StepBack className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setIsPlayingReplay(false);
                        setScrubberIndex((idx) => Math.min(replayEvents.length - 1, idx + 1));
                      }}
                      className="p-2 rounded-xl bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]"
                    >
                      <StepForward className="w-4 h-4" />
                    </button>

                    {/* Range Scrubber Slider */}
                    <input
                      type="range"
                      min="0"
                      max={replayEvents.length - 1}
                      value={scrubberIndex}
                      onChange={(e) => {
                        setIsPlayingReplay(false);
                        setScrubberIndex(parseInt(e.target.value, 10));
                      }}
                      className="flex-1 accent-[var(--accent)] cursor-pointer h-2 bg-[var(--surface-raised)] rounded-lg"
                    />

                    <span className="text-xs font-mono text-[var(--text-secondary)] min-w-[50px] text-right">
                      {Math.round(((scrubberIndex + 1) / replayEvents.length) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
