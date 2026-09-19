/**
 * MatchPage — The 1v1 Battle Arena & Live Spectator Theater.
 * Supports:
 * - Real-time duel cockpit with Monaco editor, telemetry, countdown timer
 * - Live Spectator Mode (isolated room, dual player test progress bars, problem view, zero code leakage)
 * - "X people watching" live counter
 * - Battle Power-ups (Time Surge +30s, Neural Peek 5s, Deep Scan Hint reveal)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, 
  Clock, 
  Send, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Sparkles, 
  Code2, 
  Zap, 
  Flame,
  Trophy, 
  Shield, 
  MessageSquare, 
  RotateCcw, 
  Users,
  Keyboard,
  EyeOff,
  Hourglass,
  Lightbulb,
  FileCode,
  Play,
  Terminal,
  HelpCircle,
  SendHorizontal,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import { getTierBadge } from '../utils/rankUtils';
import ReactFlowSystemDesign from '../components/ReactFlowSystemDesign';
import BehavioralArenaRoom from '../components/BehavioralArenaRoom';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
  { id: 'java', label: 'Java', monacoId: 'java' },
];

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

export default function MatchPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const forceSpectate = queryParams.get('spectate') === 'true';

  // Mode state: 'coding' | 'system_design' | 'behavioral'
  const [matchMode, setMatchMode] = useState(location.state?.mode || 'coding');

  // Match state
  const [matchStatus, setMatchStatus] = useState('waiting'); // waiting | active | completed
  const [question, setQuestion] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playerCount, setPlayerCount] = useState(1);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isSpectator, setIsSpectator] = useState(forceSpectate);

  // Role Swap state
  const [roleSwapData, setRoleSwapData] = useState(null);
  const [roleSwapTranscript, setRoleSwapTranscript] = useState([]);
  const [roleSwapInput, setRoleSwapInput] = useState('');

  // Spectator mode live telemetry for both players: { [username]: { passedTests, totalTests, solved } }
  const [spectatorProgress, setSpectatorProgress] = useState({});

  // Editor state
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const starterCodeRef = useRef({});

  // Timer
  const [timeLeft, setTimeLeft] = useState(900);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [activeTab, setActiveTab] = useState('testcases'); // testcases | run
  const [pendingMatchResult, setPendingMatchResult] = useState(null);
  const [navigateCountdown, setNavigateCountdown] = useState(null);
  const navigateCountdownRef = useRef(null);

  // Focus mode / bg dimming
  const [focusMode, setFocusMode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Opponent status
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [opponentSubmitting, setOpponentSubmitting] = useState(false);
  const [opponentWrongAnswer, setOpponentWrongAnswer] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  // Feature 2: Battle Power-Ups
  const [powerupUses, setPowerupUses] = useState({ extra_time: 1, peek_progress: 1, hint_reveal: 1 });
  const [powerupNotification, setPowerupNotification] = useState(null);
  const [peekOverlay, setPeekOverlay] = useState(null); // { opponentName, passedCount, totalCount, secondsLeft }
  const [revealedHint, setRevealedHint] = useState(null); // { input, expectedOutput }

  // Prevent double submission
  const [hasWon, setHasWon] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Join room (either as player or as spectator)
  useEffect(() => {
    if (!socket) return;

    if (forceSpectate) {
      setIsSpectator(true);
      socket.emit('spectate:join', { roomId });
    } else {
      socket.emit('join_room', { roomId });
    }

    return () => {
      if (forceSpectate) {
        socket.emit('spectate:leave', { roomId });
      } else {
        socket.emit('leave_room', { roomId });
      }
    };
  }, [socket, roomId, forceSpectate]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Room update
    socket.on('room_update', ({ playerCount: pc, players: p, status: s }) => {
      setPlayerCount(pc);
      setPlayers(p || []);
      if (s) setMatchStatus(s);

      // Check if logged-in user is one of the players
      if (!forceSpectate && p && p.length > 0) {
        const amIPlayer = p.some((player) => player.username === user.username);
        if (p.length >= 2 && !amIPlayer) {
          setIsSpectator(true);
          socket.emit('spectate:join', { roomId });
        }
      }
    });

    // Match Start
    socket.on('start_match', ({ mode: m, question: q, players: p, duration }) => {
      if (m) setMatchMode(m);
      setQuestion(q);
      setPlayers(p || []);
      setMatchStatus('active');
      setTimeLeft(duration || 900);
      starterCodeRef.current = q?.starterCode || {};
      if (!isSpectator) {
        setCode(q?.starterCode?.javascript || '// Write your solution here\n');
      }
    });

    // Timer Sync
    socket.on('timer_sync', ({ timeLeft: t }) => {
      setTimeLeft(t);
    });

    // Spectator Count Update
    socket.on('spectate:count', ({ count }) => {
      setSpectatorCount(count || 0);
    });

    // Spectator Initial State
    socket.on('spectate:init', (data) => {
      if (data.mode) setMatchMode(data.mode);
      setQuestion(data.question);
      setPlayers(data.players || []);
      setTimeLeft(data.timeLeft || 900);
      setMatchStatus(data.status || 'active');
      setSpectatorCount(data.spectatorCount || 0);

      const initialProg = {};
      (data.players || []).forEach((p) => {
        initialProg[p.username] = {
          passedTests: p.passedTests || 0,
          totalTests: p.totalTests || 0,
          solved: p.solved || false,
        };
      });
      setSpectatorProgress(initialProg);
    });

    // Spectator Progress Updates (Telemetry from server, NO CODE LEAKAGE)
    socket.on('spectate:update', ({ username, passedTests, totalTests, solved }) => {
      setSpectatorProgress((prev) => ({
        ...prev,
        [username]: { passedTests, totalTests, solved },
      }));
    });

    // Opponent activity telemetry
    socket.on('player_submitting', ({ username }) => {
      if (username !== user.username) {
        setOpponentSubmitting(true);
        setTimeout(() => setOpponentSubmitting(false), 3000);
      }
    });

    socket.on('opponent_wrong_answer', ({ username, passedTests, totalTests }) => {
      setOpponentWrongAnswer(true);
      setTimeout(() => setOpponentWrongAnswer(false), 3000);
    });

    socket.on('opponent_typing', ({ username, isTyping }) => {
      if (username !== user.username) setOpponentTyping(isTyping);
    });

    socket.on('opponent_disconnected', () => {
      setOpponentDisconnected(true);
    });

    // Submission results
    socket.on('submission_result', (data) => {
      if (data.status === 'judging') {
        setSubmitResult({ status: 'judging' });
        setActiveTab('testcases');
        return;
      }
      setSubmitting(false);
      setSubmitResult(data);
      setActiveTab('testcases');
      if (data.passed) setHasWon(true);
    });

    socket.on('run_result', (data) => {
      setRunning(false);
      setRunResult(data);
      setActiveTab('run');
    });

    // Feature 2: Power-Ups Events
    socket.on('powerup:effect', (data) => {
      if (data.remainingUses) {
        setPowerupUses(data.remainingUses);
      }

      if (data.powerupId === 'extra_time') {
        setPowerupNotification({
          type: 'extra_time',
          text: `⏱️ ${data.message || '+30s Added to Match Timer!'}`,
        });
        setTimeout(() => setPowerupNotification(null), 4000);
      } else if (data.powerupId === 'peek_progress') {
        let seconds = 5;
        setPeekOverlay({
          opponentName: data.opponentName,
          passedCount: data.passedCount,
          totalCount: data.totalCount,
          secondsLeft: seconds,
        });

        const peekTimer = setInterval(() => {
          seconds -= 1;
          if (seconds <= 0) {
            clearInterval(peekTimer);
            setPeekOverlay(null);
          } else {
            setPeekOverlay((prev) => prev ? { ...prev, secondsLeft: seconds } : null);
          }
        }, 1000);
      } else if (data.powerupId === 'hint_reveal') {
        setRevealedHint(data.hint);
        setPowerupNotification({
          type: 'hint_reveal',
          text: '💡 Deep Scan Complete: Hidden test case input revealed in Test Cases tab!',
        });
        setTimeout(() => setPowerupNotification(null), 5000);
      }
    });

    socket.on('opponent_powerup_used', ({ username, message }) => {
      setPowerupNotification({
        type: 'opponent',
        text: `⚠️ Opponent Alert: ${message}`,
      });
      setTimeout(() => setPowerupNotification(null), 4000);
    });

    socket.on('powerup:error', ({ message }) => {
      setPowerupNotification({
        type: 'error',
        text: `❌ ${message}`,
      });
      setTimeout(() => setPowerupNotification(null), 3500);
    });

    // Fetch room mode & transcript if already existing
    const fetchRoomDetails = async () => {
      try {
        const token = localStorage.getItem('arena_token') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/matches/${roomId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.match?.mode) setMatchMode(data.match.mode);
          if (data?.match?.transcript && data.match.transcript.length > 0) {
            setRoleSwapTranscript(data.match.transcript);
          }
        }
      } catch (err) {
        // silent fallback
      }
    };
    fetchRoomDetails();

    // Match Completed Event
    socket.on('match_result', (data) => {
      setMatchStatus('completed');
      setPendingMatchResult(data);
      setActiveTab('testcases');

      // If in coding mode, role_swap_started will cancel this countdown; otherwise countdown navigates to results
      let countdown = 4;
      setNavigateCountdown(countdown);
      navigateCountdownRef.current = setInterval(() => {
        countdown -= 1;
        setNavigateCountdown(countdown);
        if (countdown <= 0) {
          clearInterval(navigateCountdownRef.current);
          navigate(`/result/${roomId}`, { state: data });
        }
      }, 1000);
    });

    // Feature 3: Interviewer Swap Round Socket Events
    socket.on('role_swap_started', (data) => {
      if (navigateCountdownRef.current) {
        clearInterval(navigateCountdownRef.current);
        setNavigateCountdown(null);
      }
      setRoleSwapData(data);
    });

    socket.on('role_swap:question_received', (entry) => {
      setRoleSwapTranscript((prev) => [...prev, entry]);
    });

    socket.on('role_swap:answer_received', (entry) => {
      setRoleSwapTranscript((prev) => [...prev, entry]);
    });

    socket.on('role_swap_concluded', () => {
      setRoleSwapData(null);
      navigate(`/result/${roomId}`, { state: pendingMatchResult });
    });

    return () => {
      socket.off('room_update');
      socket.off('start_match');
      socket.off('timer_sync');
      socket.off('spectate:count');
      socket.off('spectate:init');
      socket.off('spectate:update');
      socket.off('player_submitting');
      socket.off('opponent_wrong_answer');
      socket.off('opponent_typing');
      socket.off('opponent_disconnected');
      socket.off('submission_result');
      socket.off('run_result');
      socket.off('powerup:effect');
      socket.off('opponent_powerup_used');
      socket.off('powerup:error');
      socket.off('match_result');
      socket.off('role_swap_started');
      socket.off('role_swap:question_received');
      socket.off('role_swap:answer_received');
      socket.off('role_swap_concluded');
      if (navigateCountdownRef.current) clearInterval(navigateCountdownRef.current);
    };
  }, [socket, user, navigate, roomId, forceSpectate, isSpectator, pendingMatchResult]);

  // Feature 4: Post-Match Replay periodic snapshot recording
  useEffect(() => {
    if (!socket || matchStatus !== 'active' || isSpectator || matchMode !== 'coding' || !code) return;
    const interval = setInterval(() => {
      socket.emit('replay:snapshot', {
        roomId,
        code,
        language,
        timestamp: Date.now(),
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [socket, matchStatus, isSpectator, matchMode, roomId, code, language]);

  const handleSendRoleSwapQuestion = (qText) => {
    const textToSend = qText || roleSwapInput;
    if (!textToSend.trim() || !socket) return;
    socket.emit('role_swap:send_question', { roomId, question: textToSend });
    setRoleSwapInput('');
  };

  const handleSendRoleSwapAnswer = () => {
    if (!roleSwapInput.trim() || !socket) return;
    socket.emit('role_swap:send_answer', { roomId, answer: roleSwapInput });
    setRoleSwapInput('');
  };

  const handleFinishRoleSwap = () => {
    if (socket) {
      socket.emit('role_swap:finish', { roomId });
    }
    navigate(`/result/${roomId}`, { state: pendingMatchResult });
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const starter = starterCodeRef.current[newLang] || `// Write your ${newLang} solution here\n`;
    setCode(starter);
    setSubmitResult(null);
    setRunResult(null);
  };

  const handleEditorChange = (value) => {
    setCode(value || '');

    if (socket && matchStatus === 'active') {
      socket.emit('typing_indicator', { roomId, isTyping: true });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_indicator', { roomId, isTyping: false });
      }, 2000);
    }
  };

  const handleSubmit = () => {
    if (!socket || submitting || hasWon) return;
    setSubmitting(true);
    setSubmitResult(null);
    socket.emit('code_submit', { roomId, code, language });
  };

  const handleRun = () => {
    if (!socket || running) return;
    setRunning(true);
    setRunResult(null);
    socket.emit('run_code', { roomId, code, language, customInput });
  };

  // Power-up activation handler
  const handleUsePowerup = (powerupId) => {
    if (!socket || matchStatus !== 'active' || hasWon) return;
    if ((powerupUses[powerupId] || 0) <= 0) return;
    socket.emit('powerup:use', { roomId, powerupId });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const timerClass = timeLeft < 60
    ? 'text-[var(--error)] animate-pulse bg-[var(--error)]/10 border-[var(--error)]/30'
    : timeLeft < 180
    ? 'text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10 border-[var(--accent-secondary)]/30'
    : 'text-[var(--text-primary)] bg-[var(--surface-raised)] border-[var(--border)]';

  // ─── SPECTATOR MODE VIEW ───────────────────────────────────────────────────
  if (isSpectator) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
        <Navbar />

        {/* Spectator Top Cockpit HUD */}
        <div className="backdrop-blur-xl bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 px-3 py-1.5 rounded-xl font-mono text-xs">
              <Eye className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-bold">LIVE SPECTATOR MODE</span>
              <span className="text-[var(--text-secondary)]">•</span>
              <span>ROOM #{roomId}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
              <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{spectatorCount} Watching</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`text-2xl font-mono font-black tracking-widest px-4 py-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] ${timerClass}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          <Link
            to="/lobby"
            className="btn-ghost text-xs px-3.5 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Leave Spectator Mode
          </Link>
        </div>

        {/* Spectator Main Grid */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 6 cols: Problem Statement */}
          <div className="lg:col-span-6 bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)] flex flex-col overflow-y-auto max-h-[calc(100vh-10rem)]">
            {question ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-mono px-2.5 py-0.5 rounded-md uppercase font-bold ${
                    question.difficulty === 'easy' ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30' :
                    question.difficulty === 'medium' ? 'bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30' :
                    'bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30'
                  }`}>
                    {question.difficulty}
                  </span>
                  <h1 className="text-2xl font-extrabold text-[var(--text-primary)] font-display">
                    {question.title}
                  </h1>
                </div>

                <div className="prose prose-invert prose-sm max-w-none text-[var(--text-secondary)] leading-relaxed space-y-4 mb-6">
                  <p className="whitespace-pre-wrap">{question.description}</p>
                </div>

                {/* Examples */}
                {question.examples && question.examples.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                      Sample Test Cases:
                    </h3>
                    {question.examples.map((ex, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-xs space-y-1.5">
                        <div className="text-[var(--text-secondary)]">
                          <span className="text-[var(--accent)] font-bold">Input:</span> {ex.input}
                        </div>
                        <div className="text-[var(--text-secondary)]">
                          <span className="text-[var(--accent)] font-bold">Expected Output:</span> {ex.output}
                        </div>
                        {ex.explanation && (
                          <div className="text-[var(--text-secondary)] text-[11px] pt-1">
                            {ex.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-[var(--text-secondary)] font-mono text-xs">
                Synchronizing match statement...
              </div>
            )}
          </div>

          {/* Right 6 cols: Dual Gladiators Live Telemetry */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-display mb-4 flex items-center gap-2">
                <Swords className="w-5 h-5 text-[var(--accent)]" />
                <span>Duelists Progress Telemetry</span>
              </h2>

              <div className="space-y-6">
                {players.map((p, idx) => {
                  const pProg = spectatorProgress[p.username] || { passedTests: 0, totalTests: 5, solved: false };
                  const percent = pProg.totalTests > 0 ? Math.round((pProg.passedTests / pProg.totalTests) * 100) : 0;
                  const tier = getTierBadge(p.rating || 1000);

                  return (
                    <div 
                      key={p.username || idx}
                      className="p-5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-bold text-sm text-[var(--text-primary)] font-mono">
                            {p.username ? p.username.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--text-primary)] text-sm">{p.username}</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${tier.bg} ${tier.color} border ${tier.border}`}>
                                {tier.name} ({p.rating || 1000})
                              </span>
                            </div>
                            <span className="text-xs text-[var(--text-secondary)] font-mono">Combatant</span>
                          </div>
                        </div>

                        <div>
                          {pProg.solved ? (
                            <span className="px-3 py-1 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 text-xs font-mono font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> SOLVED
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] text-xs font-mono">
                              In Combat
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Test Case Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1.5">
                          <span className="text-[var(--text-secondary)]">Verified Test Cases:</span>
                          <span className="text-[var(--accent)] font-bold">{pProg.passedTests} / {pProg.totalTests || '—'} Passed</span>
                        </div>
                        <div className="w-full h-3 bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border)]">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-[var(--accent)] rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Anti-cheat Notice for Spectators */}
              <div className="mt-6 p-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono flex items-center gap-3">
                <Shield className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                <span>
                  Anti-Cheat Protection: Dual editor source code is shielded from spectator channels during active combat.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── WAITING ROOM SCREEN ───────────────────────────────────────────────────
  if (matchStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-[var(--bg-base)]">
        <Navbar />

        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full bg-[var(--surface)] rounded-3xl p-8 text-center relative overflow-hidden border border-[var(--border)]"
          >
            {/* Minimal Radar Pulse for Waiting */}
            <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[var(--border)]" />
              <div className="absolute inset-2 rounded-full border border-[var(--border)]" />
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center">
                <Swords className="w-5 h-5 text-[var(--accent)]" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-display mb-2">
              Waiting for Challenger...
            </h2>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm mb-6">
              Transmit this duel code to your opponent to begin instant combat:
            </p>

            {/* Room ID Badge */}
            <div className="inline-flex items-center gap-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-2xl px-6 py-4 mb-6">
              <span className="text-3xl sm:text-4xl font-mono font-black text-[var(--accent)] tracking-widest select-all">
                {roomId}
              </span>
              <button
                onClick={copyRoomId}
                className="p-2 bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-colors border border-[var(--border)]"
                title="Copy Room ID"
              >
                {copiedCode ? <Check className="w-5 h-5 text-[var(--accent)]" /> : <Copy className="w-5 h-5 text-[var(--text-secondary)]" />}
              </button>
            </div>

            {/* Connection Slots */}
            <div className="bg-[var(--surface-raised)] rounded-2xl p-4 border border-[var(--border)] max-w-xs mx-auto mb-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2 font-mono">
                <span>SLOTS FILLED</span>
                <span className="text-[var(--accent)] font-bold">{playerCount} / 2 READY</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 rounded-full transition-all ${
                      i < playerCount 
                        ? 'bg-[var(--accent)]' 
                        : 'bg-[var(--surface)]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-[var(--text-secondary)] text-xs font-mono">
              The arena will initialize automatically once both gladiators connect.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE BATTLE ARENA ──────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col bg-[var(--bg-base)] transition-opacity duration-300 ${focusMode ? 'bg-[var(--bg-base)]' : ''}`}>
      {/* Background Dimming Overlay during Focus Mode */}
      {focusMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-none z-0" />
      )}

      {/* Top Cockpit HUD */}
      <div className="relative z-20 backdrop-blur-xl bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 py-2.5 flex items-center justify-between flex-wrap gap-3">
        {/* Left: Room Badge & Connected Gladiators & Spectators Counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--surface-raised)] px-3 py-1.5 rounded-xl border border-[var(--border)] font-mono text-xs text-[var(--text-secondary)]">
            <span>ROOM:</span>
            <span className="text-[var(--accent)] font-bold tracking-wider">{roomId}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] font-mono text-xs uppercase font-bold">
            {matchMode === 'system_design' ? '🏗️ System Design' : matchMode === 'behavioral' ? '🎯 Behavioral STAR' : '⚔️ Coding Arena'}
          </div>

          <div className="flex items-center gap-2">
            {players.map((p, i) => {
              const isMe = p.username === user.username;
              return (
                <div 
                  key={i} 
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl border ${
                    isMe 
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]' 
                      : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isMe ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--text-secondary)]'}`} />
                  <span className="font-medium font-mono">
                    {p.username}{isMe ? ' (You)' : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Feature 3: Spectator Counter Badge */}
          {spectatorCount > 0 && (
            <div className="flex items-center gap-1.5 bg-[var(--surface-raised)] border border-[var(--border)] px-2.5 py-1 rounded-xl text-xs font-mono text-[var(--accent)]">
              <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{spectatorCount} Spectating</span>
            </div>
          )}
        </div>

        {/* Center: Urgency Countdown Timer */}
        <div className="flex items-center gap-2">
          <div className={`text-2xl sm:text-3xl font-mono font-black tracking-widest px-4 py-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] ${timerClass}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Right: Opponent Telemetry & Focus Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Opponent Status Badges */}
          <div className="flex items-center gap-1.5 text-xs">
            {opponentTyping && (
              <span className="flex items-center gap-1.5 bg-[var(--surface-raised)] text-[var(--text-primary)] px-2.5 py-1 rounded-xl border border-[var(--border)] font-mono">
                <Keyboard className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Opponent Typing...</span>
              </span>
            )}
            {opponentSubmitting && (
              <span className="flex items-center gap-1.5 bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] px-2.5 py-1 rounded-xl border border-[var(--accent-secondary)]/30 font-mono">
                <Zap className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                <span>Opponent Submitting!</span>
              </span>
            )}
            {opponentWrongAnswer && (
              <span className="flex items-center gap-1.5 bg-[var(--error)]/15 text-[var(--error)] px-2.5 py-1 rounded-xl border border-[var(--error)]/30 font-mono">
                <XCircle className="w-3.5 h-3.5 text-[var(--error)]" />
                <span>Opponent Test Failed</span>
              </span>
            )}
            {opponentDisconnected && (
              <span className="flex items-center gap-1.5 bg-[var(--error)]/15 text-[var(--error)] px-2.5 py-1 rounded-xl border border-[var(--error)]/30 font-mono">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Opponent Left</span>
              </span>
            )}
          </div>

          {/* Focus Mode Button */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`p-2 rounded-xl transition-all border ${
              focusMode 
                ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]' 
                : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Focus Dimming"
          >
            {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Feature 2: Power-Up Notification Toast */}
      <AnimatePresence>
        {powerupNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mx-4 sm:mx-6 mt-2 p-3 rounded-2xl border text-xs font-mono flex items-center justify-between z-30 shadow-md ${
              powerupNotification.type === 'error'
                ? 'bg-[var(--error)]/15 border-[var(--error)]/30 text-[var(--error)]'
                : powerupNotification.type === 'opponent'
                ? 'bg-[var(--accent-secondary)]/15 border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)]'
                : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--accent)]'
            }`}
          >
            <span>{powerupNotification.text}</span>
            <button onClick={() => setPowerupNotification(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <Check className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature 2: Neural Peek 5-Second Overlay */}
      <AnimatePresence>
        {peekOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] shadow-xl max-w-xs w-full text-center font-mono"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[var(--accent)] text-xs font-bold">
                <Eye className="w-4 h-4 text-[var(--accent)] animate-pulse" />
                <span>NEURAL PEEK ACTIVE</span>
              </div>
              <span className="text-xs text-[var(--accent-secondary)] font-black">{peekOverlay.secondsLeft}s</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">
              Opponent: <span className="font-bold text-[var(--text-primary)]">{peekOverlay.opponentName}</span>
            </p>
            <p className="text-lg font-extrabold text-[var(--accent)]">
              {peekOverlay.passedCount} / {peekOverlay.totalCount} Tests Passed
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Duel Content Area (Problem Statement + Editor & Console OR System Design / Behavioral) */}
      {matchMode === 'system_design' ? (
        <div className="flex-1 flex flex-col overflow-hidden relative z-10 p-3 sm:p-4">
          <ReactFlowSystemDesign roomId={roomId} isSpectator={isSpectator} />
        </div>
      ) : matchMode === 'behavioral' ? (
        <div className="flex-1 flex flex-col overflow-hidden relative z-10 p-3 sm:p-4">
          <BehavioralArenaRoom roomId={roomId} isSpectator={isSpectator} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10 p-3 sm:p-4 gap-4">
        {/* Left Column: Problem Workspace */}
        <div className="lg:w-5/12 flex flex-col bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)]">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {question ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                      question.difficulty === 'easy' ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30' :
                      question.difficulty === 'medium' ? 'bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30' :
                      'bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30'
                    }`}>
                      {question.difficulty}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] font-display">
                      {question.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(question.tags || []).map((tag, i) => (
                      <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {question.description}
                </div>

                {/* Examples */}
                {question.examples && question.examples.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Sample Test Cases:
                    </h3>
                    {question.examples.map((ex, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] font-mono text-xs space-y-1">
                        <div className="text-[var(--text-secondary)]">
                          <span className="text-[var(--accent)] font-bold">Input:</span> {ex.input}
                        </div>
                        <div className="text-[var(--text-secondary)]">
                          <span className="text-[var(--accent)] font-bold">Expected:</span> {ex.output}
                        </div>
                        {ex.explanation && (
                          <div className="text-[var(--text-secondary)] text-[11px] pt-1 opacity-80">
                            {ex.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center text-[var(--text-secondary)] font-mono text-xs">
                Synchronizing coding statement...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Cockpit & Power-Up Dock */}
        <div className="lg:w-7/12 flex flex-col gap-3">
          {/* Feature 2: Battle Power-Ups Dock */}
          <div className="bg-[var(--surface)] p-2.5 rounded-2xl border border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider">
                TACTICAL POWER-UPS:
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Power-Up 1: Time Surge */}
              <button
                onClick={() => handleUsePowerup('extra_time')}
                disabled={(powerupUses.extra_time || 0) <= 0 || matchStatus !== 'active' || hasWon}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border ${
                  (powerupUses.extra_time || 0) > 0
                    ? 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--accent-secondary)] hover:border-[var(--accent-secondary)]/50'
                    : 'bg-[var(--surface-raised)]/40 border-[var(--border)] text-[var(--text-secondary)]/40 cursor-not-allowed'
                }`}
                title="+30s added to match countdown timer (1 use per battle)"
              >
                <Hourglass className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                <span>Time Surge (+30s)</span>
                <span className="text-[10px] opacity-75">[{powerupUses.extra_time || 0}/1]</span>
              </button>

              {/* Power-Up 2: Neural Peek */}
              <button
                onClick={() => handleUsePowerup('peek_progress')}
                disabled={(powerupUses.peek_progress || 0) <= 0 || matchStatus !== 'active' || hasWon}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border ${
                  (powerupUses.peek_progress || 0) > 0
                    ? 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)]/50'
                    : 'bg-[var(--surface-raised)]/40 border-[var(--border)] text-[var(--text-secondary)]/40 cursor-not-allowed'
                }`}
                title="Reveals opponent's test case pass count for 5s (1 use per battle)"
              >
                <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Neural Peek</span>
                <span className="text-[10px] opacity-75">[{powerupUses.peek_progress || 0}/1]</span>
              </button>

              {/* Power-Up 3: Deep Scan Hint */}
              <button
                onClick={() => handleUsePowerup('hint_reveal')}
                disabled={(powerupUses.hint_reveal || 0) <= 0 || matchStatus !== 'active' || hasWon}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border ${
                  (powerupUses.hint_reveal || 0) > 0
                    ? 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)]/50'
                    : 'bg-[var(--surface-raised)]/40 border-[var(--border)] text-[var(--text-secondary)]/40 cursor-not-allowed'
                }`}
                title="Reveals 1 hidden test case input & expected output (1 use per battle)"
              >
                <Lightbulb className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Deep Scan (Hint)</span>
                <span className="text-[10px] opacity-75">[{powerupUses.hint_reveal || 0}/1]</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Panel */}
          <div className="flex-1 flex flex-col bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)] min-h-[360px]">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface)] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[var(--accent)]" />
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-[var(--surface-raised)] text-[var(--text-primary)] font-mono text-xs rounded-lg px-2.5 py-1 border border-[var(--border)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons: Run & Submit */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRun}
                  disabled={running || submitting}
                  className="btn-ghost px-4 py-1.5 text-xs font-mono flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)]" />
                  <span>{running ? 'Running...' : 'Run Test'}</span>
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || hasWon}
                  className="btn-accent px-5 py-1.5 text-xs font-mono flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Judging...' : hasWon ? 'Victory!' : 'Submit Solution'}</span>
                </button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 relative min-h-[280px]">
              <Editor
                height="100%"
                language={LANGUAGES.find((l) => l.id === language)?.monacoId || 'javascript'}
                value={code}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  padding: { top: 12 },
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Bottom Console / Test Results Panel */}
          <div className="h-56 bg-[var(--surface)] rounded-3xl overflow-hidden border border-[var(--border)] flex flex-col">
            {/* Console Navigation Tabs */}
            <div className="flex items-center border-b border-[var(--border)] px-3 bg-[var(--surface)]">
              <button
                onClick={() => setActiveTab('testcases')}
                className={`px-4 py-2.5 text-xs font-mono font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'testcases'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Test Cases Status</span>
              </button>

              <button
                onClick={() => setActiveTab('run')}
                className={`px-4 py-2.5 text-xs font-mono font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'run'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Run Output & Custom Input</span>
              </button>
            </div>

            {/* Console Body */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {/* Match Result Banner (When Match Concludes) */}
              {pendingMatchResult && navigateCountdown !== null && (
                <div className={`mb-3 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between shadow-md ${
                  pendingMatchResult.result === 'winner' && pendingMatchResult.winner === user.username
                    ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[var(--accent)]'
                    : pendingMatchResult.result === 'draw'
                    ? 'bg-[var(--accent-secondary)]/15 border border-[var(--accent-secondary)]/40 text-[var(--accent-secondary)]'
                    : 'bg-[var(--error)]/15 border border-[var(--error)]/40 text-[var(--error)]'
                }`}>
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    {pendingMatchResult.result === 'winner' && pendingMatchResult.winner === user.username
                      ? 'VICTORY SECURED! Solution Verified.'
                      : pendingMatchResult.result === 'winner'
                      ? `MATCH COMPLETE: ${pendingMatchResult.winner} solved it first.`
                      : 'MATCH DRAW: Time expired.'}
                  </span>
                  <span className="text-xs opacity-80 font-mono">Transitioning in {navigateCountdown}s...</span>
                </div>
              )}

              {/* Revealed Deep Scan Hint Card */}
              {revealedHint && (
                <div className="mb-3 p-3 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)]">
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-[var(--accent)]">
                    <Lightbulb className="w-4 h-4 text-[var(--accent)]" />
                    <span>Deep Scan Decrypted Test Case:</span>
                  </div>
                  <div className="text-[var(--text-secondary)]">Input: <span className="text-[var(--text-primary)] font-bold">{revealedHint.input}</span></div>
                  <div className="text-[var(--text-secondary)]">Expected Output: <span className="text-[var(--accent)] font-bold">{revealedHint.expectedOutput}</span></div>
                </div>
              )}

              {/* TEST CASES TAB */}
              {activeTab === 'testcases' && (
                <div>
                  {!submitResult && (
                    <div className="text-[var(--text-secondary)] py-6 text-center">
                      <p className="mb-1">⚡ Press "Submit Solution" to execute your algorithm against test suites.</p>
                      <p className="text-[11px] opacity-75">The fastest gladiator with all test cases passed wins the duel.</p>
                    </div>
                  )}

                  {submitResult?.status === 'judging' && (
                    <div className="flex items-center gap-3 text-[var(--accent-secondary)] py-4 animate-pulse">
                      <div className="w-4 h-4 border-2 border-[var(--accent-secondary)] border-t-transparent rounded-full animate-spin" />
                      <span>Judge0 sandboxed execution in progress...</span>
                    </div>
                  )}

                  {submitResult?.error && (
                    <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-xl text-[var(--error)] mb-3">
                      ❌ {submitResult.error}
                    </div>
                  )}

                  {submitResult?.results && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">Test Execution Breakdown:</span>
                        <span className={`text-xs font-bold font-mono ${submitResult.passed ? 'text-[var(--accent)]' : 'text-[var(--error)]'}`}>
                          {submitResult.results.filter((r) => r.passed).length} / {submitResult.results.length} PASSED
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {submitResult.results.map((r, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-xl border ${
                              r.passed
                                ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30'
                                : 'bg-[var(--error)]/10 border-[var(--error)]/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 font-bold">
                                {r.passed ? (
                                  <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-[var(--error)]" />
                                )}
                                <span className={r.passed ? 'text-[var(--accent)]' : 'text-[var(--error)]'}>
                                  Test #{i + 1}
                                </span>
                              </span>
                              {r.time && <span className="text-[10px] text-[var(--text-secondary)]">{r.time}s</span>}
                            </div>

                            {!r.passed && (
                              <div className="mt-2 text-[11px] space-y-1 text-[var(--text-secondary)] border-t border-[var(--error)]/20 pt-1.5">
                                {r.error && <p className="text-[var(--error)]">{r.error}</p>}
                                {r.expectedOutput && (
                                  <div>Expected: <span className="text-[var(--accent)]">{r.expectedOutput}</span></div>
                                )}
                                {r.actualOutput !== undefined && (
                                  <div>Got: <span className="text-[var(--error)]">{r.actualOutput || '(empty)'}</span></div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RUN OUTPUT TAB */}
              {activeTab === 'run' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[var(--text-secondary)] text-[11px] mb-1">Custom Input (stdin):</label>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter custom stdin test parameters..."
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl p-2.5 text-[var(--text-primary)] text-xs h-14 resize-none focus:outline-none focus:border-[var(--accent)] font-mono"
                    />
                  </div>

                  {runResult ? (
                    <div className="bg-[var(--surface-raised)] rounded-xl p-3 border border-[var(--border)] space-y-1.5">
                      {runResult.stdout && (
                        <div>
                          <span className="text-[var(--text-secondary)]">Output: </span>
                          <span className="text-[var(--accent)] whitespace-pre-wrap">{runResult.stdout}</span>
                        </div>
                      )}
                      {runResult.stderr && (
                        <div className="text-[var(--error)] whitespace-pre-wrap">{runResult.stderr}</div>
                      )}
                      {runResult.status && (
                        <div className="text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border)]">
                          Status: {runResult.status} {runResult.time && `| ${runResult.time}s`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[var(--text-secondary)] text-xs">Press "Run Test" above to execute code against custom input.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Feature 3: Interviewer Swap Round Modal / Drawer */}
      <AnimatePresence>
        {roleSwapData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--surface-raised)] max-w-2xl w-full rounded-3xl p-6 border border-[var(--border)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-[var(--text-primary)] font-display">
                        Round 2: Interviewer Swap
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 font-bold uppercase">
                        Role Reversal
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {user.username === roleSwapData.interviewer ? (
                        <span className="text-[var(--accent)] font-semibold">
                          You won the coding round! You are now the Lead Interviewer.
                        </span>
                      ) : (
                        <span className="text-[var(--accent-secondary)] font-semibold">
                          Your opponent won and is now interviewing you. Defend your design!
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleFinishRoleSwap}
                  className="px-3.5 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono border border-[var(--border)] transition-colors"
                >
                  Skip to Results →
                </button>
              </div>

              {/* Transcript Thread */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[220px]">
                {roleSwapTranscript.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-secondary)] font-mono text-xs">
                    {user.username === roleSwapData.interviewer
                      ? 'Pick a suggested question below or type a custom engineering question to begin the interview.'
                      : 'Waiting for the interviewer to send their follow-up question...'}
                  </div>
                ) : (
                  roleSwapTranscript.map((entry, idx) => {
                    const isInterviewerMsg = entry.role === 'interviewer';
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border ${
                          isInterviewerMsg
                            ? 'bg-[var(--surface)] border-[var(--border)] mr-8'
                            : 'bg-[var(--surface)] border-[var(--border)] ml-8'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span
                            className={`font-bold ${
                              isInterviewerMsg ? 'text-[var(--accent)]' : 'text-[var(--accent-secondary)]'
                            }`}
                          >
                            {isInterviewerMsg ? '👔 [INTERVIEWER]' : '💻 [CANDIDATE]'} {entry.sender}:
                          </span>
                          <span className="text-[var(--text-secondary)] text-[10px]">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-primary)] leading-relaxed font-mono whitespace-pre-wrap">
                          {entry.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Questions (Interviewer only) */}
              {user.username === roleSwapData.interviewer && roleSwapData.suggestedQuestions && (
                <div className="pt-2 pb-3 border-t border-[var(--border)]">
                  <div className="text-[11px] font-mono text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Suggested Follow-Up Prompts:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {roleSwapData.suggestedQuestions.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSendRoleSwapQuestion(prompt)}
                        className="text-[10px] font-mono px-2.5 py-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors text-left"
                      >
                        "{prompt}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Dock */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center gap-2">
                <input
                  type="text"
                  value={roleSwapInput}
                  onChange={(e) => setRoleSwapInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (user.username === roleSwapData.interviewer) {
                        handleSendRoleSwapQuestion();
                      } else {
                        handleSendRoleSwapAnswer();
                      }
                    }
                  }}
                  placeholder={
                    user.username === roleSwapData.interviewer
                      ? "Ask follow-up question (e.g., How would you optimize space complexity?)..."
                      : "Type your engineering defense / explanation..."
                  }
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] font-mono"
                />

                <button
                  onClick={() => {
                    if (user.username === roleSwapData.interviewer) {
                      handleSendRoleSwapQuestion();
                    } else {
                      handleSendRoleSwapAnswer();
                    }
                  }}
                  className="btn-accent px-4 py-2.5 text-xs font-mono"
                >
                  <SendHorizontal className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>

                {user.username === roleSwapData.interviewer && (
                  <button
                    onClick={handleFinishRoleSwap}
                    className="px-4 py-2.5 rounded-2xl bg-[var(--accent-secondary)] hover:brightness-105 text-[#10141C] font-extrabold text-xs flex items-center gap-1.5 transition-all font-mono"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Conclude & Result</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}