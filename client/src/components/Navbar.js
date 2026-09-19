import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Swords, 
  Trophy, 
  LogOut, 
  Zap, 
  Bot, 
  Building2, 
  BookOpen, 
  HelpCircle,
  Menu,
  X,
  LayoutDashboard,
  Clock,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getTierBadge } from '../utils/rankUtils';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

/**
 * LeetCode-style Fire Streak Icon
 * Glows up with radiant amber aura and burning flame when user has solved today's daily challenge!
 */
function FlameStreakBadge({ streakData, isMobile = false }) {
  const isSolved = Boolean(streakData.solvedToday);
  const count = streakData.currentStreak || 0;

  return (
    <Link
      to="/daily"
      className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold transition-all duration-300 select-none flex-shrink-0 ${
        isSolved
          ? 'bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 text-amber-300 border border-amber-500/60 shadow-[0_0_14px_rgba(245,158,11,0.45)] hover:shadow-[0_0_22px_rgba(245,158,11,0.7)] hover:border-amber-400'
          : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-amber-500/40 hover:text-amber-300'
      } ${isMobile ? 'text-[11px] px-2 py-0.5' : ''}`}
      title={
        isSolved
          ? `🔥 ${count} Day Streak! Today's daily challenge is solved.`
          : `🔥 ${count} Day Streak (Unsolved today — click to solve and ignite your streak!)`
      }
    >
      {/* Radiant glow aura when solved */}
      {isSolved && (
        <span className="absolute inset-0 rounded-full bg-amber-400/20 blur-sm pointer-events-none -z-10 animate-pulse" />
      )}

      {/* Burning Fire Icon */}
      <div className="relative flex items-center justify-center">
        <Flame
          className={`transition-all duration-300 ${
            isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'
          } ${
            isSolved
              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.95)] animate-pulse'
              : 'text-[var(--text-secondary)] group-hover:text-amber-400 group-hover:fill-amber-400/40'
          }`}
        />
        {isSolved && (
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-300 shadow-[0_0_6px_#fde047] animate-ping" />
        )}
      </div>

      {/* Streak Count */}
      <span
        className={`tracking-tight ${
          isSolved
            ? 'text-amber-300 font-black drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]'
            : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-semibold'
        }`}
      >
        {count}
      </span>

      {/* Glowing dot when solved */}
      {isSolved && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] -ml-0.5" />
      )}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine active section based on current path or saved preference
  const isPrepPath = 
    location.pathname.startsWith('/questions') || 
    location.pathname.startsWith('/companies') || 
    location.pathname.startsWith('/learn') || 
    location.pathname.startsWith('/interviews') ||
    location.pathname.startsWith('/prep');

  const isArenaPath = 
    location.pathname.startsWith('/lobby') || 
    location.pathname.startsWith('/daily') || 
    location.pathname.startsWith('/match') || 
    location.pathname.startsWith('/result') || 
    location.pathname.startsWith('/leaderboard') || 
    location.pathname.startsWith('/practice') ||
    location.pathname.startsWith('/arena');

  const [activeSection, setActiveSection] = useState(() => {
    if (isPrepPath) return 'prep';
    if (isArenaPath) return 'arena';
    const saved = localStorage.getItem('arena_active_section');
    return saved === 'prep' ? 'prep' : 'arena';
  });

  // Sync state if user navigates via browser or deep link
  useEffect(() => {
    if (isPrepPath && activeSection !== 'prep') {
      setActiveSection('prep');
    } else if (isArenaPath && activeSection !== 'arena') {
      setActiveSection('arena');
    }
  }, [location.pathname, isPrepPath, isArenaPath, activeSection]);

  // Streak state connected to Daily Challenge
  const [streakData, setStreakData] = useState({
    currentStreak: user?.dailyChallenge?.currentStreak || 0,
    solvedToday: false,
    loaded: false,
  });

  const fetchStreak = useCallback(async () => {
    const token = localStorage.getItem('arena_token') || localStorage.getItem('token');
    if (!token) {
      setStreakData({ currentStreak: 0, solvedToday: false, loaded: true });
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/api/daily/user-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setStreakData({
          currentStreak: res.data.currentStreak || 0,
          solvedToday: Boolean(res.data.solvedToday),
          loaded: true,
        });
      }
    } catch (err) {
      if (user?.dailyChallenge) {
        const todayStr = new Date().toISOString().split('T')[0];
        setStreakData({
          currentStreak: user.dailyChallenge.currentStreak || 0,
          solvedToday: user.dailyChallenge.lastSolvedDate === todayStr,
          loaded: true,
        });
      }
    }
  }, [user]);

  useEffect(() => {
    fetchStreak();

    // Listen for real-time challenge completion event from DailyChallengePage
    const handleChallengeSolved = (e) => {
      if (e.detail) {
        setStreakData((prev) => ({
          ...prev,
          currentStreak: e.detail.currentStreak ?? (prev.currentStreak + 1),
          solvedToday: true,
          loaded: true,
        }));
      }
    };

    window.addEventListener('daily_challenge_solved', handleChallengeSolved);
    return () => window.removeEventListener('daily_challenge_solved', handleChallengeSolved);
  }, [fetchStreak]);

  const handleSectionSwitch = (section) => {
    setActiveSection(section);
    localStorage.setItem('arena_active_section', section);
    if (section === 'arena') {
      navigate('/lobby');
    } else {
      navigate('/questions');
    }
    setMobileMenuOpen(false);
  };

  const handleSwitchSection = handleSectionSwitch;

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  // Section-specific primary links
  const arenaLinks = [
    { to: '/lobby', label: 'Matchmaking Lobby', shortLabel: 'Lobby', icon: Swords },
    { to: '/daily', label: 'Daily Challenge', shortLabel: 'Daily', icon: Flame },
    { to: '/practice', label: 'Solo Sandbox', shortLabel: 'Sandbox', icon: Zap },
    { to: '/leaderboard', label: 'Rankings', shortLabel: 'Rankings', icon: Trophy },
  ];

  const prepLinks = [
    { to: '/questions', label: 'Question Bank', shortLabel: 'Questions', icon: HelpCircle },
    { to: '/interviews/new', label: 'AI Mock Studio', shortLabel: 'AI Mock', icon: Bot },
    { to: '/companies', label: 'Companies', shortLabel: 'Companies', icon: Building2 },
    { to: '/learn', label: 'Academy', shortLabel: 'Learn', icon: BookOpen },
    { to: '/interviews/history', label: 'History', shortLabel: 'History', icon: Clock },
  ];

  const currentLinks = activeSection === 'prep' ? prepLinks : arenaLinks;

  const userRating = user ? (user.rating || user.elo || 1000) : 1000;
  const tier = user ? getTierBadge(userRating) : null;

  return (
    <nav className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--border)] transition-colors">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-3">
          
          {/* Brand / Logo + Section Toggle */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <Link 
              to="/" 
              className="flex items-center gap-2 group flex-shrink-0"
              onClick={() => setMobileMenuOpen(false)}
              title="Platform Home"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] transition-colors group-hover:border-[var(--border-active)]">
                <Zap className="w-4 h-4 fill-[var(--accent)]" />
              </div>
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="font-bold text-sm text-[var(--text-primary)] tracking-tight">
                  1v1 Arena
                </span>
                <span className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
                  Dev Studio
                </span>
              </div>
            </Link>

            {/* Section Switcher Segmented Control */}
            <div className="flex items-center p-0.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs font-medium flex-shrink-0">
              <button
                type="button"
                onClick={() => handleSwitchSection('arena')}
                className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  activeSection === 'arena'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-sm border border-[var(--border-active)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
                title="Switch to 1v1 Real-time Coding Arena"
              >
                <Swords className={`w-3.5 h-3.5 flex-shrink-0 ${activeSection === 'arena' ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
                <span className="hidden xl:inline">1v1 Arena</span>
                <span className="xl:hidden inline">Arena</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchSection('prep')}
                className={`flex items-center gap-1.5 px-2 xl:px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  activeSection === 'prep'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-sm border border-[var(--border-active)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
                title="Switch to Interview Prep & Question Bank"
              >
                <BookOpen className={`w-3.5 h-3.5 flex-shrink-0 ${activeSection === 'prep' ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
                <span className="hidden xl:inline">Interview Prep</span>
                <span className="xl:hidden inline">Prep</span>
              </button>
            </div>
          </div>

          {/* Desktop Navigation Links (Context-specific to active section) */}
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 justify-center min-w-0 px-1 overflow-x-auto no-scrollbar">
            {currentLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                    isActive
                      ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-active)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] border border-transparent'
                  }`}
                  title={link.label}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
                  <span className="hidden xl:inline whitespace-nowrap">{link.label}</span>
                  <span className="xl:hidden inline whitespace-nowrap">{link.shortLabel || link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Profile & Actions (Right) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* LeetCode-style Fire Streak Badge */}
                <FlameStreakBadge streakData={streakData} />

                {/* Profile Pill */}
                <Link 
                  to="/dashboard"
                  className="flex items-center gap-2 bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] p-1 xl:pr-2.5 rounded-lg border border-[var(--border)] transition-colors group flex-shrink-0"
                  title="View Profile & Dashboard"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold text-black flex-shrink-0"
                    style={{ backgroundColor: user.avatarColor || '#4FA393' }}
                  >
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </div>

                  <div className="hidden xl:flex flex-col items-start text-left leading-none">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {user.username}
                      </span>
                      {tier && (
                        <span className={`text-[10px] font-mono px-1 py-0.2 rounded border ${tier.bg} ${tier.border} ${tier.color}`}>
                          {tier.name}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                        {userRating} ELO
                      </span>
                      <span className="text-[var(--text-tertiary)] text-[9px]">•</span>
                      <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                        Lv.{user.level || 1}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Dashboard Shortcut Icon */}
                <Link
                  to="/dashboard"
                  title="Career Dashboard"
                  className="hidden md:flex p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors border border-[var(--border)] flex-shrink-0"
                >
                  <LayoutDashboard className="w-4 h-4" />
                </Link>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--error)] bg-[var(--surface-raised)] hover:bg-[var(--error-subtle)] rounded-lg transition-colors border border-[var(--border)] hover:border-[var(--error)] flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0E121A] transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[var(--surface-raised)] border-b border-[var(--border)] px-4 py-3 overflow-hidden"
          >
            {/* Section Switcher in Mobile Drawer */}
            <div className="flex items-center p-1 mb-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs">
              <button
                type="button"
                onClick={() => handleSwitchSection('arena')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-all ${
                  activeSection === 'arena'
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] font-semibold border border-[var(--border-active)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>1v1 Arena</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchSection('prep')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-all ${
                  activeSection === 'prep'
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] font-semibold border border-[var(--border-active)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Interview Prep</span>
              </button>
            </div>

            {/* User Details on Mobile */}
            {user && (
              <div className="p-2.5 mb-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold text-black"
                    style={{ backgroundColor: user.avatarColor || '#4FA393' }}
                  >
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[var(--text-primary)]">{user.username}</span>
                      {tier && (
                        <span className={`text-[10px] font-mono px-1 py-0.2 rounded border ${tier.bg} ${tier.border} ${tier.color}`}>
                          {tier.name}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[var(--text-secondary)] mt-0.5">
                      {userRating} ELO // Lv.{user.level || 1}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <FlameStreakBadge streakData={streakData} isMobile />
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-2.5 py-1 rounded-md bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] text-xs font-medium"
                  >
                    Profile
                  </Link>
                </div>
              </div>
            )}

            {/* Section Links List */}
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                {activeSection === 'arena' ? '1v1 Arena Navigation' : 'Interview Prep Navigation'}
              </div>
              {currentLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between p-2 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-active)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-[var(--accent)]" />
                      <span>{link.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Logout on Mobile */}
            {user && (
              <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-3 rounded-md bg-[var(--surface)] hover:bg-[var(--error-subtle)] text-[var(--text-secondary)] hover:text-[var(--error)] border border-[var(--border)] hover:border-[var(--error)] text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
