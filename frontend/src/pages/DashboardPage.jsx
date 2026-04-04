import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, interviewAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

const formatDate = (value) => {
  if (!value) return 'No date available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getStatusMeta = (session) => {
  if (session.is_completed) {
    return {
      label: 'Completed',
      className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    };
  }

  return {
    label: 'In Progress',
    className: 'bg-amber-100 text-amber-700 border border-amber-200',
  };
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(user);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const [profileRes, sessionsRes] = await Promise.all([
          authAPI.profile(),
          interviewAPI.sessions(),
        ]);

        setProfile(profileRes.data);
        setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      } catch (err) {
        console.error(err);
        setError('Failed to load your dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const dashboardData = useMemo(() => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((session) => session.is_completed);
    const inProgressSessions = sessions.filter((session) => !session.is_completed);
    const sessionsWithScores = completedSessions.filter(
      (session) => session.result && typeof session.result.overall_score === 'number'
    );

    const averageScore = sessionsWithScores.length
      ? (
          sessionsWithScores.reduce(
            (sum, session) => sum + session.result.overall_score,
            0
          ) / sessionsWithScores.length
        ).toFixed(1)
      : null;

    const roleCounts = sessions.reduce((acc, session) => {
      const role = session.role || 'Unknown role';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const mostCommonRoleEntry = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0] || null;

    const strongestSession = sessionsWithScores.reduce((best, session) => {
      if (!best) return session;
      return session.result.overall_score > best.result.overall_score ? session : best;
    }, null);

    return {
      totalSessions,
      completedSessions: completedSessions.length,
      inProgressSessions: inProgressSessions.length,
      averageScore,
      mostCommonRole: mostCommonRoleEntry ? mostCommonRoleEntry[0] : null,
      strongestSession,
      recentSessions: sessions.slice(0, 6),
    };
  }, [sessions]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const displayName = profile?.name || profile?.email || user?.name || user?.email || 'there';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-theme-text-muted animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-theme-text-muted text-sm font-mono uppercase tracking-widest">
          Loading Dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-premium w-full max-w-xl text-center">
          <p className="text-theme-text-muted mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Try Again
            </button>
            <Link to="/setup" className="btn-secondary">
              Start New Session
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="min-h-screen py-12 md:py-20">
        <div className="container max-w-6xl">
          <div className="card-premium">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.25em] font-mono text-theme-text-muted mb-4">
                  Dashboard
                </p>
                <h1 className="text-4xl md:text-5xl font-serif mb-4">
                  Welcome back, {displayName}
                </h1>
                <p className="text-theme-text-muted leading-relaxed text-base md:text-lg">
                  You have not started any interview sessions yet. Begin a new practice round to
                  track progress, review reports, and build momentum.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/setup" className="btn-primary">
                  Start New Session
                </Link>
                <button onClick={handleLogout} className="btn-ghost">
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">
            {[
              ['Total Sessions', '0'],
              ['Completed', '0'],
              ['In Progress', '0'],
              ['Average Score', '—'],
            ].map(([label, value]) => (
              <div key={label} className="card-premium">
                <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-3">
                  {label}
                </p>
                <p className="text-3xl font-serif text-theme-text">{value}</p>
              </div>
            ))}
          </div>

          <div className="card-premium mt-8 text-center">
            <h2 className="text-2xl font-serif mb-3">No sessions yet</h2>
            <p className="text-theme-text-muted mb-6">
              Your recent interview activity will appear here once you complete your first setup.
            </p>
            <Link to="/setup" className="btn-primary">
              Go to Setup
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 md:py-20">
      <div className="container max-w-7xl space-y-8 animate-fade">
        <section className="card-premium overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none opacity-50">
            <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-200/30 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-slate-200/40 blur-3xl" />
          </div>

          <div className="relative flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.25em] font-mono text-theme-text-muted mb-4">
                Personal Dashboard
              </p>
              <h1 className="text-4xl md:text-5xl font-serif mb-4">
                Welcome back, {displayName}
              </h1>
              <p className="text-theme-text-muted text-base md:text-lg leading-relaxed">
                Review your interview progress, continue unfinished sessions, and revisit completed
                reports to sharpen your next performance.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/setup" className="btn-primary">
                Start New Session
              </Link>
              <button onClick={handleLogout} className="btn-ghost">
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="card-premium">
            <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-3">
              Total Sessions
            </p>
            <p className="text-4xl font-serif">{dashboardData.totalSessions}</p>
          </div>

          <div className="card-premium">
            <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-3">
              Completed
            </p>
            <p className="text-4xl font-serif">{dashboardData.completedSessions}</p>
          </div>

          <div className="card-premium">
            <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-3">
              In Progress
            </p>
            <p className="text-4xl font-serif">{dashboardData.inProgressSessions}</p>
          </div>

          <div className="card-premium">
            <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-3">
              Average Score
            </p>
            <p className="text-4xl font-serif">
              {dashboardData.averageScore ? `${dashboardData.averageScore}/10` : '—'}
            </p>
          </div>
        </section>

        <section className="grid xl:grid-cols-[2fr_1fr] gap-8">
          <div className="card-premium">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-serif mb-1">Recent Sessions</h2>
                <p className="text-sm text-theme-text-muted">
                  Continue active interviews or revisit finished reports.
                </p>
              </div>
              <Link to="/setup" className="btn-secondary">
                New Session
              </Link>
            </div>

            <div className="space-y-4">
              {dashboardData.recentSessions.map((session) => {
                const status = getStatusMeta(session);
                const actionTo = session.is_completed ? `/results/${session.id}` : '/interview';

                return (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-theme-border bg-white/60 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-theme-text">
                          {session.role || 'Untitled Role'}
                        </h3>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                        {session.difficulty && (
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                            {session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1)} Difficulty
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-theme-text-muted">
                        <span>{session.level || 'Unknown'} level</span>
                        <span>•</span>
                        <span>{session.type || 'General'}</span>
                        <span>•</span>
                        <span>{formatDate(session.start_time)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                      <div className="text-left sm:text-right">
                        <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-1">
                          Score
                        </p>
                        <p className="text-xl font-serif text-theme-text">
                          {session.result && typeof session.result.overall_score === 'number'
                            ? `${session.result.overall_score}/10`
                            : 'Pending'}
                        </p>
                      </div>

                      <Link to={actionTo} className="btn-primary">
                        {session.is_completed ? 'View Report' : 'Continue'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card-premium">
              <h2 className="text-2xl font-serif mb-4">Quick Insights</h2>
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-2">
                    Most Practiced Role
                  </p>
                  <p className="text-lg text-theme-text">
                    {dashboardData.mostCommonRole || 'Not enough data yet'}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-2">
                    Strongest Result
                  </p>
                  <p className="text-lg text-theme-text">
                    {dashboardData.strongestSession
                      ? `${dashboardData.strongestSession.role} — ${dashboardData.strongestSession.result.overall_score}/10`
                      : 'Complete a scored session to unlock this insight'}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-2">
                    Next Best Step
                  </p>
                  <p className="text-sm text-theme-text-muted leading-relaxed">
                    {dashboardData.inProgressSessions > 0
                      ? 'You already have an interview in progress. Continue it to capture a full report.'
                      : 'Start a fresh interview session and keep building consistency across different roles.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="card-premium">
              <h3 className="text-lg font-serif mb-3">Momentum Snapshot</h3>
              <p className="text-sm text-theme-text-muted leading-relaxed mb-5">
                {dashboardData.completedSessions > 0
                  ? `You've completed ${dashboardData.completedSessions} session${dashboardData.completedSessions > 1 ? 's' : ''}. Keep reviewing reports to turn feedback into stronger answers.`
                  : 'Your dashboard will become more useful as soon as you finish your first interview session.'}
              </p>
              <Link to="/setup" className="btn-secondary w-full">
                Practice Again
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;