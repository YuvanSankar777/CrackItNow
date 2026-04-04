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
        // First, try to end the interview and generate the report
        // (safe to call multiple times — backend returns existing result)
        try {
          await interviewAPI.end({ session_id: Number(id) });
        } catch {
          // Already ended or no evaluations yet — that's fine
        }

        // Now fetch the session with the result
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
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-theme-text-muted animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-theme-text-muted text-sm font-mono uppercase tracking-widest">Generating Report...</p>
    </div>
  );

  if (error) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-theme-text-muted">{error}</p>
      <button onClick={() => navigate('/setup')} className="btn-primary">Back to Setup</button>
    </div>
  );

  if (!session || !session.result) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-theme-text-muted text-sm">No report found for this session.</p>
      <button onClick={() => navigate('/setup')} className="btn-primary">Start New Session</button>
    </div>
  );

  const res = session.result;
  const scorePercentage = (res.overall_score / 10) * 100;
  const scoreColor = res.overall_score >= 8 ? 'text-green-500' : res.overall_score >= 6 ? 'text-yellow-500' : 'text-orange-500';

  return (
    <div className="min-h-screen bg-theme-bg py-12 md:py-20">
      <div className="container max-w-6xl space-y-8">
        {/* Header */}
        <section className="card-premium overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif mb-2 text-theme-text">Interview Results</h1>
              <p className="font-mono text-sm tracking-widest uppercase text-theme-text-muted">
                {session.role || 'Interview'} • {session.level || 'Mid'} Level • {session.difficulty || 'General'}
              </p>
            </div>
            <div className="text-right space-y-2">
              <div className="text-sm uppercase tracking-widest font-mono text-theme-text-muted">Overall Score</div>
              <div className={`text-6xl font-serif ${scoreColor}`}>
                {res.overall_score}
                <span className="text-2xl text-theme-text-muted ml-2">/10</span>
              </div>
              <div className="w-full bg-theme-surface rounded-full h-2 border border-theme-border">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    res.overall_score >= 8 ? 'bg-green-500' : 
                    res.overall_score >= 6 ? 'bg-yellow-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${scorePercentage}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Executive Summary */}
        <section className="card-premium">
          <h2 className="text-xl font-bold mb-4 text-theme-text flex items-center gap-2">
            <svg className="w-5 h-5 text-theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Executive Summary
          </h2>
          <p className="text-theme-text-muted leading-relaxed">{res.summary || 'No summary available.'}</p>
        </section>

        {/* Performance Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-premium">
            <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-2">Communication</p>
            <p className={`text-3xl font-serif ${scoreColor}`}>{res.communication_score?.toFixed(1) || res.overall_score}/10</p>
          </div>
          <div className="card-premium">
            <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-2">Problem Solving</p>
            <p className={`text-3xl font-serif ${scoreColor}`}>{res.problem_solving_score?.toFixed(1) || res.overall_score}/10</p>
          </div>
          <div className="card-premium">
            <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-2">Technical Knowledge</p>
            <p className={`text-3xl font-serif ${scoreColor}`}>{res.technical_score?.toFixed(1) || res.overall_score}/10</p>
          </div>
          <div className="card-premium">
            <p className="text-xs uppercase tracking-widest font-mono text-theme-text-muted mb-2">Code Quality</p>
            <p className={`text-3xl font-serif ${scoreColor}`}>{res.code_quality_score?.toFixed(1) || res.overall_score}/10</p>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid lg:grid-cols-2 gap-8">
          <section className="card-premium">
            <h2 className="text-xl font-bold mb-4 text-theme-text flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.488 5.951 1.488a1 1 0 001.169-1.409l-7-14z" />
              </svg>
              Key Strengths
            </h2>
            <ul className="space-y-3">
              {(res.strengths || 'Excellent communication and approach').split('\n').filter(Boolean).map((strength, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-theme-text-muted">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>{strength.trim()}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card-premium">
            <h2 className="text-xl font-bold mb-4 text-theme-text flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.816 4.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm2.414 5.002a1 1 0 00-.447-1.745L10 7.5l-5.783 2.257a1 1 0 00-.447 1.745l2.8 2.42a1 1 0 00.211 1.381L10 16.944l2.219-2.141a1 1 0 00.211-1.381l2.8-2.42z" clipRule="evenodd" />
              </svg>
              Areas for Growth
            </h2>
            <ul className="space-y-3">
              {(res.weaknesses || 'Consider edge case handling').split('\n').filter(Boolean).map((weakness, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-theme-text-muted">
                  <span className="text-orange-500 font-bold">→</span>
                  <span>{weakness.trim()}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Code Analysis */}
        {session.code_snapshots && session.code_snapshots.length > 0 && (
          <section className="card-premium">
            <h2 className="text-xl font-bold mb-4 text-theme-text flex items-center gap-2">
              <svg className="w-5 h-5 text-theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4m0 6l-4 4m-4-4l-4-4" />
              </svg>
              Code Analysis
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {session.code_snapshots.map((snapshot, idx) => (
                <div key={idx} className="bg-theme-bg rounded border border-theme-border p-4">
                  <p className="text-xs uppercase tracking-widest font-mono text-theme-accent mb-2">Question {snapshot.question_number}</p>
                  <p className="text-sm text-theme-text-muted mb-2 font-mono">{snapshot.language}</p>
                  {snapshot.complexity_analysis && (
                    <div className="text-xs text-theme-text-muted space-y-1">
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
          <section className="card-premium border-2 border-theme-accent/30">
            <h2 className="text-xl font-bold mb-4 text-theme-text flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Next Steps & Recommendations
            </h2>
            <p className="text-lg text-theme-text-muted leading-relaxed mb-6">{res.recommendation}</p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => navigate('/setup')}
                className="btn-primary flex-1"
              >
                Practice Again
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-secondary flex-1"
              >
                Back to Dashboard
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
