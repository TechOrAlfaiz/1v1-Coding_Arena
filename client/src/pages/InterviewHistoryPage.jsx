import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';

export const InterviewHistoryPage = () => {
  const [sessions, setSessions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/interviews/history`);
        setSessions(res.data.sessions || []);
        setReports(res.data.reports || []);
      } catch (err) {
        console.error('Error fetching interview history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [API_URL]);

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <BreadcrumbNav 
          items={[
            { label: 'AI Mock Studio', to: '/interviews/new' },
            { label: 'Mock History' }
          ]} 
          backTo="/interviews/new" 
          backLabel="Back to Studio" 
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono mb-2">
              <span>Interview Archive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">Mock Interview History</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Review completed sessions, hiring verdicts, and rubric feedback breakdowns.
            </p>
          </div>

          <Link
            to="/interviews/new"
            className="btn-accent px-4 py-2 rounded-lg text-xs font-medium self-start sm:self-auto"
          >
            + New Interview
          </Link>
        </div>

        {/* Sessions & Reports List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reports.length === 0 && sessions.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center text-[var(--text-secondary)] text-sm space-y-3">
            <div className="font-medium text-[var(--text-primary)]">No mock interviews completed yet</div>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              Sharpen your skills against adaptive AI interviewers with speech interaction, code reviews, and transparent rubric ratings.
            </p>
            <div className="pt-2">
              <Link
                to="/interviews/new"
                className="btn-accent px-4 py-2 rounded-lg text-xs font-medium inline-block"
              >
                Launch First Interview →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((rep) => (
              <div
                key={rep._id}
                className="bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border)]/80 hover:bg-[var(--surface-raised)]/30 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] bg-[var(--surface-raised)] px-2 py-0.5 rounded border border-[var(--border)]">
                      {rep.interviewType?.replace('_', ' ')}
                    </span>
                    {rep.companyId && (
                      <span className="text-xs text-[var(--text-primary)] font-medium">
                        {rep.companyId.name}
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-secondary)]">•</span>
                    <span className="text-xs font-mono text-[var(--text-secondary)]">
                      {new Date(rep.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {rep.questionId?.title || rep.role}
                  </h3>

                  <div className="text-xs text-[var(--text-secondary)]">
                    Verdict: <strong className="text-[var(--text-primary)]">{rep.verdict}</strong> • Score:{' '}
                    <strong className="text-[var(--accent)] font-mono">{rep.overallScore}/100</strong> ({rep.overallRating?.toFixed(1)}/5)
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link
                    to={`/interviews/${rep._id}/report`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-raised)] hover:bg-[var(--surface-raised)]/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors"
                  >
                    View Dossier →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewHistoryPage;
