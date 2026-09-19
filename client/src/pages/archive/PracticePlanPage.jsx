import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BreadcrumbNav from '../components/BreadcrumbNav';

export const PracticePlanPage = () => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completingKey, setCompletingKey] = useState(null);

  const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/plan`);
        if (res.data && res.data.plan) {
          setPlan(res.data.plan);
        }
      } catch (err) {
        console.error('Error fetching plan:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [API_URL]);

  const handleCompleteTask = async (dayNumber, taskIndex) => {
    const key = `${dayNumber}-${taskIndex}`;
    setCompletingKey(key);

    try {
      const res = await axios.post(`${API_URL}/api/plan/task/complete`, {
        planId: plan._id,
        dayNumber,
        taskIndex,
      });

      if (res.data && res.data.plan) {
        setPlan(res.data.plan);
      }
    } catch (err) {
      console.error('Error marking task complete:', err);
    } finally {
      setCompletingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center text-[var(--accent)]">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-xs font-mono text-[var(--text-secondary)]">Generating adaptive 7-day roadmap...</div>
      </div>
    );
  }

  // Calculate overall completion percentage
  let totalTasks = 0;
  let completedTasks = 0;
  if (plan && plan.days) {
    plan.days.forEach((day) => {
      day.tasks.forEach((t) => {
        totalTasks++;
        if (t.completed) completedTasks++;
      });
    });
  }
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <Navbar />

      <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <BreadcrumbNav 
          items={[{ label: '7-Day Plan' }]} 
          backTo="/questions" 
          backLabel="Back to Questions" 
        />

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono mb-3">
            <span>Adaptive Roadmap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Personalized 7-Day Sprint
          </h1>
          <p className="mt-2 text-[var(--text-secondary)] text-sm">
            Customized based on your diagnostic performance. Complete daily high-leverage challenges.
          </p>
        </div>

        {/* Progress Banner */}
        <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
              Target: {plan?.targetRole || 'Full Stack Engineer'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono">
              Companies: {(plan?.targetCompanies || ['Google', 'Meta', 'Stripe']).join(', ')}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:w-48 bg-[var(--surface-raised)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
              <div
                className="bg-[var(--accent)] h-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <span className="font-bold text-xs text-[var(--accent)] font-mono whitespace-nowrap">
              {completionPercentage}% done
            </span>
          </div>
        </div>

        {/* Days List */}
        <div className="space-y-3.5">
          {plan?.days?.map((day) => (
            <div
              key={day.dayNumber}
              className={`p-4 rounded-xl border transition-colors ${
                day.isDayCompleted
                  ? 'bg-[var(--surface)] border-[var(--accent)]/40'
                  : 'bg-[var(--surface)] border-[var(--border)]'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                    day.isDayCompleted ? 'bg-[var(--accent)] text-black' : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]'
                  }`}>
                    D{day.dayNumber}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{day.theme}</h3>
                    <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                      Day {day.dayNumber} • {day.tasks.length} tasks
                    </div>
                  </div>
                </div>

                {day.isDayCompleted && (
                  <span className="text-xs font-mono text-[var(--accent)] flex items-center gap-1">
                    ✓ Completed
                  </span>
                )}
              </div>

              {/* Tasks List */}
              <div className="space-y-2">
                {day.tasks.map((task, idx) => {
                  const isBusy = completingKey === `${day.dayNumber}-${idx}`;
                  return (
                    <div
                      key={idx}
                      className={`flex items-start justify-between gap-3 p-3 rounded-lg border text-xs transition-colors ${
                        task.completed
                          ? 'bg-[var(--surface-raised)]/40 border-[var(--border)]/60 text-[var(--text-secondary)] line-through'
                          : 'bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border)]/80'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-[11px] text-[var(--text-secondary)] no-underline">
                          {task.description} • <span className="text-[var(--accent)] font-mono">{task.estimatedMinutes} mins</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => !task.completed && handleCompleteTask(day.dayNumber, idx)}
                        disabled={task.completed || isBusy}
                        className={`px-3 py-1.5 rounded-md font-mono text-[11px] font-medium transition-colors ${
                          task.completed
                            ? 'bg-[var(--surface-raised)] text-[var(--accent)] border border-[var(--border)] cursor-default'
                            : 'bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black'
                        }`}
                      >
                        {task.completed ? '✓ Done' : isBusy ? 'Saving...' : 'Mark Done (+20 XP)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-3">
          <Link
            to="/interviews/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent)] text-black hover:bg-[var(--accent)]/90 transition-colors"
          >
            <span>Launch Mock Interview</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PracticePlanPage;
