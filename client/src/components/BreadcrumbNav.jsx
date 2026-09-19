import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Swords, BookOpen } from 'lucide-react';

export default function BreadcrumbNav({ items = [], backTo, backLabel }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect section from location if not explicitly provided
  const isPrep = 
    location.pathname.startsWith('/prep') || 
    location.pathname.startsWith('/questions') || 
    location.pathname.startsWith('/companies') || 
    location.pathname.startsWith('/learn') || 
    location.pathname.startsWith('/interviews');

  const defaultBackTo = isPrep ? '/questions' : '/lobby';
  const defaultBackText = isPrep ? 'Back to Interview Prep' : 'Back to Arena';

  const targetBack = backTo || defaultBackTo;
  const targetText = backLabel || defaultBackText;

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(targetBack);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono py-1 mb-4 border-b border-[var(--border)]/60 pb-3">
      {/* Breadcrumb Hierarchy */}
      <div className="flex items-center gap-1.5 text-[var(--text-secondary)] flex-wrap">
        <Link 
          to={isPrep ? '/questions' : '/lobby'}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)] transition-colors"
        >
          {isPrep ? (
            <>
              <BookOpen className="w-3 h-3 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--text-primary)]">Interview Prep</span>
            </>
          ) : (
            <>
              <Swords className="w-3 h-3 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--text-primary)]">1v1 Arena</span>
            </>
          )}
        </Link>

        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
            {item.to ? (
              <Link 
                to={item.to} 
                className="hover:text-[var(--text-primary)] transition-colors hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[var(--text-primary)] font-medium">
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Quick Back Action */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>{targetText}</span>
      </button>
    </div>
  );
}
