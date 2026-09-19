import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Swords, 
  Zap, 
  Trophy, 
  Terminal, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  Code2,
  Cpu,
  CheckCircle2,
  Clock,
  Radio,
  Eye,
  BookOpen,
  HelpCircle,
  Bot,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

// Animated Counter component
function AnimatedCounter({ end, duration = 2, suffix = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

// 1v1 Arena Live Activity Ticker Items
const RECENT_ARENA_EVENTS = [
  { player: 'ApexCoder', action: 'defeated', target: 'TestGladiator1', problem: 'Two Sum Optimal', reward: '+28 Elo', tier: 'Gold' },
  { player: 'CyberKnight', action: 'ascended to', target: 'Diamond Tier', problem: '1640 Elo', reward: 'Rank Up', tier: 'Diamond' },
  { player: 'NeonBlade', action: 'completed', target: 'Valid Parentheses', problem: '10-Win Streak', reward: 'Streak', tier: 'Honors' },
  { player: 'MatrixHacker', action: 'tested', target: 'System Architecture', problem: 'Room #8941', reward: 'Canvas', tier: 'System Design' },
  { player: 'ShadowDev', action: 'solved', target: 'Valid Parentheses', problem: 'Time: 1m 18s', reward: '100% Pass', tier: 'Solved' },
  { player: 'CodeValkyrie', action: 'won duel', target: 'Merge Intervals', problem: 'First submission', reward: '+30 Elo', tier: 'Coding' },
  { player: 'ByteMaster', action: 'completed', target: 'Reverse Linked List', problem: '4/4 Tests Passed', reward: '+32 Elo', tier: 'Coding' },
  { player: 'Arena Spectators', action: 'spectating', target: 'Ranked Final', problem: 'Room #DUEL-77', reward: '12 Watching', tier: 'Spectate' },
];

// Interactive Arena Duel Cockpit with Live Typewriter & Real-Time Telemetry
function ArenaDuelCockpitMockup() {
  const duelCode = [
    '// Algorithmic optimal hash lookup',
    'function twoSum(nums, target) {',
    '  const map = new Map();',
    '  for (let i = 0; i < nums.length; i++) {',
    '    const diff = target - nums[i];',
    '    if (map.has(diff)) return [map.get(diff), i];',
    '    map.set(nums[i], i);',
    '  }',
    '  return [];',
    '}'
  ];

  const fullCodeText = duelCode.join('\n');
  const [typedChars, setTypedChars] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(872); // 14:32

  // Active Code Typewriter Effect
  useEffect(() => {
    let timeout;
    if (typedChars < fullCodeText.length) {
      const delay = fullCodeText[typedChars] === '\n' ? 180 : Math.floor(Math.random() * 30) + 25;
      timeout = setTimeout(() => {
        setTypedChars((c) => c + 1);
      }, delay);
    } else {
      timeout = setTimeout(() => {
        setTypedChars(0);
      }, 6000);
    }
    return () => clearTimeout(timeout);
  }, [typedChars, fullCodeText]);

  // Live Duel Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 872));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const currentTypedText = fullCodeText.slice(0, typedChars);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col justify-between min-h-[480px]">
      {/* Top Cockpit Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4 text-xs font-mono">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="text-[var(--accent)] font-medium">Room #DUEL-777</span>
          <span>•</span>
          <span>Ranked Duel</span>
          <span>•</span>
          <span className="text-[var(--accent-secondary)]">Gold Tier</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] text-[11px]">
          <Eye className="w-3 h-3 text-[var(--accent)]" />
          <span>3 spectating</span>
        </div>
      </div>

      {/* Problem Header & Live Duel Clock */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="badge-medium">Medium</span>
          <span className="text-[var(--text-primary)] font-medium">Two Sum Optimal Hash</span>
          <span className="text-[var(--text-secondary)] font-mono text-[11px]">(4 test cases)</span>
        </div>
        <div className="text-xs font-mono text-[var(--text-primary)] flex items-center gap-1.5 bg-[var(--surface-raised)] px-2.5 py-1 rounded border border-[var(--border)]">
          <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>{formatTimer(timerSeconds)}</span>
        </div>
      </div>

      {/* Live Typing Code Cockpit */}
      <div className="bg-[var(--bg-base)] rounded-lg p-3.5 border border-[var(--border)] font-mono text-xs text-[var(--text-primary)] min-h-[160px] mb-4 overflow-hidden relative">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pb-2 mb-2 border-b border-[var(--border)] font-mono">
          <span className="text-[var(--text-secondary)]">solution.js (Gladiator 1)</span>
          <span className="text-[var(--accent)] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Syntax valid
          </span>
        </div>
        <pre className="leading-relaxed font-mono whitespace-pre-wrap text-[var(--text-primary)]">
          <code>
            {currentTypedText}
            <span className="inline-block w-1.5 h-3.5 bg-[var(--accent)] ml-0.5 translate-y-0.5 animate-pulse" />
          </code>
        </pre>
      </div>

      {/* Live Combat Telemetry Feed */}
      <div className="space-y-2.5 mb-4 text-xs font-sans">
        {/* Judge0 Arbiter notification */}
        <div className="flex items-start gap-2.5 p-2 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
          <div className="w-5 h-5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] font-mono font-medium text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
            J0
          </div>
          <div>
            <div className="text-[11px] font-mono text-[var(--text-secondary)] mb-0.5">
              Judge0 Compiler Output
            </div>
            <p className="text-[var(--text-primary)]">
              Sample tests executed: <span className="font-mono text-[var(--accent)] font-medium">4/4 passed</span> in 38ms (14.2MB memory).
            </p>
          </div>
        </div>

        {/* Rival status */}
        <div className="flex items-start gap-2.5 p-2 rounded bg-[var(--surface-raised)] border border-[var(--border)]">
          <div className="w-5 h-5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--accent-secondary)] font-mono font-medium text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
            OP
          </div>
          <div>
            <div className="text-[11px] font-mono text-[var(--text-secondary)] mb-0.5">
              Opponent Activity
            </div>
            <p className="text-[var(--text-primary)]">
              Opponent submitted test run: <span className="font-mono text-[var(--accent-secondary)]">3/4 passed</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Telemetry Footer */}
      <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5 text-[11px]">
          <Radio className="w-3 h-3 text-[var(--accent)]" />
          <span>Keystroke telemetry synchronized</span>
        </div>
        <span className="text-[11px] text-[var(--accent)]">Connected</span>
      </div>
    </div>
  );
}

// 2 Genuine 1v1 Arena Duel Formats (Player vs Player)
const ARENA_DUEL_MODES = [
  {
    id: 'coding',
    title: 'Coding & Algorithms',
    badge: 'Code Duel',
    icon: Code2,
    description: 'Dual code editor with Judge0 sandboxed execution, real-time tests, and tactical power-ups.',
    features: ['Dual Monaco Editor', 'Judge0 Sandboxed Compiler', 'Live Test Telemetry'],
    buttonText: 'Enter Coding Arena',
    isPrimary: true,
  },
  {
    id: 'system_design',
    title: 'System Design Canvas',
    badge: 'Architecture',
    icon: Cpu,
    description: 'Shared interactive whiteboard powered by React Flow. Place components, define edges, and explain distributed architectures.',
    features: ['React Flow Shared Canvas', '6 Component Node Types', 'Live Connected Edges'],
    buttonText: 'Enter System Design',
    isPrimary: false,
  },
];

// Solo AI Interview Prep
const SOLO_PREP_CARD = {
  id: 'behavioral',
  title: 'Behavioral & Leadership Studio',
  badge: 'Solo Candidate Prep',
  icon: Users,
  description: 'Practice realistic behavioral and leadership interviews with an AI interviewer. Respond to real-world scenarios using the STAR framework and receive actionable rubric feedback on leadership principles.',
  features: ['AI Interviewer Follow-Ups', 'STAR Framework Text & Audio Responses', 'Communication & Leadership Rubric'],
  buttonText: 'Launch Solo Interview',
  route: '/interviews/new?type=behavioral',
};

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSelectMode = (modeId) => {
    sessionStorage.setItem('arena_interview_mode', modeId);
    if (!user) {
      navigate('/login', { state: { redirectTo: `/lobby?mode=${modeId}`, interviewMode: modeId } });
    } else {
      navigate(`/lobby?mode=${modeId}`, { state: { interviewMode: modeId } });
    }
  };

  const handleSelectSolo = (route) => {
    if (!user) {
      navigate('/login', { state: { redirectTo: route } });
    } else {
      navigate(route);
    }
  };

  const scrollToModeSelect = () => {
    document.getElementById('mode-select')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen text-[var(--text-primary)]">
      {/* Standard Shared Navbar */}
      <Navbar />

      {/* RECENT ACTIVITY MARQUEE */}
      <div className="w-full bg-[var(--surface)] border-b border-[var(--border)] py-2 overflow-hidden relative">
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-4 bg-[var(--surface)] z-20 flex-shrink-0 border-r border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>Activity Feed</span>
          </div>

          <div className="overflow-hidden whitespace-nowrap flex-1">
            <div className="animate-marquee-infinite flex items-center gap-3 pl-3">
              {[...RECENT_ARENA_EVENTS, ...RECENT_ARENA_EVENTS].map((ev, idx) => (
                <div 
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)]"
                >
                  <span className="text-[var(--text-primary)] font-medium">{ev.player}</span>
                  <span>{ev.action}</span>
                  <span className="text-[var(--text-primary)]">{ev.target}</span>
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <span className="font-mono text-[11px] text-[var(--accent)]">{ev.reward}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Calm Developer Tool Intro */}
          <div className="lg:col-span-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono mb-5">
              <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Real-time technical interview platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] mb-5 leading-tight">
              Real-time competitive coding and technical mock interviews.
            </h1>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mb-6 leading-relaxed">
              Pair with peers in live 1v1 algorithmic duels, practice distributed system design on a shared interactive canvas, and sharpen behavioral communication with structured follow-ups.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
              <button
                type="button"
                onClick={scrollToModeSelect}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0E121A] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>1v1 Arena</span>
              </button>

              <Link
                to="/questions"
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Interview Prep</span>
              </Link>

              <Link
                to="/leaderboard"
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trophy className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                <span>Leaderboard</span>
              </Link>
            </div>

            {/* Technical Capabilities */}
            <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-secondary)] border-t border-[var(--border)] pt-5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Judge0 Sandboxed Compiler</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Per-mode Elo Ratings</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Live Socket Telemetry</span>
              </div>
            </div>
          </div>

          {/* Right Column: Code Cockpit */}
          <div className="lg:col-span-6 w-full max-w-xl mx-auto">
            <ArenaDuelCockpitMockup />
          </div>
        </div>

        {/* Stats Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl mx-auto mt-14">
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-left">
            <div className="text-2xl font-semibold font-mono text-[var(--text-primary)] mb-0.5">
              <AnimatedCounter end={14820} suffix="+" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-normal">Ranked duels completed</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-left">
            <div className="text-2xl font-semibold font-mono text-[var(--text-primary)] mb-0.5">
              <AnimatedCounter end={3420} suffix="+" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-normal">Active developers</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-left">
            <div className="text-2xl font-semibold font-mono text-[var(--text-primary)] mb-0.5">
              <AnimatedCounter end={42} suffix="ms" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-normal">Average compiler execution</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-left">
            <div className="text-2xl font-semibold font-mono text-[var(--text-primary)] mb-0.5">
              3
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-normal">Competitive arena formats</p>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: PICK YOUR INTERVIEW TYPE (MODE SELECT) ─────────── */}
      <section id="mode-select" className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[var(--border)] scroll-mt-14">
        <div className="max-w-2xl mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--accent)] text-xs font-mono mb-2">
            <span>Platform Sections</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Choose your preparation track
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Jump into real-time competitive duels against other developers, or sharpen your fundamentals in the interview preparation hub.
          </p>
        </div>

        {/* Two Main Doors: Arena vs Prep */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {/* Track 1: 1v1 Arena */}
          <div className="rounded-xl p-6 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-active)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] group-hover:border-[var(--accent)] transition-colors">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      1v1 Competitive Arena
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--accent)]">
                      Real-Time Combat
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                  Multiplayer
                </span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">
                Multiplayer algorithmic duels, interactive system design canvas battles, and behavioral rounds with Judge0 sandboxed compilation and spectator betting.
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                  <span>Ranked Matchmaking & Elo Leaderboard</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                  <span>Dual Monaco Editor + Judge0 Sandboxed Execution</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                  <span>Live Telemetry, Keystrokes & Spectator Voting</span>
                </div>
              </div>
            </div>

            <Link
              to="/lobby"
              className="w-full py-2.5 px-3.5 rounded-lg text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0E121A] flex items-center justify-center gap-2 transition-colors"
            >
              <span>Enter 1v1 Arena Lobby</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Track 2: Interview Prep */}
          <div className="rounded-xl p-6 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-active)] transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] group-hover:border-[var(--accent)] transition-colors">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      Interview Prep Suite
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--accent-secondary)]">
                      3,480+ Questions
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                  Study Track
                </span>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">
                Organized LeetCode-style question bank company-wise and topic-wise, speech-enabled AI mock interviews with 8-rubric scoring, and daily challenge streaks.
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                  <span>3,480+ Questions with Company & Topic Tags</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                  <span>AI Mock Interview Studio with Voice & Rubrics</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                  <span>FAANG Company Tracks & Daily Challenges</span>
                </div>
              </div>
            </div>

            <Link
              to="/questions"
              className="w-full py-2.5 px-3.5 rounded-lg text-xs font-semibold bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)] flex items-center justify-center gap-2 transition-colors hover:border-[var(--border-active)]"
            >
              <span>Explore Interview Prep Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 1. Arena Duel Section (Genuinely 1v1 Player vs Player) */}
        <div className="max-w-2xl mb-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
            Or launch directly into an Arena duel format:
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Instant matchmaking or private customized room configuration for two players.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {ARENA_DUEL_MODES.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="rounded-xl p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-active)] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                      {m.badge}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                    {m.title}
                  </h3>
                  <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-4">
                    {m.description}
                  </p>

                  <div className="space-y-1.5 mb-6">
                    {m.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectMode(m.id)}
                  className={`w-full py-2.5 px-3.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    m.isPrimary
                      ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0E121A]'
                      : 'bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)]'
                  }`}
                >
                  <span>{m.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* 2. Solo Interview Prep Section (Solo Candidate vs AI) */}
        <div className="pt-8 border-t border-[var(--border)]">
          <div className="max-w-2xl mb-6">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
              Or practice solo interview prep:
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Solo candidate-vs-AI interviewer format. Practice responses at your own pace with real-time feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Behavioral & Leadership Studio (STAR Format) */}
            {(() => {
              const SoloIcon = SOLO_PREP_CARD.icon;
              return (
                <div className="rounded-xl p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-active)] transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                        {SOLO_PREP_CARD.badge}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                        <SoloIcon className="w-4 h-4" />
                      </div>
                    </div>

                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                  {SOLO_PREP_CARD.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-4">
                  {SOLO_PREP_CARD.description}
                </p>

                <div className="space-y-1.5 mb-6">
                  {SOLO_PREP_CARD.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectSolo(SOLO_PREP_CARD.route)}
                className="w-full py-2.5 px-3.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0E121A]"
              >
                <span>{SOLO_PREP_CARD.buttonText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
              );
            })()}

            {/* AI Mock Interview Studio Configurator */}
            <div className="rounded-xl p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-active)] transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]">
                    Full Studio
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                  AI Mock Interview Studio
                </h3>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-4">
                  Configure custom mock interview simulations with 4 specialized AI personas, calibrated for FAANG, Unicorn, and Tier-1 product engineering standards.
                </p>

                <div className="space-y-1.5 mb-6">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                    <span>4 Calibrated Interviewer Personas</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                    <span>Instant Actionable Report & Rubrics</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                    <span>Company-Specific Question Targeting</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectSolo('/interviews/new')}
                className="w-full py-2.5 px-3.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)]"
              >
                <span>Configure Custom Interview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[var(--border)]">
        <div className="max-w-2xl mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Platform architecture
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Built for reliable low-latency execution and competitive fairness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">Live Telemetry</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Real-time combat with typing indicators, submission alerts, and spectator synchronization via Socket.IO.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mb-3">
              <Terminal className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">Sandboxed Compiler</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Isolated Judge0 compiler workers execute submissions securely across multiple languages with GCC local fallback.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-secondary)] mb-3">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">Per-Mode Elo System</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Independent rating calculations for coding, architecture, and behavioral rounds with transparent rank tiers.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4 text-center text-xs text-[var(--text-secondary)] font-mono">
        <p>1v1 Coding Arena — Competitive Developer Interview Studio</p>
      </footer>
    </div>
  );
}
