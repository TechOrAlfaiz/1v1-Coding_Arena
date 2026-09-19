import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import RubricRadarChart from '../components/RubricRadarChart';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';

export const InterviewReportPage = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/interviews/report/${id}`);
        if (res.data && res.data.report) {
          setReport(res.data.report);
        }
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Evaluation report not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id, API_URL]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center text-[var(--accent)]">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-xs font-mono text-[var(--text-secondary)]">Generating Evaluation Dossier...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center text-[var(--text-primary)] p-4">
        <h2 className="text-lg font-bold mb-2">Report Not Found</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-4">{error || 'This session has not yet completed evaluation.'}</p>
        <Link
          to="/interviews/new"
          className="btn-accent px-4 py-2 rounded-lg text-xs font-medium"
        >
          Start New Mock Interview
        </Link>
      </div>
    );
  }

  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case 'Strong Hire':
        return 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--accent)]';
      case 'Hire':
      case 'Leaning Hire':
        return 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)]';
      case 'Lean No Hire':
        return 'bg-[var(--surface-raised)] text-[var(--accent-secondary)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-raised)] text-[var(--error)] border border-[var(--border)]';
    }
  };

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <BreadcrumbNav 
          items={[
            { label: 'Mock History', to: '/interviews/history' },
            { label: 'Evaluation Report' }
          ]} 
          backTo="/interviews/history" 
          backLabel="Back to History" 
        />

        {/* Header Dossier Summary */}
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] bg-[var(--surface-raised)] px-2 py-0.5 rounded border border-[var(--border)]">
                  {report.interviewType?.replace('_', ' ')} Evaluation
                </span>
                {report.companyId && (
                  <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--surface-raised)] px-2 py-0.5 rounded border border-[var(--border)]">
                    {report.companyId.name}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                Performance Evaluation Dossier
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
                Role: <strong className="text-[var(--text-primary)]">{report.role}</strong> • Duration: {report.durationMinutes}m • Date: {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Verdict Badge */}
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[11px] font-mono text-[var(--text-secondary)] mb-1">Verdict</span>
              <div className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${getVerdictBadge(report.verdict)}`}>
                {report.verdict}
              </div>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-3 rounded-lg">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">Overall Rating</div>
              <div className="text-xl font-bold font-mono text-[var(--accent)] mt-0.5">
                {report.overallRating?.toFixed(1)} <span className="text-xs text-[var(--text-secondary)] font-normal">/ 5.0</span>
              </div>
            </div>

            <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-3 rounded-lg">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">Score</div>
              <div className="text-xl font-bold font-mono text-[var(--accent)] mt-0.5">
                {report.overallScore} <span className="text-xs text-[var(--text-secondary)] font-normal">/ 100</span>
              </div>
            </div>

            <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-3 rounded-lg">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">XP Awarded</div>
              <div className="text-xl font-bold font-mono text-[var(--accent-secondary)] mt-0.5">
                +{Math.round(100 + ((report.overallScore || 70) * 2))} XP
              </div>
            </div>

            <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-3 rounded-lg">
              <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">Problem</div>
              <div className="text-xs font-medium text-[var(--text-primary)] mt-1 truncate">
                {report.questionId?.title || report.questionTitle || 'Live Avatar Assessment'}
              </div>
            </div>
          </div>
        </div>

        {/* Radar Chart & Executive Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 8-Axis Radar Chart */}
          <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col items-center justify-center">
            <h3 className="text-xs font-mono text-[var(--text-secondary)] mb-2 self-start">
              Competency Radar
            </h3>
            <RubricRadarChart rubric={report.rubric} size={280} />
          </div>

          {/* Executive Summary */}
          <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono text-[var(--text-secondary)] mb-2">
                Evaluator Summary
              </h3>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed bg-[var(--surface-raised)] p-3.5 rounded-lg border border-[var(--border)] whitespace-pre-line">
                {report.executiveSummary}
              </p>
            </div>

            {/* Rubric Numerical Breakdown */}
            <div className="mt-4 pt-3 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {Object.entries(report.rubric || {}).map(([dim, score]) => (
                <div key={dim} className="bg-[var(--surface-raised)] p-2 rounded-lg border border-[var(--border)]">
                  <div className="text-[11px] text-[var(--text-secondary)] capitalize truncate">{dim.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="text-[var(--accent)] font-mono font-bold text-xs mt-0.5">{score.toFixed(1)}/5</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="bg-[var(--surface)] border border-[var(--accent)]/30 rounded-xl p-5">
            <h3 className="text-xs font-mono font-medium text-[var(--accent)] mb-2.5 flex items-center gap-1.5">
              Demonstrated Strengths
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-primary)]">
              {(report.strengths || []).map((s, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--accent)] font-bold">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses / Growth Areas */}
          <div className="bg-[var(--surface)] border border-[var(--accent-secondary)]/30 rounded-xl p-5">
            <h3 className="text-xs font-mono font-medium text-[var(--accent-secondary)] mb-2.5 flex items-center gap-1.5">
              Areas for Growth
            </h3>
            <ul className="space-y-2 text-xs text-[var(--text-primary)]">
              {(report.weaknesses || []).map((w, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--accent-secondary)] font-bold">!</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Code Review Dossier (if applicable) */}
        {report.codeReview && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-mono text-[var(--text-secondary)]">
              Automated Code Review
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[var(--surface-raised)] p-3 rounded-lg border border-[var(--border)]">
                <div className="text-[11px] text-[var(--text-secondary)]">Correctness & Logic</div>
                <div className="text-xs font-medium text-[var(--text-primary)] mt-1">
                  {report.codeReview.correctness || 'Logical flow demonstrated'}
                </div>
              </div>

              <div className="bg-[var(--surface-raised)] p-3 rounded-lg border border-[var(--border)]">
                <div className="text-[11px] text-[var(--text-secondary)]">Time Complexity</div>
                <div className="text-xs font-mono font-semibold text-[var(--accent)] mt-1">
                  {report.codeReview.timeComplexity || 'O(N)'}
                </div>
              </div>

              <div className="bg-[var(--surface-raised)] p-3 rounded-lg border border-[var(--border)]">
                <div className="text-[11px] text-[var(--text-secondary)]">Space Complexity</div>
                <div className="text-xs font-mono font-semibold text-[var(--accent)] mt-1">
                  {report.codeReview.spaceComplexity || 'O(1)'}
                </div>
              </div>
            </div>

            {report.codeReview.suggestions && report.codeReview.suggestions.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-mono text-[var(--text-secondary)] mb-1.5">Recommendations:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--text-secondary)]">
                  {report.codeReview.suggestions.map((sug, i) => (
                    <li key={i}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actionable Recommendations & Learning Next Steps */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
              Reinforce Weak Areas
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-xl">
              Follow your adaptive roadmap or review interactive modules on System Design and Algorithms.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/questions"
              className="btn btn-accent px-4 py-1.5 rounded-lg text-xs font-medium"
            >
              Practice Weak Spots
            </Link>
            <Link
              to="/interviews/new"
              className="btn btn-ghost px-4 py-1.5 rounded-lg text-xs font-medium"
            >
              Retake Mock
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewReportPage;
