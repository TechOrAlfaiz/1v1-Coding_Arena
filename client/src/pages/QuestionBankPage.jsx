import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';

const POPULAR_COMPANIES = [
  'Google',
  'Amazon',
  'Meta',
  'Microsoft',
  'Apple',
  'Bloomberg',
  'Uber',
  'Netflix',
  'ByteDance',
  'Goldman Sachs',
];

const POPULAR_TOPICS = [
  'Array',
  'String',
  'Hash Table',
  'Dynamic Programming',
  'Two Pointers',
  'Sliding Window',
  'Binary Search',
  'Stack',
  'Graph',
  'Tree',
];

export const QuestionBankPage = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination & counts
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 30;

  // Multi-facet Filters
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isPlayableOnly, setIsPlayableOnly] = useState(false);
  const [search, setSearch] = useState('');

  // Filter metadata
  const [meta, setMeta] = useState({
    totalCount: 0,
    playableCount: 0,
    companies: [],
    topics: [],
    difficulties: ['Easy', 'Medium', 'Hard'],
  });

  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  // Fetch filter metadata on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/questions/meta/filters`);
        if (res.data && res.data.success) {
          setMeta(res.data);
        }
      } catch (err) {
        console.error('Error fetching filter metadata:', err);
      }
    };
    fetchMeta();
  }, [API_URL]);

  // Fetch questions on filter or page change
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCompany) params.append('companies', selectedCompany);
        if (selectedTopic) params.append('topics', selectedTopic);
        if (difficulty) params.append('difficulty', difficulty);
        if (isPlayableOnly) params.append('isPlayable', 'true');
        if (search.trim()) params.append('search', search.trim());
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        const res = await axios.get(`${API_URL}/api/questions?${params.toString()}`);
        if (res.data && res.data.success) {
          setQuestions(res.data.questions || []);
          setTotal(res.data.total || 0);
          setTotalPages(res.data.totalPages || 1);
        }
      } catch (err) {
        console.error('Error loading questions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [selectedCompany, selectedTopic, difficulty, isPlayableOnly, search, page, API_URL]);

  // Reset page to 1 when filters change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedCompany('');
    setSelectedTopic('');
    setDifficulty('');
    setIsPlayableOnly(false);
    setSearch('');
    setPage(1);
  };

  const getDifficultyColor = (diff) => {
    const d = (diff || '').toLowerCase();
    switch (d) {
      case 'easy':
        return 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/30';
      case 'medium':
        return 'text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10 border-[var(--accent-secondary)]/30';
      case 'hard':
        return 'text-[var(--error)] bg-[var(--error)]/10 border-[var(--error)]/30';
      default:
        return 'text-[var(--text-secondary)] bg-[var(--surface-raised)] border-[var(--border)]';
    }
  };

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <BreadcrumbNav 
          items={[{ label: 'Question Bank' }]} 
          backTo="/interviews/new" 
          backLabel="Back to AI Studio" 
        />

        {/* Header Strip with Metrics */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
            <span>{meta.totalCount ? `${meta.totalCount.toLocaleString()} Problems Indexed` : 'Large Question Bank'}</span>
            <span>•</span>
            <span>{meta.companies ? `${meta.companies.length} Companies` : 'Company-Wise'}</span>
            <span>•</span>
            <span className="text-[var(--accent)]">{meta.playableCount || 45} In-App Playable</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Company & Topic Question Bank
          </h1>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">
            Curated questions asked at top tech companies. Browse open problem metadata, link out to full statements, or challenge in-app with verified test cases.
          </p>
        </div>

        {/* Company Quick-Pills Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-mono px-1">
            <span>Target Company Filter:</span>
            {selectedCompany && (
              <button
                type="button"
                onClick={() => handleFilterChange(setSelectedCompany, '')}
                className="text-[var(--accent)] hover:underline"
              >
                Clear Company ({selectedCompany})
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => handleFilterChange(setSelectedCompany, '')}
              className={`px-3 py-1 rounded-lg border font-mono transition-colors whitespace-nowrap ${
                !selectedCompany
                  ? 'bg-[var(--accent)] text-[#10141C] border-[var(--accent)] font-semibold'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-secondary)]'
              }`}
            >
              All Companies
            </button>
            {POPULAR_COMPANIES.map((comp) => (
              <button
                key={comp}
                type="button"
                onClick={() => handleFilterChange(setSelectedCompany, selectedCompany === comp ? '' : comp)}
                className={`px-3 py-1 rounded-lg border font-mono transition-colors whitespace-nowrap ${
                  selectedCompany === comp
                    ? 'bg-[var(--accent)] text-[#10141C] border-[var(--accent)] font-semibold'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-secondary)]'
                }`}
              >
                {comp}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Toolbar Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl space-y-3.5">
          {/* Top Row: Search & Difficulty Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <input
                type="text"
                placeholder="Search by title, keyword, or slug..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg pl-9 pr-8 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors font-mono"
              />
              <span className="absolute left-3 top-2.5 text-[var(--text-secondary)] text-xs">🔍</span>
              {search && (
                <button
                  type="button"
                  onClick={() => handleFilterChange(setSearch, '')}
                  className="absolute right-2.5 top-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
                >
                  ×
                </button>
              )}
            </div>

            {/* Difficulty Tabs */}
            <div className="md:col-span-4 flex items-center gap-1 bg-[var(--surface-raised)] p-1 rounded-lg border border-[var(--border)]">
              {['', 'easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleFilterChange(setDifficulty, d)}
                  className={`flex-1 py-1 text-xs rounded-md capitalize font-mono transition-colors text-center ${
                    difficulty === d
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] font-semibold shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {d || 'All'}
                </button>
              ))}
            </div>

            {/* In-App Playable Toggle */}
            <div className="md:col-span-2 flex items-center">
              <button
                type="button"
                onClick={() => handleFilterChange(setIsPlayableOnly, !isPlayableOnly)}
                className={`w-full py-2 px-3 text-xs rounded-lg border font-mono transition-colors flex items-center justify-center gap-1.5 ${
                  isPlayableOnly
                    ? 'bg-[var(--accent-secondary)] text-[#10141C] border-[var(--accent-secondary)] font-semibold'
                    : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-secondary)]'
                }`}
              >
                <span>⚔️</span>
                <span>Playable Only</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Detailed Dropdowns for Company & Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]/60 text-xs">
            {/* Company Select */}
            <div>
              <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1">Company Select</label>
              <select
                value={selectedCompany}
                onChange={(e) => handleFilterChange(setSelectedCompany, e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">All Companies ({meta.companies.length})</option>
                {meta.companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Select */}
            <div>
              <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1">Algorithm Topic</label>
              <select
                value={selectedTopic}
                onChange={(e) => handleFilterChange(setSelectedTopic, e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">All Topics ({meta.topics.length})</option>
                {meta.topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Filters / Reset */}
            <div className="flex items-end justify-between sm:justify-end gap-2">
              {(selectedCompany || selectedTopic || difficulty || isPlayableOnly || search) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[#202736] text-[var(--error)] text-xs font-mono transition-colors"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Header Strip */}
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-mono px-1">
          <span>
            Showing {questions.length > 0 ? (page - 1) * limit + 1 : 0} –{' '}
            {Math.min(page * limit, total)} of {total.toLocaleString()} problems
          </span>
          <span>Page {page} of {totalPages || 1}</span>
        </div>

        {/* Question Cards List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-[var(--text-secondary)] font-mono">Filtering question bank...</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-16 text-center text-[var(--text-secondary)] font-mono text-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-3">
            <div className="text-2xl">🔍</div>
            <p>No problems match the current filter selection.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-[#10141C] hover:opacity-90 transition-opacity"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {questions.map((q, idx) => {
              const diffLabel = (q.difficulty || 'medium').charAt(0).toUpperCase() + (q.difficulty || 'medium').slice(1);
              return (
                <div
                  key={q._id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border)]/90 hover:bg-[var(--surface-raised)]/30 p-4 rounded-xl transition-all"
                >
                  {/* Left info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5 min-w-0">
                      <span className="text-xs font-mono text-[var(--text-secondary)] shrink-0">
                        #{q.frontendId || idx + 1}
                      </span>
                      <h3 
                        className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate max-w-[280px] sm:max-w-[400px] md:max-w-[480px]"
                        title={q.title}
                      >
                        {q.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider shrink-0 ${getDifficultyColor(
                          q.difficulty
                        )}`}
                      >
                        {diffLabel}
                      </span>
                      {q.isPlayable && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 flex items-center gap-1 shrink-0">
                          <span>⚔️</span>
                          <span>In-App Duel Ready</span>
                        </span>
                      )}
                    </div>

                    {/* Company & Topic Tags */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                      {/* Companies */}
                      {q.companies && q.companies.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {q.companies.slice(0, 2).map((c, cIdx) => (
                            <span
                              key={cIdx}
                              title={c}
                              onClick={() => handleFilterChange(setSelectedCompany, c)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-primary)] font-mono text-[10px] border border-[var(--border)] cursor-pointer hover:border-[var(--accent)] transition-colors max-w-[120px] sm:max-w-[140px]"
                            >
                              <span className="shrink-0">🏢</span>
                              <span className="truncate">{c}</span>
                            </span>
                          ))}
                          {q.companies.length > 2 && (
                            <span 
                              title={`Also asked at: ${q.companies.slice(2).join(', ')}`}
                              className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono text-[10px] border border-[var(--border)] cursor-help transition-colors"
                            >
                              +{q.companies.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Topics */}
                      {q.topics && q.topics.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {q.topics.slice(0, 3).map((t, tIdx) => (
                            <span
                              key={tIdx}
                              title={`#${t}`}
                              onClick={() => handleFilterChange(setSelectedTopic, t)}
                              className="text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer transition-colors max-w-[110px] truncate inline-block"
                            >
                              #{t}
                            </span>
                          ))}
                          {q.topics.length > 3 && (
                            <span 
                              title={`More topics: ${q.topics.slice(3).map(t => `#${t}`).join(', ')}`}
                              className="text-[10px] font-mono text-[var(--text-secondary)] cursor-help"
                            >
                              +{q.topics.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* External LeetCode link */}
                    {q.sourceLink && (
                      <a
                        href={q.sourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[var(--surface-raised)] hover:bg-[#202736] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)] flex items-center gap-1"
                        title="Open problem on LeetCode"
                      >
                        <span>LeetCode</span>
                        <span>↗</span>
                      </a>
                    )}

                    {/* Arena Duel or Solo Practice */}
                    {q.isPlayable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/interviews/new?questionId=${q._id}&type=coding`)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] text-[#10141C] hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          <span>⚔️</span>
                          <span>Arena Match</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/practice`)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-raised)] hover:bg-[#202736] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]"
                        >
                          Practice
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/interviews/new?type=coding`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-raised)] hover:bg-[#202736] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]"
                      >
                        Mock Interview
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Navigation */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] text-xs font-mono">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-raised)] transition-colors"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1">
              {page > 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    className="px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--surface-raised)]"
                  >
                    1
                  </button>
                  <span className="px-1 text-[var(--text-secondary)]">...</span>
                </>
              )}

              {page > 1 && (
                <button
                  type="button"
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--surface-raised)]"
                >
                  {page - 1}
                </button>
              )}

              <button
                type="button"
                className="px-2.5 py-1 rounded-md bg-[var(--accent)] text-[#10141C] font-bold"
              >
                {page}
              </button>

              {page < totalPages && (
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--surface-raised)]"
                >
                  {page + 1}
                </button>
              )}

              {page < totalPages - 1 && (
                <>
                  <span className="px-1 text-[var(--text-secondary)]">...</span>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className="px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-[var(--surface-raised)]"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--surface-raised)] transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBankPage;
