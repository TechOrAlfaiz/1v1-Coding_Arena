/**
 * PracticePage — Solo Interview Practice Mode
 * Features:
 *  - Configuration: Duration (30/45/60 min), Difficulty, Topic & Company-style filters
 *  - Mandatory "Explain Your Approach" verbal explanation gate before editor unlocks
 *  - Timed Solo Session with client countdown timer (independent of Socket.IO)
 *  - Focus Mode: Blocks copy-paste in editor + logs tab-switch distraction counts
 *  - Comprehensive Report Card: Time taken vs Ideal Benchmark, Test suite results,
 *    approach text vs final code, complexity notes, and distraction metrics.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  Briefcase,
  Clock,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  EyeOff,
  Sparkles,
  Terminal,
  Code2,
  Trophy,
  Filter,
  Building2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
  RefreshCw,
  Award,
  Layers,
  Flame,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
  { id: 'java', label: 'Java', monacoId: 'java' },
];

const ALGORITHM_CATEGORIES = [
  {
    id: 'core_ds',
    name: 'Core Data Structures',
    icon: '📦',
    match: ['array', 'string', 'hash table', 'hash', 'linked list', 'doubly-linked list', 'stack', 'queue', 'heap', 'heap (priority queue)', 'matrix']
  },
  {
    id: 'dp_recursion',
    name: 'Dynamic Programming & Recursion',
    icon: '⚡',
    match: ['dynamic programming', 'dp', 'memoization', 'recursion', 'backtracking', 'divide and conquer', '0-1 knapsack', 'knapsack problem', 'dp on trees', 'longest common subsequence', 'longest increasing subsequence']
  },
  {
    id: 'trees_graphs',
    name: 'Trees & Graph Algorithms',
    icon: '🌳',
    match: ['tree', 'binary tree', 'binary search tree', 'graph', 'graph theory', 'graph coloring', 'breadth-first search', 'depth-first search', 'bfs', 'dfs', '0-1 bfs', "dijkstra's algorithm", 'shortest path', 'topological sort', 'minimum spanning tree', 'bipartite graph', 'eulerian circuit', 'eulerian path', 'floyd-warshall algorithm', 'bellman-ford algorithm', "kruskal's algorithm", "kosaraju's algorithm", 'bridge (graph)', 'articulation point', 'flow network', 'maximum flow']
  },
  {
    id: 'search_sorting',
    name: 'Search, Sorting & Two Pointers',
    icon: '🔍',
    match: ['binary search', 'two pointers', 'sliding window', 'greedy', 'sorting', 'merge sort', 'counting sort', 'bucket sort', 'bubble sort', 'quickselect', 'meet in the middle', 'ternary search', 'heuristic search', 'a* search']
  },
  {
    id: 'math_bits',
    name: 'Math, Bit Manipulation & Strings',
    icon: '🔢',
    match: ['math', 'bit manipulation', 'bitmask', 'combinatorics', 'geometry', 'game theory', 'number theory', 'trie', 'string matching', 'kmp', 'knuth-morris-pratt algorithm', 'aho-corasick algorithm', 'rabin-karp', 'boyer-moore string-search algorithm']
  },
  {
    id: 'specialized',
    name: 'Advanced & Specialized Topics',
    icon: '🔮',
    match: []
  }
];

export default function PracticePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Step state: 'setup' | 'approach' | 'coding' | 'report'
  const [step, setStep] = useState('setup');

  // Available filters from backend
  const [filtersData, setFiltersData] = useState({
    difficulties: ['easy', 'medium', 'hard'],
    topics: [],
    companies: [],
  });
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Selected filters
  const [selectedDuration, setSelectedDuration] = useState(45); // minutes
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');

  // Accordion state for algorithm topics (persisted in sessionStorage)
  // Default: only the first topic category is expanded, others collapsed
  const [expandedTopics, setExpandedTopics] = useState(() => {
    try {
      const saved = sessionStorage.getItem('sandbox_expanded_topics');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['core_ds'];
  });

  const [topicSearch, setTopicSearch] = useState('');

  // Accordion state for company style filter (persisted in sessionStorage)
  const [companyAccordionOpen, setCompanyAccordionOpen] = useState(() => {
    try {
      const saved = sessionStorage.getItem('sandbox_company_accordion');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleTopicCategory = (catId) => {
    setExpandedTopics((prev) => {
      const next = prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId];
      try {
        sessionStorage.setItem('sandbox_expanded_topics', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const toggleCompanyAccordion = () => {
    setCompanyAccordionOpen((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem('sandbox_company_accordion', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Group topics into categories
  const categorizedTopics = React.useMemo(() => {
    const map = {};
    ALGORITHM_CATEGORIES.forEach((cat) => {
      map[cat.id] = [];
    });

    filtersData.topics.forEach((t) => {
      const tLower = t.toLowerCase();
      let assigned = false;
      for (const cat of ALGORITHM_CATEGORIES) {
        if (cat.id === 'specialized') continue;
        if (cat.match.some((m) => tLower === m || tLower.includes(m))) {
          map[cat.id].push(t);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        map['specialized'].push(t);
      }
    });

    return ALGORITHM_CATEGORIES.map((cat) => ({
      ...cat,
      topics: map[cat.id],
    })).filter((cat) => cat.topics.length > 0);
  }, [filtersData.topics]);

  // Session Data
  const [sessionQuestion, setSessionQuestion] = useState(null);
  const [sessionConfig, setSessionConfig] = useState(null);
  const [startingSession, setStartingSession] = useState(false);

  // Approach Explanation Gate
  const [approachText, setApproachText] = useState('');
  const [approachError, setApproachError] = useState('');

  // Active Coding Session
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const starterCodeRef = useRef({});
  const [timeLeft, setTimeLeft] = useState(2700); // seconds
  const [timerActive, setTimerActive] = useState(false);
  const [distractionCount, setDistractionCount] = useState(0);
  const [distractionToast, setDistractionToast] = useState(false);
  const [pasteBlockedToast, setPasteBlockedToast] = useState(false);

  // Execution & Output
  const [customInput, setCustomInput] = useState('');
  const [runningCustom, setRunningCustom] = useState(false);
  const [customResult, setCustomResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcases'); // 'testcases' | 'custom'

  // Report Card Output
  const [reportCard, setReportCard] = useState(null);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/practice/filters`);
        setFiltersData(res.data);
      } catch (err) {
        console.error('Failed to load practice filters:', err);
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    let timer = null;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  // Focus Mode: Tab switch / Window blur detection
  useEffect(() => {
    if (step !== 'coding') return;

    const handleWindowBlur = () => {
      setDistractionCount((c) => c + 1);
      setDistractionToast(true);
      setTimeout(() => setDistractionToast(false), 3000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setDistractionCount((c) => c + 1);
        setDistractionToast(true);
        setTimeout(() => setDistractionToast(false), 3000);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [step]);

  // Handle Session Start
  const handleStartInterview = async () => {
    setStartingSession(true);
    try {
      const res = await axios.post(`${API_URL}/api/practice/start`, {
        duration: selectedDuration,
        difficulty: selectedDifficulty,
        topic: selectedTopic,
        company: selectedCompany,
      });

      setSessionQuestion(res.data.question);
      setSessionConfig(res.data.sessionConfig);
      starterCodeRef.current = res.data.question.starterCode || {};
      setCode(res.data.question.starterCode?.javascript || '// Write your solution here\n');
      setTimeLeft(selectedDuration * 60);
      setDistractionCount(0);
      setApproachText('');
      setStep('approach');
    } catch (err) {
      console.error('Failed to start interview:', err);
    } finally {
      setStartingSession(false);
    }
  };

  // Confirm Approach & Unlock Editor
  const handleConfirmApproach = () => {
    if (approachText.trim().length < 20) {
      setApproachError('Please provide a meaningful approach explanation (minimum 20 characters) before unlocking the editor.');
      return;
    }
    setApproachError('');
    setStep('coding');
    setTimerActive(true);
  };

  // Language Change
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const starter = starterCodeRef.current[newLang] || `// Write your ${newLang} solution here\n`;
    setCode(starter);
  };

  // Monaco Editor Paste Interception (Block paste in Focus Mode)
  const handleEditorMount = (editor) => {
    // Intercept keyboard paste (Ctrl+V / Cmd+V)
    editor.onKeyDown((e) => {
      if ((e.ctrlKey || e.metaKey) && e.keyCode === 52) { // Key code 52 is 'V'
        e.preventDefault();
        e.stopPropagation();
        setPasteBlockedToast(true);
        setTimeout(() => setPasteBlockedToast(false), 2500);
      }
    });

    // Intercept DOM paste events on editor container
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPasteBlockedToast(true);
        setTimeout(() => setPasteBlockedToast(false), 2500);
      }, true);
    }
  };

  // Run Custom Code
  const handleRunCustom = async () => {
    setRunningCustom(true);
    setCustomResult(null);
    try {
      const res = await axios.post(`${API_URL}/api/practice/run`, {
        code,
        language,
        customInput,
      });
      setCustomResult(res.data);
      setActiveConsoleTab('custom');
    } catch (err) {
      setCustomResult({ stderr: err.response?.data?.error || 'Execution failed' });
    } finally {
      setRunningCustom(false);
    }
  };

  // Submit Final Solution
  const handleSubmitSession = async (isTimeout = false) => {
    setSubmitting(true);
    setTimerActive(false);

    const timeSpent = Math.max(1, selectedDuration * 60 - timeLeft);

    try {
      const res = await axios.post(`${API_URL}/api/practice/submit`, {
        questionId: sessionQuestion._id,
        duration: selectedDuration,
        timeTaken: timeSpent,
        approachText,
        code,
        language,
        distractionCount,
        status: isTimeout ? 'timed_out' : 'completed',
      });

      setReportCard(res.data.reportCard);
      setStep('report');
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    handleSubmitSession(true);
  };

  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timerClass = timeLeft > 300 ? 'text-[var(--accent)]' : timeLeft > 60 ? 'text-[var(--accent-secondary)]' : 'text-[var(--error)]';

  return (
    <div className="min-h-screen text-[var(--text-primary)] transition-all">
      <Navbar />

      {/* Dimmed focus atmosphere during active interview */}
      {step === 'coding' && (
        <div className="fixed inset-0 bg-black/40 pointer-events-none z-0" />
      )}

      {/* Toast Warnings */}
      <AnimatePresence>
        {distractionToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-[var(--surface-raised)] border border-[var(--accent-secondary)]/40 text-[var(--accent-secondary)] px-4 py-2.5 rounded-lg shadow-md text-xs font-mono flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-[var(--accent-secondary)]" />
            <span>Tab switch detected. Distractions: {distractionCount}</span>
          </motion.div>
        )}
        {pasteBlockedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-[var(--surface-raised)] border border-[var(--error)]/40 text-[var(--error)] px-4 py-2.5 rounded-lg shadow-md text-xs font-mono flex items-center gap-2"
          >
            <EyeOff className="w-4 h-4 text-[var(--error)]" />
            <span>Copy-paste is disabled in Interview Focus Mode.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* =========================================================================
            STAGE 1: SETUP & CONFIGURATION SCREEN
           ========================================================================= */}
        {step === 'setup' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <BreadcrumbNav 
              items={[{ label: 'Solo Sandbox' }]} 
              backTo="/lobby" 
              backLabel="Back to Lobby" 
            />

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono mb-3">
                <Briefcase className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Solo Interview Simulation</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
                Technical Mock Interview
              </h1>
              <p className="text-[var(--text-secondary)] text-sm max-w-xl mx-auto leading-relaxed">
                Practice algorithmic problem solving under authentic conditions: timed constraints, mandatory verbal approach formulation, and focus tracking.
              </p>
            </div>

            {/* Filter Setup Card */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 sm:p-8 space-y-6">
              {/* Duration Selection */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] font-semibold mb-2.5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--accent)]" />
                  <span>1. Interview Duration</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[30, 45, 60].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setSelectedDuration(dur)}
                      className={`py-3 rounded-lg text-center border font-mono transition-colors ${
                        selectedDuration === dur
                          ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--accent)]'
                          : 'bg-[var(--surface-raised)]/50 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="text-lg font-bold block">{dur}</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Minutes</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selection */}
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] font-semibold mb-2.5 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[var(--accent-secondary)]" />
                  <span>2. Target Difficulty</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'all', label: 'Mixed / Any' },
                    { id: 'easy', label: 'Easy Level' },
                    { id: 'medium', label: 'Medium Level' },
                    { id: 'hard', label: 'Hard Level' },
                  ].map((diff) => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff.id)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-mono font-medium transition-colors border text-center ${
                        selectedDifficulty === diff.id
                          ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--accent)]'
                          : 'bg-[var(--surface-raised)]/50 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Filters (Categorized Accordion) */}
              {filtersData.topics.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <label className="text-xs font-mono text-[var(--text-secondary)] font-semibold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                      <span>3. Algorithmic Focus (Optional)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      {selectedTopic !== 'all' && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--accent)] text-[var(--accent)] text-[11px] font-mono">
                          <span>Focus: #{selectedTopic}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTopic('all')}
                            className="hover:text-[var(--text-primary)] cursor-pointer"
                            title="Clear focus"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedTopic('all')}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors border cursor-pointer ${
                          selectedTopic === 'all'
                            ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--accent)]'
                            : 'bg-[var(--surface-raised)]/50 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        All Topics (Random)
                      </button>
                    </div>
                  </div>

                  {/* Search / filter box */}
                  <div className="relative mb-3">
                    <Search className="input-icon-left" />
                    <input
                      type="text"
                      placeholder="Filter algorithms (e.g. dynamic programming, binary search, tree)..."
                      value={topicSearch}
                      onChange={(e) => setTopicSearch(e.target.value)}
                      className="input input-has-icon py-1.5 text-xs w-full font-mono bg-[var(--surface-raised)]/40"
                    />
                    {topicSearch && (
                      <button
                        type="button"
                        onClick={() => setTopicSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Accordion Categories */}
                  <div className="space-y-2">
                    {categorizedTopics.map((cat) => {
                      const filteredTopics = topicSearch.trim()
                        ? cat.topics.filter((t) => t.toLowerCase().includes(topicSearch.toLowerCase()))
                        : cat.topics;

                      if (filteredTopics.length === 0 && topicSearch.trim()) {
                        return null;
                      }

                      const isExpanded = topicSearch.trim() ? true : expandedTopics.includes(cat.id);
                      const hasSelected = cat.topics.includes(selectedTopic);

                      return (
                        <div 
                          key={cat.id} 
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]/30 overflow-hidden"
                        >
                          {/* Accordion Header */}
                          <button
                            type="button"
                            onClick={() => toggleTopicCategory(cat.id)}
                            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[var(--surface-raised)]/70 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{cat.icon}</span>
                              <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {cat.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]">
                                {filteredTopics.length}
                              </span>
                              {hasSelected && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30">
                                  #{selectedTopic}
                                </span>
                              )}
                            </div>

                            <ChevronDown 
                              className={`w-4 h-4 text-[var(--text-secondary)] transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`} 
                            />
                          </button>

                          {/* Accordion Content */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-[var(--border)]/60 bg-[var(--surface)]/60"
                              >
                                <div className="p-3 flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                                  {filteredTopics.map((t) => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => setSelectedTopic(selectedTopic === t ? 'all' : t)}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors border cursor-pointer ${
                                        selectedTopic === t
                                          ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--accent)] font-semibold'
                                          : 'bg-[var(--surface-raised)]/50 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)]'
                                      }`}
                                    >
                                      #{t}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Company Style Filter (Curated + Collapsible Drawer) */}
              {filtersData.companies.length > 0 && (() => {
                const featured = ['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple', 'Netflix', 'Uber', 'Bloomberg']
                  .filter((c) => filtersData.companies.includes(c));
                const remaining = filtersData.companies.filter((c) => !featured.includes(c));

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="text-xs font-mono text-[var(--text-secondary)] font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[var(--accent)]" />
                        <span>4. Company Interview Style (Optional)</span>
                      </label>

                      {selectedCompany !== 'all' && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--accent)] text-[var(--accent)] text-[11px] font-mono">
                          <span>{selectedCompany}-style</span>
                          <button
                            type="button"
                            onClick={() => setSelectedCompany('all')}
                            className="hover:text-[var(--text-primary)] cursor-pointer"
                            title="Clear company"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCompany('all')}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors border cursor-pointer ${
                          selectedCompany === 'all'
                            ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--accent)]'
                            : 'bg-[var(--surface-raised)]/50 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        All Companies (Any)
                      </button>
                      {featured.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedCompany(selectedCompany === c ? 'all' : c)}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors border cursor-pointer ${
                            selectedCompany === c
                              ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--accent)]'
                              : 'bg-[var(--surface-raised)]/50 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {c}-style
                        </button>
                      ))}
                    </div>

                    {remaining.length > 0 && (
                      <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]/30 overflow-hidden">
                        <button
                          type="button"
                          onClick={toggleCompanyAccordion}
                          className="w-full px-3 py-2 flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/60 transition-colors cursor-pointer"
                        >
                          <span>
                            {companyAccordionOpen 
                              ? `Hide additional companies` 
                              : `View ${remaining.length} more company styles (A-Z)`}
                          </span>
                          <ChevronDown 
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              companyAccordionOpen ? 'rotate-180' : ''
                            }`} 
                          />
                        </button>

                        <AnimatePresence initial={false}>
                          {companyAccordionOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-[var(--border)]/60 bg-[var(--surface)]/60"
                            >
                              <div className="p-3 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                                {remaining.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setSelectedCompany(selectedCompany === c ? 'all' : c)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors border cursor-pointer ${
                                      selectedCompany === c
                                        ? 'bg-[var(--surface-raised)] border-[var(--accent)] text-[var(--accent)] font-semibold'
                                        : 'bg-[var(--surface-raised)]/50 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                  >
                                    {c}-style
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Start Interview Action */}
              <div className="pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={handleStartInterview}
                  disabled={startingSession}
                  className="w-full btn-accent py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {startingSession ? (
                    <span>Initializing Simulation...</span>
                  ) : (
                    <>
                      <span>Enter Interview Chamber ({selectedDuration} Min)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            STAGE 2: MANDATORY "EXPLAIN YOUR APPROACH" GATE
           ========================================================================= */}
        {step === 'approach' && sessionQuestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto space-y-5"
          >
            {/* Header info */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]">
                  {sessionQuestion.difficulty}
                </span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  Target: {sessionQuestion.idealSolveTime} min
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                {sessionQuestion.title}
              </h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">
                {sessionQuestion.description}
              </p>
            </div>

            {/* Approach Explanation Gate */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sm:p-6 space-y-3.5">
              <div className="flex items-center gap-2 text-[var(--accent-secondary)] text-sm font-semibold">
                <FileText className="w-4 h-4 text-[var(--accent-secondary)]" />
                <span>Explain Your Planned Approach Before Coding</span>
              </div>
              <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                Describe your planned strategy, data structures, and edge case reasoning before writing code to unlock the editor.
              </p>

              {approachError && (
                <div className="p-3 bg-[var(--surface-raised)] border border-[var(--error)]/30 rounded-lg text-[var(--error)] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{approachError}</span>
                </div>
              )}

              <textarea
                value={approachText}
                onChange={(e) => setApproachText(e.target.value)}
                placeholder="e.g. I plan to use a two-pointer approach / hash map to achieve O(N) time complexity because... Edge cases include empty inputs..."
                rows={5}
                className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none focus:outline-none focus:border-[var(--accent)] transition-colors"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                  {approachText.trim().length}/20 characters required
                </span>
                <button
                  type="button"
                  onClick={handleConfirmApproach}
                  className="btn-accent px-5 py-2 text-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Approach & Unlock Editor</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            STAGE 3: ACTIVE INTERVIEW CODING SESSION
           ========================================================================= */}
        {step === 'coding' && sessionQuestion && (
          <div className="space-y-4">
            {/* Top Interview Bar */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] px-4 py-2.5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">SESSION:</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{sessionQuestion.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]">
                  {sessionQuestion.difficulty}
                </span>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center gap-2 bg-[var(--surface-raised)] px-3.5 py-1 rounded-lg border border-[var(--border)] font-mono font-bold text-lg">
                <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span className={timerClass}>{formatTimer(timeLeft)}</span>
              </div>

              {/* Focus Honesty Pill & Submit */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-mono bg-[var(--surface-raised)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="text-[var(--text-secondary)]">Distractions:</span>
                  <span className={distractionCount > 0 ? 'text-[var(--accent-secondary)] font-bold' : 'text-[var(--accent)]'}>
                    {distractionCount}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSubmitSession(false)}
                  disabled={submitting}
                  className="btn-accent px-4 py-1.5 text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Evaluating...' : 'Submit Solution'}</span>
                </button>
              </div>
            </div>

            {/* Split Screen: Problem Left, Editor Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[620px]">
              {/* Left Column: Problem description & initial approach */}
              <div className="lg:col-span-5 bg-[var(--surface)] rounded-xl p-4 overflow-y-auto space-y-4 max-h-[720px] border border-[var(--border)]">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">{sessionQuestion.title}</h3>
                  <div className="text-[var(--text-secondary)] text-xs leading-relaxed whitespace-pre-wrap">
                    {sessionQuestion.description}
                  </div>
                </div>

                {/* Examples */}
                {sessionQuestion.examples?.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-xs font-mono text-[var(--text-secondary)]">Test Examples:</h4>
                    {sessionQuestion.examples.map((ex, i) => (
                      <div key={i} className="bg-[var(--surface-raised)] rounded-lg p-2.5 text-xs font-mono border border-[var(--border)] space-y-0.5">
                        <div><span className="text-[var(--text-secondary)]">Input: </span><span className="text-[var(--accent)]">{ex.input}</span></div>
                        <div><span className="text-[var(--text-secondary)]">Output: </span><span className="text-[var(--text-primary)]">{ex.output}</span></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Initial Stored Approach Preview */}
                <div className="bg-[var(--surface-raised)] rounded-lg p-3 border border-[var(--border)] text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-[var(--accent-secondary)] font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Your Stated Approach:</span>
                  </div>
                  <p className="text-[var(--text-secondary)] italic text-[11px] leading-relaxed">
                    "{approachText}"
                  </p>
                </div>
              </div>

              {/* Right Column: Monaco Editor & Console */}
              <div className="lg:col-span-7 flex flex-col bg-[var(--surface)] rounded-xl overflow-hidden border border-[var(--border)]">
                {/* Editor Header */}
                <div className="bg-[var(--surface-raised)] px-3.5 py-2 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1 bg-[var(--surface)] p-0.5 rounded-lg border border-[var(--border)]">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => handleLanguageChange(l.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                          language === l.id
                            ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunCustom}
                      disabled={runningCustom}
                      className="btn-ghost text-xs px-3 py-1 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Play className="w-3 h-3 text-[var(--accent-secondary)]" />
                      <span>{runningCustom ? 'Testing...' : 'Run Input'}</span>
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
                    onMount={handleEditorMount}
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
                      padding: { top: 10 },
                    }}
                  />
                </div>

                {/* Bottom Custom Runner / Output Panel */}
                <div className="h-44 border-t border-[var(--border)] bg-[var(--surface-raised)] p-3 flex flex-col font-mono text-xs">
                  <div className="flex items-center gap-3 mb-1.5 text-[11px] text-[var(--text-secondary)] pb-1 border-b border-[var(--border)]">
                    <span>CUSTOM CONSOLE</span>
                  </div>

                  <div className="flex gap-3 flex-1 overflow-hidden">
                    <div className="w-1/2 flex flex-col">
                      <span className="text-[10px] text-[var(--text-secondary)] mb-1">Input:</span>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Custom parameters..."
                        className="w-full flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2 text-[var(--text-primary)] text-xs resize-none focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    <div className="w-1/2 flex flex-col overflow-y-auto bg-[var(--surface)] rounded-lg p-2 border border-[var(--border)]">
                      <span className="text-[10px] text-[var(--text-secondary)] mb-1">Output:</span>
                      {customResult ? (
                        <div className="space-y-1">
                          {customResult.stdout && (
                            <pre className="text-[var(--accent)] text-[11px] whitespace-pre-wrap">{customResult.stdout}</pre>
                          )}
                          {customResult.stderr && (
                            <pre className="text-[var(--error)] text-[11px] whitespace-pre-wrap">{customResult.stderr}</pre>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-secondary)] text-[11px]">Run input to view execution logs.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STAGE 4: COMPREHENSIVE REPORT CARD VIEW
           ========================================================================= */}
        {step === 'report' && reportCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto space-y-5"
          >
            {/* Top Result Banner */}
            <div className={`bg-[var(--surface)] rounded-xl p-6 sm:p-7 text-center border ${
              reportCard.allPassed ? 'border-[var(--accent)]/40' : 'border-[var(--error)]/40'
            }`}>
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-[var(--surface-raised)] border border-[var(--border)]">
                {reportCard.allPassed ? (
                  <CheckCircle2 className="w-6 h-6 text-[var(--accent)]" />
                ) : (
                  <XCircle className="w-6 h-6 text-[var(--error)]" />
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-1.5">
                {reportCard.allPassed ? 'Interview Solved' : 'Practice Incomplete'}
              </h2>
              <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
                {reportCard.allPassed
                  ? 'All algorithmic test suites passed. Review your performance telemetry below.'
                  : 'Some test cases failed or time expired. Inspect edge cases and complexity metrics.'}
              </p>
            </div>

            {/* Benchmark & Metric Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Solve Time vs Benchmark */}
              <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                <span className="text-xs font-mono text-[var(--text-secondary)] block mb-1">
                  Solve Time vs Benchmark
                </span>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xl font-bold font-mono text-[var(--accent)]">{reportCard.timeTakenMinutes}m</span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">/ Ideal: {reportCard.idealSolveTime}m</span>
                </div>
                <div className="w-full bg-[var(--surface-raised)] h-1.5 rounded-full overflow-hidden mb-2 border border-[var(--border)]">
                  <div
                    className={`h-full rounded-full ${
                      reportCard.isUnderBenchmark ? 'bg-[var(--accent)]' : 'bg-[var(--accent-secondary)]'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((reportCard.timeTakenMinutes / reportCard.idealSolveTime) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                  {reportCard.isUnderBenchmark ? 'Fast: Within ideal benchmark' : 'Over ideal benchmark target'}
                </span>
              </div>

              {/* Test Cases Matrix */}
              <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                <span className="text-xs font-mono text-[var(--text-secondary)] block mb-1">
                  Test Suites Passed
                </span>
                <p className="text-xl font-bold font-mono text-[var(--accent)] mb-2">
                  {reportCard.results.filter((r) => r.passed).length} / {reportCard.results.length}
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {reportCard.results.map((r, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${
                        r.passed 
                          ? 'bg-[var(--surface-raised)] text-[var(--accent)] border-[var(--border)]' 
                          : 'bg-[var(--surface-raised)] text-[var(--error)] border-[var(--border)]'
                      }`}
                    >
                      #{i + 1} {r.passed ? 'PASS' : 'FAIL'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Focus Honesty / Distraction Count */}
              <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)]">
                <span className="text-xs font-mono text-[var(--text-secondary)] block mb-1">
                  Focus Honesty Rating
                </span>
                <p className="text-xl font-bold font-mono text-[var(--text-primary)] mb-1">
                  {reportCard.distractionCount === 0 ? '100% Focused' : `${reportCard.distractionCount} Switches`}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                  {reportCard.distractionCount === 0
                    ? 'Zero tab switches recorded during simulation.'
                    : 'Tab switch detected during interview.'}
                </p>
              </div>
            </div>

            {/* Approach Explanation vs Final Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] space-y-1.5">
                <span className="text-xs font-mono text-[var(--accent-secondary)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Stated Approach (Pre-Coding Plan):</span>
                </span>
                <div className="bg-[var(--surface-raised)] rounded-lg p-3 text-xs text-[var(--text-secondary)] leading-relaxed italic border border-[var(--border)]">
                  "{reportCard.approachText}"
                </div>
              </div>

              <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] space-y-1.5">
                <span className="text-xs font-mono text-[var(--accent)] flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Final Submitted Code ({reportCard.language}):</span>
                </span>
                <pre className="bg-[var(--surface-raised)] rounded-lg p-3 text-[11px] font-mono text-[var(--accent)] overflow-x-auto max-h-44 border border-[var(--border)]">
                  {reportCard.code}
                </pre>
              </div>
            </div>

            {/* Complexity Analysis */}
            <div className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] text-xs font-mono space-y-1">
              <div className="flex items-center gap-4">
                <span className="text-[var(--text-secondary)]">Complexity:</span>
                <span className="text-[var(--accent)] font-semibold">Time: {reportCard.complexity?.time}</span>
                <span className="text-[var(--text-primary)] font-semibold">Space: {reportCard.complexity?.space}</span>
              </div>
              <p className="text-[var(--text-secondary)] text-xs pt-0.5">
                {reportCard.complexity?.note}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-3">
              <button
                onClick={() => {
                  setStep('setup');
                  setReportCard(null);
                }}
                className="w-full sm:w-auto btn-accent px-5 py-2 text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Practice Another Problem</span>
              </button>

              <Link
                to="/dashboard"
                className="w-full sm:w-auto btn-ghost px-5 py-2 text-xs flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <span>View Practice History</span>
              </Link>

              <Link
                to="/lobby"
                className="w-full sm:w-auto btn-ghost px-5 py-2 text-xs flex items-center justify-center gap-1.5"
              >
                <span>Return to Lobby</span>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
