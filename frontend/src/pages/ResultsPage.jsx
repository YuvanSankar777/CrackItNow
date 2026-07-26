import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../api/client';

const ResultsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        // Safe to call multiple times — backend returns the existing result.
        try { await interviewAPI.end({ session_id: Number(id) }); } catch { /* already ended */ }
        const { data } = await interviewAPI.results(id);
        setSession(data);
      } catch (e) {
        console.error(e);
        setError('Failed to load report. The interview may still be in progress.');
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, [id]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: 'var(--clay-violet)', animationDelay: `${i * 0.15}s` }} />)}
      </div>
      <p className="clay-ink-faint text-sm clay-display uppercase tracking-widest">Generating report…</p>
    </div>
  );

  if (error) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="clay-ink-soft">{error}</p>
      <button onClick={() => navigate('/setup')} className="clay-btn">Back to setup</button>
    </div>
  );

  if (!session || !session.result) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="clay-ink-soft text-sm">No report found for this session.</p>
      <button onClick={() => navigate('/companies')} className="clay-btn">Start new session</button>
    </div>
  );

  const res = session.result;
  const scorePercentage = (res.overall_score / 10) * 100;
  const scoreColor = res.overall_score >= 8 ? 'var(--clay-mint)' : res.overall_score >= 6 ? 'var(--clay-gold)' : 'var(--clay-coral)';
  const metrics = [
    ['Communication', res.communication_score],
    ['Problem Solving', res.problem_solving_score],
    ['Technical Knowledge', res.technical_score],
    ['Code Quality', res.code_quality_score],
  ];

  return (
    <div className="min-h-screen py-12 md:py-16">
      <div className="container max-w-5xl mx-auto px-4 space-y-7">
        {/* Header */}
        <section className="clay-card p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <span className="clay-eyebrow">Interview report</span>
              <h1 className="clay-display text-4xl md:text-5xl mt-2 mb-2">Your results</h1>
              <p className="clay-display text-sm tracking-widest uppercase clay-ink-faint">
                {session.company || session.role || 'Interview'} · {session.level || 'Mid'} · {session.difficulty || 'General'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest clay-display clay-ink-faint mb-1">Overall score</div>
              <div className="clay-display" style={{ fontSize: 60, lineHeight: 1, color: scoreColor }}>
                {res.overall_score}<span className="text-2xl clay-ink-faint ml-2">/10</span>
              </div>
              <div className="w-full mt-3 rounded-full h-2.5 clay-well" style={{ minWidth: 200 }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${scorePercentage}%`, background: scoreColor }} />
              </div>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="clay-card p-7">
          <h2 className="clay-display text-xl mb-3">Executive summary</h2>
          <p className="clay-ink-soft leading-relaxed">{res.summary || 'No summary available.'}</p>
        </section>

        {/* Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {metrics.map(([label, val]) => (
            <div key={label} className="clay-card-sm p-5">
              <p className="text-[11px] uppercase tracking-widest clay-display clay-ink-faint mb-2">{label}</p>
              <p className="clay-display text-3xl" style={{ color: scoreColor }}>{(val ?? res.overall_score)?.toFixed ? (val ?? res.overall_score).toFixed(1) : (val ?? res.overall_score)}/10</p>
            </div>
          ))}
        </div>

        {/* Strengths & growth */}
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="clay-card p-7">
            <h2 className="clay-display text-xl mb-4">Key strengths</h2>
            <ul className="space-y-3">
              {(res.strengths || 'Excellent communication and approach').split('\n').filter(Boolean).map((s, idx) => (
                <li key={idx} className="flex gap-3 text-sm clay-ink-soft">
                  <span className="clay-display" style={{ color: 'var(--clay-mint)' }}>✓</span>
                  <span>{s.trim()}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="clay-card p-7">
            <h2 className="clay-display text-xl mb-4">Areas for growth</h2>
            <ul className="space-y-3">
              {(res.weaknesses || 'Consider edge-case handling').split('\n').filter(Boolean).map((w, idx) => (
                <li key={idx} className="flex gap-3 text-sm clay-ink-soft">
                  <span className="clay-display" style={{ color: 'var(--clay-coral)' }}>→</span>
                  <span>{w.trim()}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Code analysis */}
        {session.code_snapshots && session.code_snapshots.length > 0 && (
          <section className="clay-card p-7">
            <h2 className="clay-display text-xl mb-4">Code analysis</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {session.code_snapshots.map((snapshot, idx) => (
                <div key={idx} className="clay-well p-4">
                  <p className="text-xs uppercase tracking-widest clay-display mb-1" style={{ color: 'var(--clay-violet)' }}>Question {snapshot.question_number}</p>
                  <p className="text-sm clay-ink-faint mb-2" style={{ fontFamily: 'var(--fm, ui-monospace)' }}>{snapshot.language}</p>
                  {snapshot.complexity_analysis && (
                    <div className="text-xs clay-ink-soft space-y-1">
                      <p>Time: {snapshot.complexity_analysis.time_complexity}</p>
                      <p>Space: {snapshot.complexity_analysis.space_complexity}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendation */}
        {res.recommendation && (
          <section className="clay-card p-7" style={{ background: 'linear-gradient(150deg,#E4DBFA,#DCEEFF)' }}>
            <h2 className="clay-display text-xl mb-3">Next steps & recommendations</h2>
            <p className="text-lg clay-ink-soft leading-relaxed mb-6">{res.recommendation}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/companies')} className="clay-btn flex-1 justify-center">Practice again</button>
              <button onClick={() => navigate('/dashboard')} className="clay-btn-ghost flex-1 justify-center">Back to dashboard</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
