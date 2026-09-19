/**
 * DashboardPage (Profile & Stats HUD)
 * Displays player career overview:
 *  - 1v1 Multiplayer Duels history & ELO stats
 *  - Solo Interview Practice history with SVG trend charts and benchmark comparisons
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Trophy, 
  Swords, 
  Flame, 
  TrendingUp, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Code2,
  FileText,
  CheckCircle2,
  XCircle,
  Building2,
  Award,
  Zap,
  Crown,
  Layers,
  Lock,
  Briefcase,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';
import { getTierBadge, BADGE_METADATA } from '../utils/rankUtils';
import WeakSpotRadarChart from '../components/WeakSpotRadarChart';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

// Circular SVG Progress Ring
function CircularProgress({ percentage, size = 110, strokeWidth = 8, label = "WIN RATE" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#262D3D"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#4FA393"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          fill="transparent"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-black font-mono text-[var(--text-primary)]">{percentage}%</span>
        <span className="block text-[9px] text-[var(--text-secondary)] uppercase tracking-widest font-mono">{label}</span>
      </div>
    </div>
  );
}

// Trend Chart for Practice Solve Times
function SolveTimeTrendChart({ trendPoints = [] }) {
  if (trendPoints.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)] font-mono text-xs">
        No recent practice sessions to plot trends. Complete mock interviews to view solve time progress.
      </div>
    );
  }

  const height = 140;
  const width = 500;
  const padding = 30;

  const maxVal = Math.max(50, ...trendPoints.map((p) => Math.max(p.timeTakenMin, p.idealMin)));

  const getY = (val) => height - padding - ((val / maxVal) * (height - 2 * padding));
  const getX = (idx) => padding + (idx / Math.max(1, trendPoints.length - 1)) * (width - 2 * padding);

  const pointsString = trendPoints.map((p, i) => `${getX(i)},${getY(p.timeTakenMin)}`).join(' ');

  return (
    <div className="w-full overflow-x-auto py-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl mx-auto overflow-visible">
        {/* Horizontal grid lines */}
        <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="#262D3D" strokeDasharray="3" />
        <line x1={padding} y1={getY(25)} x2={width - padding} y2={getY(25)} stroke="#E3B341" strokeOpacity="0.3" strokeDasharray="3" />
        <text x={padding - 5} y={getY(25) + 3} fill="#E3B341" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">25m</text>

        {/* Benchmark Reference Line */}
        <line
          x1={padding}
          y1={getY(25)}
          x2={width - padding}
          y2={getY(25)}
          stroke="#E3B341"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Trend Polyline */}
        {trendPoints.length > 1 && (
          <polyline
            fill="none"
            stroke="#4FA393"
            strokeWidth="2"
            points={pointsString}
          />
        )}

        {/* Data points */}
        {trendPoints.map((p, i) => {
          const cx = getX(i);
          const cy = getY(p.timeTakenMin);
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r="4"
                fill={p.passed ? '#4FA393' : '#D9736A'}
                stroke="#10141C"
                strokeWidth="2"
              />
              <text
                x={cx}
                y={cy - 8}
                fill="#E6E8EB"
                fontSize="9"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
                fontWeight="bold"
              >
                {p.timeTakenMin}m
              </text>
              <text
                x={cx}
                y={height - 8}
                fill="#8B93A1"
                fontSize="8"
                textAnchor="middle"
                fontFamily="JetBrains Mono"
              >
                #{p.sessionIndex}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-6 mt-2 text-[10px] font-mono text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" /> Solved Session</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[var(--error)]" /> Failed / Timeout</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-[1.5px] bg-[var(--accent-secondary)] inline-block border-dashed" /> Target Benchmark (25m)</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Mode tab: 'duels' | 'practice'
  const [activeTab, setActiveTab] = useState('duels');

  // 1v1 Duels state
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [duelPage, setDuelPage] = useState(1);
  const [totalDuelPages, setTotalDuelPages] = useState(1);

  // Practice state
  const [practiceSessions, setPracticeSessions] = useState([]);
  const [loadingPractice, setLoadingPractice] = useState(true);
  const [practicePage, setPracticePage] = useState(1);
  const [totalPracticePages, setTotalPracticePages] = useState(1);
  const [practiceStats, setPracticeStats] = useState({
    totalSessions: 0,
    passedCount: 0,
    passRate: 0,
    avgSolveTimeSeconds: 0,
    avgDistractions: '0.0',
  });
  const [trendPoints, setTrendPoints] = useState([]);

  // AI Mock Interviews state
  const [interviewReports, setInterviewReports] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);

  // Feature 6: Weak Spot Radar state
  const [radarData, setRadarData] = useState([]);

  // Daily Challenge & Streak state
  const [dailyStats, setDailyStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    lastSolvedDate: null,
    solvedDates: [],
    monthlyBadges: [],
    solvedToday: false,
  });

  // Fetch Daily Challenge stats
  useEffect(() => {
    const fetchDailyStats = async () => {
      try {
        const token = localStorage.getItem('arena_token') || localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API_URL}/api/daily/user-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          setDailyStats(res.data);
        }
      } catch (err) {
        console.warn('Daily stats fetch warning:', err.message);
      }
    };
    fetchDailyStats();
  }, []);

  // Fetch Weak Spot Radar
  useEffect(() => {
    const fetchRadar = async () => {
      try {
        const token = localStorage.getItem('arena_token') || localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/matches/user/radar`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data?.radarData) {
          setRadarData(res.data.radarData);
        }
      } catch (err) {
        console.warn('Radar fetch warning:', err.message);
      }
    };
    fetchRadar();
  }, []);

  // Fetch Duels
  useEffect(() => {
    const fetchDuels = async () => {
      setLoadingMatches(true);
      try {
        const res = await axios.get(`${API_URL}/api/matches/history?page=${duelPage}&limit=10`);
        setMatches(res.data.matches || []);
        setTotalDuelPages(res.data.pagination?.pages || 1);
      } catch (err) {
        console.warn('History fetch warning:', err.message);
      } finally {
        setLoadingMatches(false);
      }
    };
    fetchDuels();
  }, [duelPage]);

  // Fetch Practice History
  useEffect(() => {
    const fetchPractice = async () => {
      setLoadingPractice(true);
      try {
        const res = await axios.get(`${API_URL}/api/practice/history?page=${practicePage}&limit=10`);
        setPracticeSessions(res.data.sessions || []);
        setTotalPracticePages(res.data.pagination?.pages || 1);
        if (res.data.stats) setPracticeStats(res.data.stats);
        if (res.data.trendPoints) setTrendPoints(res.data.trendPoints);
      } catch (err) {
        console.warn('Practice history fetch warning:', err.message);
      } finally {
        setLoadingPractice(false);
      }
    };
    fetchPractice();
  }, [practicePage]);

  // Fetch Interview Reports
  useEffect(() => {
    if (activeTab === 'interviews') {
      const fetchInterviews = async () => {
        setLoadingInterviews(true);
        try {
          const res = await axios.get(`${API_URL}/api/interviews/history`);
          setInterviewReports(res.data.reports || []);
        } catch (err) {
          console.warn('Interview history fetch warning:', err.message);
        } finally {
          setLoadingInterviews(false);
        }
      };
      fetchInterviews();
    }
  }, [activeTab]);

  const totalMatches = user?.stats?.totalMatches || 0;
  const wins = user?.stats?.wins || 0;
  const losses = user?.stats?.losses || 0;
  const draws = user?.stats?.draws || 0;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const userRating = user?.rating || user?.elo || 1000;
  const tier = getTierBadge(userRating);
  const winStreak = user?.streaks?.current || 0;
  const longestStreak = user?.streaks?.longest || 0;
  const userId = user?.id || user?._id || '';

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <BreadcrumbNav 
          items={[{ label: 'Career Dashboard' }]} 
          backTo="/lobby" 
          backLabel="Back to Arena" 
        />

        {/* Profile Header HUD */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--surface)] rounded-3xl p-6 sm:p-8 mb-6 border border-[var(--border)] relative overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left User Overview */}
            <div className="flex items-center gap-4 sm:gap-6 text-center sm:text-left flex-col sm:flex-row">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-black bg-[var(--accent)]"
              >
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>

              <div>
                <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                  <h1 className="text-3xl font-black text-[var(--text-primary)] font-display">
                    {user?.username || 'Gladiator'}
                  </h1>
                  <span className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded-md border ${tier.border} ${tier.color} ${tier.bg}`}>
                    {tier.name}
                  </span>
                </div>
                <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1 font-mono">
                  GLADIATOR ID: #{userId ? userId.slice(-6).toUpperCase() : 'UNKNOWN'} // RATING: {userRating} ELO
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-6 sm:gap-8">
              <CircularProgress percentage={winRate} size={110} strokeWidth={8} label="WIN RATE" />

              <div className="grid grid-cols-3 gap-2.5 text-center sm:text-left">
                <div className="bg-[var(--surface-raised)] px-3 py-2 rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Duels</p>
                  <p className="text-base font-black font-mono text-[var(--text-primary)]">{totalMatches}</p>
                </div>
                <div className="bg-[var(--surface-raised)] px-3 py-2 rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Victories</p>
                  <p className="text-base font-black font-mono text-[var(--accent)]">{wins}</p>
                </div>
                <div className="bg-[var(--surface-raised)] px-3 py-2 rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Win Streak</p>
                  <p className="text-base font-black font-mono text-[var(--accent-secondary)]">
                    {winStreak > 0 ? `🔥 ${winStreak}` : '0'}
                  </p>
                </div>
                <div className="bg-[var(--surface-raised)] px-3 py-2 rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Best Streak</p>
                  <p className="text-base font-black font-mono text-[var(--accent)]">⚡ {longestStreak}</p>
                </div>
                <div className="bg-[var(--surface-raised)] px-3 py-2 rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">First Blood</p>
                  <p className="text-base font-black font-mono text-[var(--error)]">{user?.specialWins?.firstBlood || 0}</p>
                </div>
                <div className="bg-[var(--surface-raised)] px-3 py-2 rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Comebacks</p>
                  <p className="text-base font-black font-mono text-[var(--accent)]">{user?.specialWins?.comeback || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature 5: Multi-Mode Ranked Elo Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Coding Arena Elo */}
          {(() => {
            const codingRating = user?.ratings?.coding || user?.rating || 1000;
            const codingTier = getTierBadge(codingRating);
            return (
              <div className="bg-[var(--surface)] rounded-3xl p-5 border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] font-bold uppercase mb-1">
                    <Code2 className="w-4 h-4" />
                    <span>Coding Arena</span>
                  </div>
                  <p className="text-2xl font-black font-mono text-[var(--text-primary)]">{codingRating} ELO</p>
                  <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border mt-1 ${codingTier.border} ${codingTier.color} ${codingTier.bg}`}>
                    {codingTier.name}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] font-black text-xl">
                  ⚔️
                </div>
              </div>
            );
          })()}

          {/* System Design Elo */}
          {(() => {
            const sdRating = user?.ratings?.systemDesign || 1000;
            const sdTier = getTierBadge(sdRating);
            return (
              <div className="bg-[var(--surface)] rounded-3xl p-5 border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--accent-secondary)] font-bold uppercase mb-1">
                    <Layers className="w-4 h-4" />
                    <span>System Design</span>
                  </div>
                  <p className="text-2xl font-black font-mono text-[var(--text-primary)]">{sdRating} ELO</p>
                  <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border mt-1 ${sdTier.border} ${sdTier.color} ${sdTier.bg}`}>
                    {sdTier.name}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-secondary)] font-black text-xl">
                  🏗️
                </div>
              </div>
            );
          })()}

          {/* Behavioral STAR Elo */}
          {(() => {
            const behRating = user?.ratings?.behavioral || 1000;
            const behTier = getTierBadge(behRating);
            return (
              <div className="bg-[var(--surface)] rounded-3xl p-5 border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--accent)] font-bold uppercase mb-1">
                    <Crown className="w-4 h-4" />
                    <span>Behavioral STAR</span>
                  </div>
                  <p className="text-2xl font-black font-mono text-[var(--text-primary)]">{behRating} ELO</p>
                  <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border mt-1 ${behTier.border} ${behTier.color} ${behTier.bg}`}>
                    {behTier.name}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] font-black text-xl">
                  🎯
                </div>
              </div>
            );
          })()}
        </div>

        {/* Feature 6: Weak Spot Competency Radar Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--surface)] rounded-3xl p-6 sm:p-7 mb-8 border border-[var(--border)]"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-display">Competency Radar & Weak Spots</h2>
            </div>
            <p className="text-xs font-mono text-[var(--text-secondary)]">
              Aggregated across DP, recursion, system architecture, and communication clarity.
            </p>
          </div>

          <WeakSpotRadarChart radarData={radarData} size={290} />
        </motion.div>

        {/* Feature 5: Badges & Achievement Honors Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--surface)] rounded-3xl p-6 sm:p-7 mb-8 border border-[var(--border)]"
        >
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-[var(--accent-secondary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-display">Arena Badges & Honors</h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]">
                {(user?.badges || []).length} / {Object.keys(BADGE_METADATA).length} Unlocked
              </span>
            </div>
            <p className="text-xs font-mono text-[var(--text-secondary)]">
              Battle in ranked 1v1 duels to unlock combat badges & achievements.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.values(BADGE_METADATA).map((badgeDef) => {
              const earned = (user?.badges || []).find((b) => b.id === badgeDef.id);
              return (
                <div
                  key={badgeDef.id}
                  className={`rounded-2xl p-3.5 text-center border transition-all flex flex-col items-center justify-between min-h-[145px] ${
                    earned
                      ? 'bg-[var(--surface-raised)] border-[var(--border)]'
                      : 'bg-[var(--surface-raised)]/40 border-[var(--border)] opacity-40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-[var(--surface)] border border-[var(--border)]">
                    {earned ? (
                      <Award className={`w-5 h-5 ${badgeDef.color}`} />
                    ) : (
                      <Lock className="w-4 h-4 text-[var(--text-secondary)]" />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold text-xs ${earned ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {badgeDef.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-tight opacity-75">
                      {badgeDef.description}
                    </p>
                  </div>
                  <span className={`text-[9px] font-mono mt-2 ${earned ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                    {earned ? `Earned ${new Date(earned.earnedAt).toLocaleDateString()}` : 'Locked'}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Daily Challenge & Monthly Badges Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--surface)] rounded-3xl p-6 sm:p-7 mb-8 border border-[var(--border)]"
        >
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-[var(--accent-secondary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-display">Daily Challenge & Monthly Honors</h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--surface-raised)] text-[var(--accent-secondary)] border border-[var(--border)]">
                🔥 {dailyStats.currentStreak} Day Streak
              </span>
            </div>
            <Link
              to="/daily"
              className="text-xs font-mono text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              <span>Go to Today's Challenge</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="bg-[var(--surface-raised)] rounded-2xl p-4 border border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-[var(--accent-secondary)]/30 flex items-center justify-center text-[var(--accent-secondary)]">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">Current Streak</div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)]">{dailyStats.currentStreak} Day{dailyStats.currentStreak === 1 ? '' : 's'}</div>
              </div>
            </div>

            <div className="bg-[var(--surface-raised)] rounded-2xl p-4 border border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">Longest Streak</div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)]">{dailyStats.longestStreak} Day{dailyStats.longestStreak === 1 ? '' : 's'}</div>
              </div>
            </div>

            <div className="bg-[var(--surface-raised)] rounded-2xl p-4 border border-[var(--border)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)]">Total Solves</div>
                <div className="text-lg font-bold font-mono text-[var(--text-primary)]">{dailyStats.solvedDates?.length || 0} Solved</div>
              </div>
            </div>
          </div>

          {/* Monthly Badges Showcase */}
          <div>
            <h3 className="text-xs font-mono uppercase text-[var(--text-secondary)] mb-3">
              Earned Monthly Medals ({dailyStats.monthlyBadges?.length || 0})
            </h3>
            {dailyStats.monthlyBadges && dailyStats.monthlyBadges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {dailyStats.monthlyBadges.map((badge, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl p-3.5 text-center bg-[var(--surface-raised)] border border-[var(--border)] flex flex-col items-center justify-between min-h-[140px]"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-amber-500/15 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/30">
                      <Award className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[var(--text-primary)]">
                        {badge.month} {badge.year}
                      </p>
                      <p className="text-[10px] text-[var(--accent-secondary)] font-mono mt-0.5">
                        Perfect Streak
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--text-secondary)] mt-1">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[var(--surface-raised)]/60 rounded-xl p-4 text-center border border-[var(--border)] text-xs text-[var(--text-secondary)] font-mono">
                Solve every daily challenge in a calendar month to unlock the prestigious Perfect Streak Medal.
              </div>
            )}
          </div>
        </motion.div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-[var(--border)] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('duels')}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'duels'
                ? 'bg-[var(--surface-raised)] border border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <Swords className="w-4 h-4 text-[var(--accent)]" />
            <span>1v1 Duel History ({totalMatches})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'practice'
                ? 'bg-[var(--surface-raised)] border border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <Briefcase className="w-4 h-4 text-[var(--accent)]" />
            <span>Solo Practice ({practiceStats.totalSessions})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interviews')}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'interviews'
                ? 'bg-[var(--surface-raised)] border border-[var(--accent)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <Zap className="w-4 h-4 text-[var(--accent)]" />
            <span>AI Mock Dossiers ({interviewReports.length || user?.interviewStats?.totalInterviews || 0})</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: 1v1 DUEL HISTORY
           ========================================================================= */}
        {activeTab === 'duels' && (
          <div className="bg-[var(--surface)] rounded-3xl p-6 sm:p-8 border border-[var(--border)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] font-display">Multiplayer Match Log</h2>
                <p className="text-[var(--text-secondary)] text-xs mt-0.5">Records from real-time competitive duels</p>
              </div>
            </div>

            {loadingMatches ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[var(--text-secondary)] text-xs font-mono">Retrieving duel logs...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="py-16 text-center text-[var(--text-secondary)] font-mono">
                <Swords className="w-10 h-10 text-[var(--text-secondary)] opacity-50 mx-auto mb-3" />
                <p className="text-sm">No competitive duels recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => {
                  const isWin = match.result === 'win';
                  const isLoss = match.result === 'loss';

                  return (
                    <motion.div
                      key={match.id}
                      whileHover={{ x: 3 }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isWin
                          ? 'bg-[var(--surface-raised)] border-[var(--border)] hover:border-[var(--accent)]/40'
                          : isLoss
                          ? 'bg-[var(--surface-raised)] border-[var(--border)] hover:border-[var(--error)]/40'
                          : 'bg-[var(--surface-raised)] border-[var(--border)] hover:border-[var(--text-secondary)]/30'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-base ${
                          isWin 
                            ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30' 
                            : isLoss 
                            ? 'bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30' 
                            : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'
                        }`}>
                          {isWin ? 'W' : isLoss ? 'L' : 'D'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                              {match.question?.title || 'Algorithmic Problem'}
                            </span>
                            {match.question?.difficulty && (
                              <span className={`badge-${match.question.difficulty} uppercase`}>
                                {match.question.difficulty}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                            vs <span className="text-[var(--text-primary)]">{match.opponent?.username || 'Challenger'}</span>
                            {' · '}
                            {match.endedAt ? new Date(match.endedAt).toLocaleDateString() : 'Recent'}
                            {match.duration && ` · ${formatDuration(match.duration)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {match.eloChange !== 0 && (
                          <div className="flex items-center gap-1 font-mono font-black text-sm">
                            {match.eloChange > 0 ? (
                              <span className="text-[var(--accent)]">+{match.eloChange} ELO</span>
                            ) : (
                              <span className="text-[var(--error)]">{match.eloChange} ELO</span>
                            )}
                          </div>
                        )}
                        <Link
                          to={`/result/${match.roomId}`}
                          className="px-2.5 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono transition-colors"
                        >
                          Diff →
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Duel Pagination */}
            {totalDuelPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8 pt-4 border-t border-[var(--border)] font-mono text-xs">
                <button
                  onClick={() => setDuelPage((p) => Math.max(1, p - 1))}
                  disabled={duelPage === 1}
                  className="btn-ghost px-3 py-1.5 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
                <span className="text-[var(--text-secondary)] px-3">
                  Page {duelPage} of {totalDuelPages}
                </span>
                <button
                  onClick={() => setDuelPage((p) => Math.min(totalDuelPages, p + 1))}
                  disabled={duelPage === totalDuelPages}
                  className="btn-ghost px-3 py-1.5 disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: SOLO INTERVIEW PRACTICE HISTORY & TREND CHART
           ========================================================================= */}
        {activeTab === 'practice' && (
          <div className="space-y-6">
            {/* Trend Chart Card */}
            <div className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)]">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] font-display flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                    <span>Interview Solve Time Trend</span>
                  </h3>
                  <p className="text-[var(--text-secondary)] text-xs">
                    Historical solve speeds across recent mock interview runs compared against ideal target benchmarks.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">Avg Solve: </span>
                  <span className="text-sm font-black font-mono text-[var(--accent)]">
                    {formatDuration(practiceStats.avgSolveTimeSeconds)}
                  </span>
                </div>
              </div>

              <SolveTimeTrendChart trendPoints={trendPoints} />
            </div>

            {/* Practice Session Log */}
            <div className="bg-[var(--surface)] rounded-3xl p-6 sm:p-8 border border-[var(--border)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] font-display">Mock Interview Runs</h3>
                  <p className="text-[var(--text-secondary)] text-xs">Single-player practice sessions and verbal approach plans</p>
                </div>
              </div>

              {loadingPractice ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)] text-xs font-mono">Retrieving interview records...</p>
                </div>
              ) : practiceSessions.length === 0 ? (
                <div className="py-16 text-center text-[var(--text-secondary)] font-mono">
                  <Briefcase className="w-10 h-10 text-[var(--text-secondary)] opacity-50 mx-auto mb-3" />
                  <p className="text-sm">No solo practice sessions recorded.</p>
                  <Link to="/practice" className="mt-3 inline-block btn-accent text-xs px-4 py-2">
                    Start Solo Practice
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {practiceSessions.map((session) => {
                    const q = session.questionId;
                    const timeTakenMin = Math.round((session.timeTaken / 60) * 10) / 10;
                    return (
                      <div
                        key={session._id}
                        className="p-5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2.5">
                            {session.allPassed ? (
                              <CheckCircle2 className="w-5 h-5 text-[var(--accent)]" />
                            ) : (
                              <XCircle className="w-5 h-5 text-[var(--error)]" />
                            )}
                            <h4 className="font-bold text-[var(--text-primary)] text-base">{q?.title || 'Unknown Challenge'}</h4>
                            {q?.difficulty && <span className={`badge-${q.difficulty} uppercase text-[10px]`}>{q.difficulty}</span>}
                            {q?.companyTags?.slice(0, 2).map((c) => (
                              <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)]">
                                {c}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-[var(--text-secondary)]">
                              Time: <strong className="text-[var(--text-primary)]">{timeTakenMin}m</strong> / {session.duration}m
                            </span>
                            <span className="text-[var(--text-secondary)]">
                              Distractions: <strong className={session.distractionCount > 0 ? 'text-[var(--accent-secondary)]' : 'text-[var(--accent)]'}>{session.distractionCount}</strong>
                            </span>
                            <span className="text-[var(--text-secondary)]">
                              {new Date(session.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Approach Plan preview */}
                        {session.approachText && (
                          <div className="bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] font-sans italic">
                            <span className="text-[var(--accent-secondary)] font-bold not-italic font-mono text-[10px] block mb-1">
                              VERBAL APPROACH PLAN:
                            </span>
                            "{session.approachText}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Practice Pagination */}
              {totalPracticePages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-8 pt-4 border-t border-[var(--border)] font-mono text-xs">
                  <button
                    onClick={() => setPracticePage((p) => Math.max(1, p - 1))}
                    disabled={practicePage === 1}
                    className="btn-ghost px-3 py-1.5 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>
                  <span className="text-[var(--text-secondary)] px-3">
                    Page {practicePage} of {totalPracticePages}
                  </span>
                  <button
                    onClick={() => setPracticePage((p) => Math.min(totalPracticePages, p + 1))}
                    disabled={practicePage === totalPracticePages}
                    className="btn-ghost px-3 py-1.5 disabled:opacity-40"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: AI MOCK INTERVIEW DOSSIERS
           ========================================================================= */}
        {activeTab === 'interviews' && (
          <div className="space-y-6">
            {/* Diagnostic Competency Overview */}
            <div className="bg-[var(--surface)] rounded-3xl p-6 sm:p-8 border border-[var(--border)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] font-display">AI Technical Interview Diagnostic</h2>
                  <p className="text-[var(--text-secondary)] text-xs mt-0.5">Automated Rubric Benchmarks Across Problem Solving, Architecture & Communication</p>
                </div>
                <Link
                  to="/interviews/new"
                  className="btn-accent px-4 py-2 text-xs font-bold"
                >
                  + Launch New Mock
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[var(--surface-raised)] p-4 rounded-2xl border border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Completed Mocks</div>
                  <div className="text-2xl font-black font-mono text-[var(--text-primary)] mt-1">
                    {user?.interviewStats?.totalInterviews || interviewReports.length || 0}
                  </div>
                </div>

                <div className="bg-[var(--surface-raised)] p-4 rounded-2xl border border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Average Score</div>
                  <div className="text-2xl font-black font-mono text-[var(--accent)] mt-1">
                    {user?.interviewStats?.avgScore || 78}%
                  </div>
                </div>

                <div className="bg-[var(--surface-raised)] p-4 rounded-2xl border border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Coding Average</div>
                  <div className="text-2xl font-black font-mono text-[var(--accent)] mt-1">
                    {user?.interviewStats?.codingAvg || 82}%
                  </div>
                </div>

                <div className="bg-[var(--surface-raised)] p-4 rounded-2xl border border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">System Design Avg</div>
                  <div className="text-2xl font-black font-mono text-[var(--accent-secondary)] mt-1">
                    {user?.interviewStats?.systemDesignAvg || 75}%
                  </div>
                </div>
              </div>
            </div>

            {/* List of Interview Reports */}
            <div className="bg-[var(--surface)] rounded-3xl p-6 sm:p-8 border border-[var(--border)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Historical Performance Dossiers</h3>

              {loadingInterviews ? (
                <div className="py-12 text-center text-[var(--text-secondary)] font-mono text-xs">
                  <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading interview dossiers...
                </div>
              ) : interviewReports.length === 0 ? (
                <div className="py-12 text-center text-[var(--text-secondary)] font-mono text-xs space-y-3">
                  <p>No completed AI mock interview dossiers on record yet.</p>
                  <Link
                    to="/interviews/new"
                    className="inline-block btn-accent px-4 py-2 text-xs font-bold"
                  >
                    Take Your First Mock Interview ⚡
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviewReports.map((rep) => (
                    <div
                      key={rep._id}
                      className="bg-[var(--surface-raised)] border border-[var(--border)] hover:border-[var(--accent)]/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border)]">
                            {rep.interviewType?.replace('_', ' ')}
                          </span>
                          {rep.companyId && (
                            <span className="text-xs text-[var(--text-secondary)] font-semibold">
                              {rep.companyId.name}
                            </span>
                          )}
                          <span className="text-[var(--border)]">•</span>
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            {new Date(rep.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="font-bold text-sm text-[var(--text-primary)]">
                          {rep.questionId?.title || rep.role}
                        </div>

                        <div className="text-xs text-[var(--text-secondary)]">
                          Verdict: <strong className="text-[var(--text-primary)]">{rep.verdict}</strong> • Score:{' '}
                          <strong className="text-[var(--accent)]">{rep.overallScore}/100</strong>
                        </div>
                      </div>

                      <Link
                        to={`/interviews/${rep._id}/report`}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] transition-all self-end sm:self-center font-mono"
                      >
                        View Full Dossier →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
