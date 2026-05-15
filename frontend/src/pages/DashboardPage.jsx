import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, interviewAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import ActivityHeatmap from '../components/ActivityHeatmap';
import CompanyStats from '../components/CompanyStats';

const COMPANY_ICONS = {
  Google:     '🔵',
  Amazon:     '🟠',
  Microsoft:  '🟦',
  Meta:       '🔷',
  Apple:      '🍎',
  Netflix:    '🔴',
  Adobe:      '🅰️',
  IBM:        '💙',
  Oracle:     '🟥',
  Salesforce: '☁️',
  General:    '⭐',
};

const formatDate = (val) => {
  if (!val) return 'N/A';
  const d = new Date(val);
  return isNaN(d) ? 'N/A' : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

function computeBadges(stats, streak) {
  const badges = [];
  if (stats.total_sessions >= 1) badges.push({ icon: '🎯', label: 'First Interview', desc: 'Completed your first session' });
  if (streak.current_streak >= 7) badges.push({ icon: '🔥', label: '7-Day Streak', desc: 'Practiced 7 days in a row' });
  if (streak.longest_streak >= 30) badges.push({ icon: '🏆', label: '30-Day Legend', desc: 'Longest streak of 30+ days' });
  if (stats.average_score >= 8) badges.push({ icon: '⭐', label: 'High Achiever', desc: 'Average score ≥ 8/10' });
  if (stats.completed >= 10) badges.push({ icon: '💎', label: 'Consistent', desc: '10+ interviews completed' });
  return badges;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, activity: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsRes, streakRes] = await Promise.all([
          interviewAPI.dashboardStats(),
          interviewAPI.dashboardStreak(),
        ]);
        setStats(statsRes.data);
        setStreak(streakRes.data);
        try {
          const profileRes = await authAPI.profile();
          setProfile(profileRes.data);
        } catch (_) { /* fall back to auth context user */ }
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => { logout(); navigate('/auth'); };
  const displayName = profile?.name || profile?.email || user?.name || user?.email || 'there';
  const badges = stats && streak ? computeBadges(stats, streak) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-theme-bg gap-4">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-theme-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
        <p className="text-theme-text-muted text-sm font-mono uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-theme-accent hover:opacity-90 text-white rounded-lg font-semibold text-sm transition">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-theme-text-muted mb-1">Dashboard</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-theme-text">
              Welcome back, <span className="text-theme-accent">{displayName}</span>
            </h1>
            <p className="text-theme-text-muted text-sm mt-1">Track your interview prep and keep the momentum going.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link to="/companies" className="px-5 py-2.5 bg-theme-accent hover:opacity-90 text-white font-semibold rounded-lg transition text-sm">
              Companies
            </Link>
            <button onClick={handleLogout} className="px-4 py-2.5 bg-theme-surface hover:bg-theme-border border border-theme-border text-theme-text rounded-lg transition text-sm">
              Logout
            </button>
          </div>
        </div>

        {/* ─── STAT CARDS ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Interviews" value={stats?.total_sessions ?? 0} icon="📊" accent="blue" />
          <StatCard label="Completed" value={stats?.completed ?? 0} sub={`${stats?.in_progress ?? 0} in progress`} icon="✅" accent="green" />
          <StatCard label="Avg Score" value={stats?.average_score != null ? `${stats.average_score}/10` : null} icon="⭐" accent="yellow" />
          <StatCard label="Current Streak" value={streak.current_streak > 0 ? `${streak.current_streak} 🔥` : '0'} sub={`Longest: ${streak.longest_streak} days`} icon="🔥" accent="red" />
        </div>

        {/* ─── STREAK BANNER (shown when streak > 0) ─── */}
        {streak.current_streak > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="text-amber-900 font-bold text-lg">You're on a {streak.current_streak}-day streak!</p>
                <p className="text-amber-800/70 text-sm">Keep going — your longest streak is {streak.longest_streak} days.</p>
              </div>
            </div>
            <Link to="/companies" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition shrink-0">
              Continue →
            </Link>
          </div>
        )}

        {/* ─── HEATMAP ─── */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-theme-text">Activity Heatmap</h2>
            <div className="text-right">
              <p className="text-sm font-bold text-theme-text">{streak.current_streak} 🔥</p>
              <p className="text-[11px] text-theme-text-muted">current streak</p>
            </div>
          </div>
          <ActivityHeatmap activity={streak.activity} />
        </div>

        {/* ─── MAIN GRID ─── */}
        <div className="grid xl:grid-cols-[1fr_380px] gap-6">

          {/* Recent Sessions */}
          <div className="bg-theme-surface border border-theme-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-theme-text">Recent Sessions</h2>
              <Link to="/companies" className="text-xs text-theme-accent hover:underline transition">+ New Session</Link>
            </div>

            {!stats?.recent_sessions?.length ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">🚀</p>
                <p className="text-theme-text-muted text-sm">No sessions yet. Start your first interview!</p>
                <Link to="/companies" className="inline-block mt-4 px-5 py-2 bg-theme-accent hover:opacity-90 text-white text-sm font-semibold rounded-lg transition">
                  Get Started
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_sessions.map((s) => {
                  const score = s.result?.overall_score;
                  const scoreColor = score == null ? 'text-theme-text-muted' : score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-red-600';
                  const companyIcon = COMPANY_ICONS[s.company] || '⭐';
                  return (
                    <div key={s.id} className="flex items-center justify-between bg-theme-bg border border-theme-border hover:border-theme-accent/40 rounded-xl p-4 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">{companyIcon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-theme-text truncate">
                            {s.company || 'General'} — {s.role || 'General'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${s.is_completed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {s.is_completed ? 'Completed' : 'In Progress'}
                            </span>
                            {s.difficulty && <span className="text-[10px] text-theme-text-muted">{s.difficulty}</span>}
                            <span className="text-[10px] text-theme-text-muted">{formatDate(s.start_time)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-3">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${scoreColor}`}>
                            {score != null ? `${score}/10` : '—'}
                          </p>
                          <p className="text-[10px] text-theme-text-muted">score</p>
                        </div>
                        <Link
                          to={s.is_completed ? `/results/${s.id}` : '/setup'}
                          state={s.is_completed ? undefined : { company: s.company }}
                          className="px-3 py-1.5 bg-theme-surface hover:bg-theme-border border border-theme-border text-theme-text text-xs rounded-lg transition">
                          {s.is_completed ? 'Report' : 'Resume'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Company Stats */}
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-6">
              <h2 className="text-lg font-bold text-theme-text mb-4">Company Practice</h2>
              <CompanyStats companyStats={stats?.company_stats || {}} />
            </div>

            {/* Badges */}
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-6">
              <h2 className="text-lg font-bold text-theme-text mb-4">Achievements</h2>
              {!badges.length ? (
                <p className="text-sm text-theme-text-muted text-center py-3">Complete sessions to unlock badges!</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((b, i) => (
                    <div key={i} className="bg-theme-bg border border-theme-border rounded-xl p-3 text-center">
                      <div className="text-2xl mb-1">{b.icon}</div>
                      <p className="text-xs font-semibold text-theme-text">{b.label}</p>
                      <p className="text-[10px] text-theme-text-muted mt-0.5">{b.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick insights */}
            <div className="bg-theme-surface border border-theme-border rounded-2xl p-6">
              <h2 className="text-lg font-bold text-theme-text mb-4">Quick Insights</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-mono text-theme-text-muted mb-1">Most Practiced Company</p>
                  <p className="text-theme-text font-medium">
                    {stats?.company_stats
                      ? Object.entries(stats.company_stats).sort((a, b) => b[1].attempts - a[1].attempts)[0]?.[0] ?? 'N/A'
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-mono text-theme-text-muted mb-1">Next Step</p>
                  <p className="text-theme-text-muted leading-relaxed">
                    {streak.current_streak > 0
                      ? `Great! You're on a ${streak.current_streak}-day streak. Keep going!`
                      : 'Start an interview today to begin your streak!'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
