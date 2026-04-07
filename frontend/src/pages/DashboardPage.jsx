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
        // Profile is optional — don't let it block the dashboard
        const [statsRes, streakRes] = await Promise.all([
          interviewAPI.dashboardStats(),
          interviewAPI.dashboardStreak(),
        ]);
        setStats(statsRes.data);
        setStreak(streakRes.data);
        // Profile separately, non-blocking
        try {
          const profileRes = await authAPI.profile();
          setProfile(profileRes.data);
        } catch (_) { /* use auth context user as fallback */ }
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
        <p className="text-gray-500 text-sm font-mono uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="bg-[#111] border border-[#222] rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-gray-500 mb-1">Dashboard</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Welcome back, <span className="text-blue-400">{displayName}</span> 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">Track your interview prep and keep the momentum going.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link to="/companies" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-blue-900/30">
              🏢 Companies
            </Link>
            <button onClick={handleLogout} className="px-4 py-2.5 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] text-gray-400 hover:text-white rounded-xl transition-all text-sm">
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
          <div className="bg-gradient-to-r from-orange-900/30 to-red-900/20 border border-orange-700/30 rounded-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="text-white font-bold text-lg">You're on a {streak.current_streak}-day streak!</p>
                <p className="text-orange-300/70 text-sm">Keep going — your longest streak is {streak.longest_streak} days.</p>
              </div>
            </div>
            <Link to="/companies" className="px-4 py-2 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-600/40 text-orange-200 text-sm font-semibold rounded-xl transition-all shrink-0">
              Continue →
            </Link>
          </div>
        )}

        {/* ─── HEATMAP + STREAK ─── */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">Activity Heatmap</h2>
            <div className="text-right">
              <p className="text-sm font-bold text-white">{streak.current_streak} 🔥</p>
              <p className="text-[11px] text-gray-500">current streak</p>
            </div>
          </div>
          <ActivityHeatmap activity={streak.activity} />
        </div>


        {/* ─── MAIN GRID ─── */}
        <div className="grid xl:grid-cols-[1fr_380px] gap-6">

          {/* Recent Sessions */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Recent Sessions</h2>
              <Link to="/companies" className="text-xs text-blue-400 hover:text-blue-300 transition">+ New Session</Link>
            </div>

            {!stats?.recent_sessions?.length ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-3">🚀</p>
                <p className="text-gray-500 text-sm">No sessions yet. Start your first interview!</p>
                <Link to="/companies" className="inline-block mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition">
                  Get Started
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_sessions.map((s) => {
                  const score = s.result?.overall_score;
                  const scoreColor = score == null ? 'text-gray-500' : score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400';
                  const companyIcon = COMPANY_ICONS[s.company] || '⭐';
                  return (
                    <div key={s.id} className="flex items-center justify-between bg-[#161616] border border-[#222] hover:border-[#333] rounded-xl p-4 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl shrink-0">{companyIcon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {s.company || 'General'} — {s.role || 'General'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.is_completed ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                              {s.is_completed ? 'Completed' : 'In Progress'}
                            </span>
                            {s.difficulty && <span className="text-[10px] text-gray-600">{s.difficulty}</span>}
                            <span className="text-[10px] text-gray-600">{formatDate(s.start_time)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-3">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${scoreColor}`}>
                            {score != null ? `${score}/10` : '—'}
                          </p>
                          <p className="text-[10px] text-gray-600">score</p>
                        </div>
                        <Link to={s.is_completed ? `/results/${s.id}` : '/interview'}
                          className="px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] text-gray-300 text-xs rounded-lg transition opacity-0 group-hover:opacity-100">
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
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Company Practice</h2>
              <CompanyStats companyStats={stats?.company_stats || {}} />
            </div>

            {/* Badges */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Achievements</h2>
              {!badges.length ? (
                <p className="text-sm text-gray-600 text-center py-3">Complete sessions to unlock badges!</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((b, i) => (
                    <div key={i} className="bg-[#161616] border border-[#252525] rounded-xl p-3 text-center hover:border-yellow-500/30 transition-colors">
                      <div className="text-2xl mb-1">{b.icon}</div>
                      <p className="text-xs font-semibold text-white">{b.label}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{b.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick insights */}
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Quick Insights</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500 mb-1">Most Practiced Company</p>
                  <p className="text-white font-medium">
                    {stats?.company_stats
                      ? Object.entries(stats.company_stats).sort((a, b) => b[1].attempts - a[1].attempts)[0]?.[0] ?? 'N/A'
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-mono text-gray-500 mb-1">Next Step</p>
                  <p className="text-gray-400 leading-relaxed">
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