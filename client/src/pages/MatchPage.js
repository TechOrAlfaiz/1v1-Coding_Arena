/**
 * MatchPage — The main 1v1 coding arena.
 * Handles: waiting room, live match, editor, submission, timer sync.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
  { id: 'java', label: 'Java', monacoId: 'java' },
];

export default function MatchPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Match state
  const [matchStatus, setMatchStatus] = useState('waiting'); // waiting | active | completed
  const [question, setQuestion] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playerCount, setPlayerCount] = useState(1);

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
  const [activeTab, setActiveTab] = useState('testcases'); // testcases | output | run

  // Opponent status
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [opponentSubmitting, setOpponentSubmitting] = useState(false);
  const [opponentWrongAnswer, setOpponentWrongAnswer] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  // Prevent double submission
  const [hasWon, setHasWon] = useState(false);

  const typingTimeoutRef = useRef(null);

  // ─── Join room via socket ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_room', { roomId });
  }, [socket, roomId]);

  // ─── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Room status update (player count etc.)
    socket.on('room_update', ({ playerCount: pc, players: p, status }) => {
      setPlayerCount(pc);
      setPlayers(p || []);
    });

    // Match starts! Both players are here.
    socket.on('start_match', ({ question: q, players: p, duration }) => {
      setQuestion(q);
      setPlayers(p || []);
      setMatchStatus('active');
      setTimeLeft(duration || 900);
      starterCodeRef.current = q.starterCode || {};
      setCode(q.starterCode?.javascript || '// Write your solution here\n');
    });

    // Timer tick from server (keeps everyone in sync)
    socket.on('timer_sync', ({ timeLeft: t }) => {
      setTimeLeft(t);
    });

    // Opponent is submitting
    socket.on('player_submitting', ({ username }) => {
      if (username !== user.username) {
        setOpponentSubmitting(true);
        setTimeout(() => setOpponentSubmitting(false), 3000);
      }
    });

    // Opponent typed wrong answer
    socket.on('opponent_wrong_answer', ({ username }) => {
      setOpponentWrongAnswer(true);
      setTimeout(() => setOpponentWrongAnswer(false), 3000);
    });

    // Opponent is typing
    socket.on('opponent_typing', ({ username, isTyping }) => {
      if (username !== user.username) setOpponentTyping(isTyping);
    });

    // Opponent disconnected
    socket.on('opponent_disconnected', ({ username }) => {
      setOpponentDisconnected(true);
    });

    // Submission result (for this player's own submission)
    socket.on('submission_result', (data) => {
      setSubmitting(false);
      if (data.status === 'judging') return; // Still running
      setSubmitResult(data);
      setActiveTab('testcases');
      if (data.passed) setHasWon(true);
    });

    // Run result
    socket.on('run_result', (data) => {
      setRunning(false);
      setRunResult(data);
      setActiveTab('run');
    });

    // Match over (someone won, draw, or timeout)
    socket.on('match_result', (data) => {
      setMatchStatus('completed');
      // Navigate to result page with result data
      navigate(`/result/${roomId}`, { state: data });
    });

    return () => {
      socket.off('room_update');
      socket.off('start_match');
      socket.off('timer_sync');
      socket.off('player_submitting');
      socket.off('opponent_wrong_answer');
      socket.off('opponent_typing');
      socket.off('opponent_disconnected');
      socket.off('submission_result');
      socket.off('run_result');
      socket.off('match_result');
    };
  }, [socket, user, navigate, roomId]);

  // ─── Language change ──────────────────────────────────────────────────────
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const starter = starterCodeRef.current[newLang] || `// Write your ${newLang} solution here\n`;
    setCode(starter);
    setSubmitResult(null);
    setRunResult(null);
  };

  // ─── Editor change (with typing indicator) ────────────────────────────────
  const handleEditorChange = (value) => {
    setCode(value || '');

    // Emit typing indicator
    if (socket && matchStatus === 'active') {
      socket.emit('typing_indicator', { roomId, isTyping: true });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_indicator', { roomId, isTyping: false });
      }, 2000);
    }
  };

  // ─── Submit code ──────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!socket || submitting || hasWon) return;
    setSubmitting(true);
    setSubmitResult(null);
    socket.emit('code_submit', { roomId, code, language });
  };

  // ─── Run code (against custom input) ─────────────────────────────────────
  const handleRun = () => {
    if (!socket || running) return;
    setRunning(true);
    setRunResult(null);
    socket.emit('run_code', { roomId, code, language, customInput });
  };

  // ─── Timer formatting ─────────────────────────────────────────────────────
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timerClass = timeLeft > 120 ? 'timer-normal' : timeLeft > 30 ? 'timer-warning' : 'timer-danger';

  // ─── Difficulty badge ─────────────────────────────────────────────────────
  const diffBadge = (d) => {
    const map = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' };
    return <span className={map[d] || 'badge-easy'}>{d}</span>;
  };

  // ─── WAITING SCREEN ───────────────────────────────────────────────────────
  if (matchStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-arena-bg bg-grid">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Waiting for opponent...</h2>
            <p className="text-gray-400 mb-6">Share this Room ID with your friend:</p>
            <div className="inline-flex items-center gap-3 bg-gray-900 border border-cyan-500/30 rounded-xl px-6 py-4 glow-accent mb-6">
              <span className="text-3xl font-mono font-bold text-cyan-400 tracking-widest">{roomId}</span>
              <button
                onClick={() => navigator.clipboard.writeText(roomId)}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >📋</button>
            </div>
            <p className="text-gray-500 text-sm">
              {playerCount}/2 players connected
            </p>
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${i < playerCount ? 'bg-cyan-400' : 'bg-gray-700'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE MATCH ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-arena-bg flex flex-col">
      {/* Match header bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-white">Room: <span className="text-cyan-400 font-mono">{roomId}</span></span>
          <div className="flex gap-2">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs bg-gray-800 px-2 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className={p.username === user.username ? 'text-cyan-400' : 'text-gray-400'}>
                  {p.username}{p.username === user.username ? ' (you)' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className={`text-2xl font-mono font-bold ${timerClass}`}>
          {formatTime(timeLeft)}
        </div>

        {/* Opponent status pills */}
        <div className="flex items-center gap-2 text-xs">
          {opponentTyping && (
            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
              ⌨️ Typing...
            </span>
          )}
          {opponentSubmitting && (
            <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/30 animate-pulse">
              ⚡ Opponent submitting...
            </span>
          )}
          {opponentWrongAnswer && (
            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30">
              ❌ Opponent got WA
            </span>
          )}
          {opponentDisconnected && (
            <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/30">
              ⚠️ Opponent disconnected
            </span>
          )}
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Problem statement */}
        <div className="w-5/12 border-r border-gray-800 overflow-y-auto p-5 bg-gray-900/50">
          {question && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xl font-bold text-white">{question.title}</h2>
                {diffBadge(question.difficulty)}
              </div>
              <div className="flex flex-wrap gap-1 mb-4">
                {question.tags?.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Description */}
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {question.description}
                </div>
              </div>

              {/* Examples */}
              {question.examples?.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-bold text-gray-300 mb-3">Examples</h3>
                  {question.examples.map((ex, i) => (
                    <div key={i} className="mb-3 bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <p className="text-xs text-gray-400 mb-1">Example {i + 1}:</p>
                      <div className="font-mono text-xs">
                        <div><span className="text-gray-500">Input: </span><span className="text-green-400">{ex.input}</span></div>
                        <div><span className="text-gray-500">Output: </span><span className="text-cyan-400">{ex.output}</span></div>
                        {ex.explanation && (
                          <div className="mt-1 text-gray-400 font-sans">{ex.explanation}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Editor + output */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between bg-gray-900 border-b border-gray-800 px-3 py-2">
            <div className="flex gap-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    language === lang.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRun}
                disabled={running}
                className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {running ? '⏳ Running...' : '▶ Run'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || hasWon}
                className="btn-success text-xs px-4 py-1.5 disabled:opacity-50"
              >
                {hasWon ? '✅ Submitted' : submitting ? '⏳ Judging...' : '⚡ Submit'}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={LANGUAGES.find((l) => l.id === language)?.monacoId || 'javascript'}
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontLigatures: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 10 },
              }}
            />
          </div>

          {/* Output panel */}
          <div className="h-48 border-t border-gray-800 bg-gray-900 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              {['testcases', 'run'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab === 'testcases' ? '🧪 Test Cases' : '▶ Run Output'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
              {/* Test Cases Results */}
              {activeTab === 'testcases' && (
                <div>
                  {!submitResult && (
                    <p className="text-gray-500">Click "Submit" to run against all test cases.</p>
                  )}
                  {submitResult?.status === 'judging' && (
                    <p className="text-yellow-400 animate-pulse">⏳ Judging your code...</p>
                  )}
                  {submitResult?.error && (
                    <p className="text-red-400">❌ {submitResult.error}</p>
                  )}
                  {submitResult?.results && (
                    <div className="space-y-2">
                      {submitResult.results.map((r, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded border ${
                            r.passed
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-red-500/10 border-red-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{r.passed ? '✅' : '❌'}</span>
                            <span className="text-gray-300">Test {i + 1}</span>
                            {r.time && <span className="text-gray-500 ml-auto">{r.time}s</span>}
                          </div>
                          {!r.passed && (
                            <div className="mt-1 pl-6 text-xs text-gray-400 space-y-0.5">
                              {r.error && <div className="text-red-400">{r.error}</div>}
                              {r.actualOutput && (
                                <div>Got: <span className="text-red-300">{r.actualOutput}</span></div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      <div className={`font-bold text-sm ${submitResult.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {submitResult.passed
                          ? '🏆 All tests passed!'
                          : `${submitResult.results.filter(r => r.passed).length}/${submitResult.results.length} tests passed`
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Run Output */}
              {activeTab === 'run' && (
                <div>
                  <div className="mb-2">
                    <p className="text-gray-500 mb-1">Custom Input:</p>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter input here..."
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-gray-300 text-xs h-12 resize-none focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  {runResult ? (
                    <div>
                      {runResult.stdout && (
                        <div>
                          <span className="text-gray-500">Output: </span>
                          <span className="text-green-400 whitespace-pre-wrap">{runResult.stdout}</span>
                        </div>
                      )}
                      {runResult.stderr && (
                        <div className="text-red-400 whitespace-pre-wrap">{runResult.stderr}</div>
                      )}
                      {runResult.status && (
                        <div className="text-gray-500 mt-1">Status: {runResult.status} {runResult.time && `| ${runResult.time}s`}</div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">Click "Run" to execute with custom input.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
