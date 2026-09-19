/**
 * DailyChallengePage — LeetCode-style Streak & Daily Problem Arena
 * Features:
 *  - 24-hour rotating problem weighted towards Easy/Medium
 *  - Live countdown timer ticking down to challenge reset
 *  - Prominent streak counter (current streak + best streak)
 *  - "Streak at Risk" warning state using amber accent when time is running out
 *  - Integrated Monaco Code Editor with multi-language support
 *  - Test execution & submission runner with instant feedback and monthly badges
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Flame,
  Clock,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Tag,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  Zap,
  ArrowRight,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'python', label: 'Python 3', monacoId: 'python' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
  { id: 'java', label: 'Java', monacoId: 'java' },
];

export default function DailyChallengePage() {
  const { user, getToken } = useAuth();

  // Challenge state
  const [challenge, setChallenge] = useState(null);
  const [userStats, setUserStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    lastSolvedDate: null,
    solvedToday: false,
    streakAtRisk: false,
    monthlyBadges: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });

  // Code editor state
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [hintsOpen, setHintsOpen] = useState(false);

  // Execution & Submission state
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [activeTab, setActiveTab] = useState('testcases'); // 'testcases' | 'console' | 'results'
  const [consoleOutput, setConsoleOutput] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [celebrationBadge, setCelebrationBadge] = useState(null);

  // Fetch today's challenge
  const fetchChallenge = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/api/daily/today`, { headers });

      if (res.data?.success && res.data?.challenge) {
        const ch = res.data.challenge;
        setChallenge(ch);
        if (res.data.userStats) {
          setUserStats(res.data.userStats);
        }

        // Set starter code
        const q = ch.question;
        if (q && q.starterCode) {
          if (typeof q.starterCode === 'object') {
            setCode(q.starterCode[language] || q.starterCode.javascript || '');
          } else {
            setCode(q.starterCode);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load daily challenge:', err);
      setError(err.response?.data?.error || 'Unable to load today\'s daily challenge.');
    } finally {
      setLoading(false);
    }
  }, [getToken, language]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  // Live countdown timer ticking every second
  useEffect(() => {
    if (!challenge?.resetsAt) return;

    const calculateTimeLeft = () => {
      const resetTime = new Date(challenge.resetsAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, resetTime - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, totalMs: diff });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [challenge?.resetsAt]);

  // Handle language switch
  const handleLanguageChange = (langId) => {
    setLanguage(langId);
    if (challenge?.question?.starterCode) {
      const sc = challenge.question.starterCode;
      if (typeof sc === 'object') {
        setCode(sc[langId] || sc.javascript || '');
      }
    }
  };

  // Reset to default template
  const handleResetCode = () => {
    if (challenge?.question?.starterCode) {
      const sc = challenge.question.starterCode;
      if (typeof sc === 'object') {
        setCode(sc[language] || sc.javascript || '');
      } else {
        setCode(sc);
      }
    }
  };

  // Run custom test code
  const handleRunCode = async () => {
    if (!code.trim()) return;
    try {
      setRunning(true);
      setActiveTab('console');
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API_URL}/api/daily/run`,
        { code, language, customInput },
        { headers }
      );
      setConsoleOutput(res.data);
    } catch (err) {
      setConsoleOutput({ error: err.response?.data?.error || err.message });
    } finally {
      setRunning(false);
    }
  };

  // Submit Solution
  const handleSubmitSolution = async () => {
    if (!user) {
      alert('Please log in or register to submit daily challenges and track your streak!');
      return;
    }
    if (!code.trim()) return;

    try {
      setSubmitting(true);
      setActiveTab('results');
      const token = getToken();
      const res = await axios.post(
        `${API_URL}/api/daily/submit`,
        { code, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data;
      setSubmissionResult(data);

      if (data.success && data.allPassed) {
        setUserStats((prev) => ({
          ...prev,
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          lastSolvedDate: data.lastSolvedDate,
          solvedToday: true,
          streakAtRisk: false,
        }));

        // Notify Navbar in real-time so the flame icon immediately ignites and glows
        window.dispatchEvent(
          new CustomEvent('daily_challenge_solved', {
            detail: {
              currentStreak: data.currentStreak,
              solvedToday: true,
            },
          })
        );

        if (data.badgeAwarded) {
          setCelebrationBadge(data.badgeAwarded);
        }
      }
    } catch (err) {
      setSubmissionResult({
        success: false,
        allPassed: false,
        message: err.response?.data?.error || 'Evaluation failed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const padTime = (num) => String(num).padStart(2, '0');
  const isStreakAtRisk = !userStats.solvedToday && (userStats.currentStreak > 0) && (timeLeft.hours < 4);
  const q = challenge?.question;

  // Format today's date
  const todayDateFormatted = challenge?.date 
    ? new Date(challenge.date + 'T00:00:00.000Z').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      })
    : '';

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BreadcrumbNav 
          items={[{ label: 'Arena', path: '/lobby' }, { label: 'Daily Challenge' }]} 
        />

        {/* Top Header: Title, Streak Counter, Countdown Timer */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Left: Challenge Title & Date */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--accent)] font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  LeetCode-Style 24H Arena
                </span>
                <span className="text-[var(--text-secondary)] text-xs font-mono">•</span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  {todayDateFormatted}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)] font-display flex items-center gap-2">
                Daily Coding Challenge
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
                One curated interview question refreshed every 24 hours. Solve daily to build streaks and earn monthly achievement badges.
              </p>
            </div>

            {/* Right: Streak & Timer HUD */}
            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end flex-wrap">
              
              {/* Flame Streak HUD */}
              <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  userStats.currentStreak > 0
                    ? 'bg-amber-500/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30'
                    : 'bg-slate-800 text-[var(--text-secondary)] border border-[var(--border)]'
                }`}>
                  <Flame className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)]">
                    Current Streak
                  </div>
                  <div className="text-base font-black font-mono flex items-center gap-1.5 text-[var(--text-primary)]">
                    <span>{userStats.currentStreak} Day{userStats.currentStreak === 1 ? '' : 's'}</span>
                    <span className="text-[11px] font-normal text-[var(--text-secondary)] font-mono">
                      (Best: {userStats.longestStreak})
                    </span>
                  </div>
                </div>
              </div>

              {/* 24H Reset Countdown Timer */}
              <div className="bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isStreakAtRisk
                    ? 'bg-amber-500/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30 animate-pulse'
                    : 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-secondary)]">
                    Resets In
                  </div>
                  <div className={`text-base font-mono font-black ${
                    isStreakAtRisk ? 'text-[var(--accent-secondary)]' : 'text-[var(--accent)]'
                  }`}>
                    {padTime(timeLeft.hours)}:{padTime(timeLeft.minutes)}:{padTime(timeLeft.seconds)}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Conditional Alert Banners */}
          {/* 1. Solved Today Banner */}
          {userStats.solvedToday && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/40 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 text-[var(--accent)] font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Today's challenge solved! Your streak is safely protected for today.</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                Next problem arrives in {timeLeft.hours}h {timeLeft.minutes}m
              </span>
            </motion.div>
          )}

          {/* 2. Streak At Risk Warning Banner (Uses existing amber accent token) */}
          {isStreakAtRisk && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/50 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 text-[var(--accent-secondary)] font-medium">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-bounce" />
                <span>
                  <strong>Streak at Risk!</strong> You haven't solved today's problem yet and reset is in less than {timeLeft.hours}h {timeLeft.minutes}m. Complete it before the timer expires to keep your {userStats.currentStreak}-day streak alive!
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono text-[var(--text-secondary)]">Loading today's 24H challenge...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-[var(--surface)] border border-[var(--error)]/40 rounded-2xl p-8 text-center">
            <XCircle className="w-8 h-8 text-[var(--error)] mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Challenge Unavailable</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{error}</p>
            <button
              onClick={fetchChallenge}
              className="btn btn-accent mt-4 px-4 py-1.5 text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Challenge Workstation */}
        {!loading && !error && q && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
            
            {/* Left Column: Problem Description & Test Cases (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
              
              {/* Problem Meta Header */}
              <div className="p-5 border-b border-[var(--border)] bg-[var(--surface-raised)]">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider ${
                    q.difficulty === 'hard'
                      ? 'bg-rose-500/15 text-[var(--error)] border border-rose-500/30'
                      : q.difficulty === 'medium'
                      ? 'bg-amber-500/15 text-[var(--accent-secondary)] border border-amber-500/30'
                      : 'bg-emerald-500/15 text-[var(--accent)] border border-emerald-500/30'
                  }`}>
                    {q.difficulty}
                  </span>

                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[var(--accent)]" />
                    {q.topic}
                  </span>

                  {challenge.totalSolves > 0 && (
                    <span className="text-[11px] font-mono text-[var(--text-secondary)] ml-auto">
                      {challenge.totalSolves} Solved Today
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {q.title}
                </h2>

                {/* Company Tags */}
                {q.companies?.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Building2 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    {q.companies.slice(0, 4).map((c, i) => (
                      <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Problem Body (Scrollable) */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 max-h-[620px] text-xs leading-relaxed">
                <div>
                  <h4 className="text-[11px] font-mono uppercase text-[var(--text-secondary)] mb-2">
                    Description
                  </h4>
                  <div className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                    {q.description}
                  </div>
                </div>

                {/* Example Test Cases */}
                {q.examples?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-mono uppercase text-[var(--text-secondary)]">
                      Examples
                    </h4>
                    {q.examples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="bg-[var(--surface-raised)] rounded-xl p-3 border border-[var(--border)] font-mono space-y-1 text-xs"
                      >
                        <div>
                          <span className="text-[var(--text-secondary)]">Input: </span>
                          <span className="text-[var(--accent)]">{ex.input}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)]">Output: </span>
                          <span className="text-[var(--text-primary)]">{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div className="text-[11px] text-[var(--text-secondary)] italic pt-1 border-t border-[var(--border)]/50 mt-1">
                            Explanation: {ex.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {q.constraints?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-mono uppercase text-[var(--text-secondary)] mb-1.5">
                      Constraints
                    </h4>
                    <ul className="list-disc list-inside font-mono text-[11px] text-[var(--text-secondary)] space-y-1">
                      {q.constraints.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hints Accordion */}
                {q.hints?.length > 0 && (
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setHintsOpen(!hintsOpen)}
                      className="w-full p-3 bg-[var(--surface-raised)] flex items-center justify-between text-xs font-medium text-[var(--accent-secondary)]"
                    >
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Need a Hint? ({q.hints.length} available)
                      </span>
                      {hintsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {hintsOpen && (
                      <div className="p-3 bg-[var(--surface)] text-[11px] text-[var(--text-secondary)] space-y-2 font-mono">
                        {q.hints.map((h, i) => (
                          <div key={i} className="p-2 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
                            <span className="text-[var(--accent)] font-semibold">Hint {i + 1}: </span>
                            {h}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Code Editor & Runner Tabs (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
              
              {/* Editor Header Toolbar */}
              <div className="bg-[var(--surface-raised)] px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
                
                {/* Language Selector */}
                <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleLanguageChange(l.id)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        language === l.id
                          ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                {/* Reset & Run Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetCode}
                    title="Reset to starter boilerplate"
                    className="btn btn-ghost px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleRunCode}
                    disabled={running || submitting}
                    className="btn btn-ghost px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                    <span>{running ? 'Running...' : 'Run Test'}</span>
                  </button>

                  <button
                    onClick={handleSubmitSolution}
                    disabled={submitting || running}
                    className="btn btn-accent px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Evaluating...' : userStats.solvedToday ? 'Resubmit' : 'Submit Solution'}</span>
                  </button>
                </div>
              </div>

              {/* Monaco Code Editor */}
              <div className="flex-1 min-h-[380px] bg-[#10141C]">
                <Editor
                  height="100%"
                  language={LANGUAGES.find((l) => l.id === language)?.monacoId || 'javascript'}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontLigatures: true,
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    automaticLayout: true,
                    padding: { top: 12 },
                  }}
                />
              </div>

              {/* Bottom Test & Console Drawer */}
              <div className="h-52 border-t border-[var(--border)] bg-[var(--surface-raised)] flex flex-col">
                
                {/* Tab switcher */}
                <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('testcases')}
                      className={`pb-0.5 transition-colors ${
                        activeTab === 'testcases'
                          ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Sample Input
                    </button>
                    <button
                      onClick={() => setActiveTab('console')}
                      className={`pb-0.5 transition-colors ${
                        activeTab === 'console'
                          ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Console Output
                    </button>
                    <button
                      onClick={() => setActiveTab('results')}
                      className={`pb-0.5 transition-colors flex items-center gap-1.5 ${
                        activeTab === 'results'
                          ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>Verification Results</span>
                      {submissionResult && (
                        <span className={`w-2 h-2 rounded-full ${submissionResult.allPassed ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Tab content */}
                <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
                  {/* Sample Input Tab */}
                  {activeTab === 'testcases' && (
                    <div className="space-y-2">
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Enter custom stdin input to test with "Run Test":
                      </div>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder={q.examples?.[0]?.input || 'e.g. 2'}
                        rows={3}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono focus:border-[var(--accent)] focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Console Output Tab */}
                  {activeTab === 'console' && (
                    <div>
                      {running ? (
                        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <div className="w-3 h-3 border border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                          <span>Executing code...</span>
                        </div>
                      ) : consoleOutput ? (
                        <div className="space-y-1">
                          {consoleOutput.output && (
                            <div>
                              <div className="text-[10px] text-[var(--text-secondary)] uppercase">Output:</div>
                              <pre className="text-[var(--text-primary)] whitespace-pre-wrap bg-[var(--surface)] p-2 rounded border border-[var(--border)]">
                                {consoleOutput.output}
                              </pre>
                            </div>
                          )}
                          {consoleOutput.error && (
                            <div>
                              <div className="text-[10px] text-[var(--error)] uppercase">Error:</div>
                              <pre className="text-[var(--error)] whitespace-pre-wrap bg-rose-500/10 p-2 rounded border border-rose-500/30">
                                {consoleOutput.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[var(--text-secondary)] italic">
                          Click "Run Test" to view stdout or compile output.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verification Results Tab */}
                  {activeTab === 'results' && (
                    <div>
                      {submitting ? (
                        <div className="flex items-center gap-2 text-[var(--text-secondary)] py-4 justify-center">
                          <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                          <span>Evaluating against hidden test suite...</span>
                        </div>
                      ) : submissionResult ? (
                        <div className="space-y-3">
                          <div className={`p-3 rounded-xl border flex items-center justify-between ${
                            submissionResult.allPassed
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                          }`}>
                            <div className="flex items-center gap-2">
                              {submissionResult.allPassed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-rose-400" />
                              )}
                              <div>
                                <div className="font-bold text-sm">
                                  {submissionResult.allPassed ? 'Accepted!' : 'Test Cases Failed'}
                                </div>
                                <div className="text-[11px] opacity-90">
                                  {submissionResult.message || (submissionResult.allPassed ? 'All test cases passed cleanly!' : 'Inspect output below.')}
                                </div>
                              </div>
                            </div>

                            {submissionResult.allPassed && (
                              <div className="text-right font-mono">
                                <div className="text-xs font-bold text-[var(--accent)]">
                                  🔥 {submissionResult.currentStreak} Day Streak
                                </div>
                                <div className="text-[10px] text-[var(--text-secondary)]">
                                  +{submissionResult.xpGained || 50} XP Earned
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Test case breakdown */}
                          {submissionResult.results?.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {submissionResult.results.map((r, i) => (
                                <div
                                  key={i}
                                  className={`p-2.5 rounded-lg border text-xs ${
                                    r.passed
                                      ? 'bg-[var(--surface)] border-emerald-500/30 text-[var(--text-primary)]'
                                      : 'bg-rose-500/5 border-rose-500/30 text-rose-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-[11px]">Test Case {i + 1}</span>
                                    <span className={`text-[10px] font-bold ${r.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {r.passed ? 'PASSED' : 'FAILED'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[var(--text-secondary)]">Input: {r.input}</div>
                                  <div className="text-[10px]">Expected: {r.expectedOutput}</div>
                                  {r.actualOutput && <div className="text-[10px] text-[var(--accent)]">Actual: {r.actualOutput.trim()}</div>}
                                  {r.error && <div className="text-[10px] text-rose-400">Error: {r.error}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[var(--text-secondary)] italic">
                          Click "Submit Solution" to run all verified test cases and update your daily streak.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Celebration Modal for Monthly Badge */}
        <AnimatePresence>
          {celebrationBadge && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[var(--surface)] border border-[var(--accent)] rounded-2xl p-6 max-w-sm w-full text-center shadow-[0_8px_30px_rgba(79,163,147,0.25)] relative"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/40 flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 fill-current" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] font-display">
                  Monthly Badge Unlocked!
                </h3>
                <p className="text-xs text-[var(--accent-secondary)] font-mono font-semibold mt-1">
                  {celebrationBadge.month} {celebrationBadge.year} Perfect Streak
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Incredible dedication! You solved every daily challenge this month without missing a single day.
                </p>
                <div className="mt-6 flex gap-2 justify-center">
                  <button
                    onClick={() => setCelebrationBadge(null)}
                    className="btn btn-accent px-5 py-2 text-xs font-semibold"
                  >
                    Claim Badge
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
