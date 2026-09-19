import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';

export const CompaniesPage = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/companies`);
        setCompanies(res.data.companies || []);
      } catch (err) {
        console.error('Error fetching companies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, [API_URL]);

  const filteredCompanies = companies.filter((c) => {
    const matchesTier = tierFilter === 'ALL' || c.tier === tierFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.keyFocusAreas && c.keyFocusAreas.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    return matchesTier && matchesSearch;
  });

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <BreadcrumbNav 
          items={[{ label: 'Target Companies' }]} 
          backTo="/questions" 
          backLabel="Back to Questions" 
        />

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono mb-3">
            <span>Company Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Target Tech Companies
          </h1>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">
            Review interview stages, compensation ranges, core focus topics, and practice with calibrated interviewers.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--surface)] border border-[var(--border)] p-3.5 rounded-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', 'FAANG', 'Unicorn', 'Tier 1 Product'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                  tierFilter === tier
                    ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search company or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>

        {/* Company Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-16 text-center text-[var(--text-secondary)] font-mono text-sm bg-[var(--surface)] border border-[var(--border)] rounded-xl">
            No companies match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanies.map((comp) => (
              <div
                key={comp._id}
                className="flex flex-col justify-between bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border)]/80 hover:bg-[var(--surface-raised)]/30 rounded-xl p-5 transition-colors group"
              >
                <div>
                  {/* Top: Logo & Tier */}
                    <div className="flex items-center justify-between mb-3.5 min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-xl shrink-0">
                          {comp.logo}
                        </div>
                        <div className="min-w-0">
                          <h2 
                            className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate max-w-[150px] sm:max-w-[200px]"
                            title={comp.name}
                          >
                            {comp.name}
                          </h2>
                          <span className="text-[11px] font-mono text-[var(--text-secondary)] block truncate">
                            {comp.tier}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)] shrink-0">
                        {comp.questionCount || 30}+ questions
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-3.5">
                      {comp.description}
                    </p>

                    {/* Typical Roles & Comp */}
                    {comp.roles && comp.roles.length > 0 && (
                      <div className="mb-3.5 bg-[var(--surface-raised)] p-2.5 rounded-lg border border-[var(--border)] text-xs">
                        <div className="text-[10px] uppercase font-mono text-[var(--text-secondary)] mb-0.5">Role & Compensation</div>
                        <div className="text-[var(--text-primary)] font-medium truncate" title={comp.roles[0].title}>
                          {comp.roles[0].title}
                        </div>
                        <div className="text-[var(--accent)] font-mono text-[11px] mt-0.5">
                          {comp.roles[0].salaryRange || '$180k - $300k'}
                        </div>
                      </div>
                    )}

                  {/* Focus Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(comp.keyFocusAreas || []).slice(0, 4).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-secondary)] text-[10px] font-mono border border-[var(--border)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => navigate(`/interviews/new?companyId=${comp._id}`)}
                    className="w-full py-2 rounded-lg text-xs font-medium bg-[var(--surface-raised)] hover:bg-[var(--accent)] text-[var(--text-secondary)] hover:text-black border border-[var(--border)] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Practice {comp.name} Mock</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;
