import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { interviewAPI } from '../api/client';

const SetupPageNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const company = location.state?.company || null;
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');

  // If the user lands on /setup without first picking a company, bounce them
  // back to /companies so the next screen has clear context.
  useEffect(() => {
    if (!company) navigate('/companies', { replace: true });
  }, [company, navigate]);

  const difficulties = [
    { id: 'easy',   label: 'Easy',         description: 'Beginner friendly problems' },
    { id: 'medium', label: 'Intermediate', description: 'Mid-level challenges' },
    { id: 'hard',   label: 'Difficult',    description: 'Expert level problems' },
  ];

  const handleStart = async () => {
    setLoading(true);
    try {
      const { data } = await interviewAPI.start({
        role: 'fullstack',
        level: 'mid',
        type: 'coding',
        difficulty,
        max_questions: 5,
        company: company,
      });
      navigate('/interview', { state: { session: data } });
    } catch (e) {
      console.error('Start interview failed:', e);
      const msg = e?.response?.data?.error || e?.message || 'Failed to start interview.';
      alert(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-theme-text-muted font-mono">Interview Setup</p>
          <h1 className="text-4xl font-bold text-theme-text">
            {company || 'General'} <span className="text-theme-accent">Interview</span>
          </h1>
          <p className="text-theme-text-muted">Choose a difficulty to begin</p>
        </div>

        <div className="bg-theme-surface rounded-2xl shadow-lg p-8 space-y-8 border border-theme-border">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-theme-text">Select Difficulty</h2>
            <p className="text-sm text-theme-text-muted">Choose the problem difficulty level</p>

            <div className="grid grid-cols-3 gap-4">
              {difficulties.map((diff) => (
                <button
                  key={diff.id}
                  onClick={() => setDifficulty(diff.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    difficulty === diff.id
                      ? 'border-theme-accent bg-theme-accent/10'
                      : 'border-theme-border hover:border-theme-border/80'
                  }`}
                >
                  <div className="font-bold text-theme-text mb-1">{diff.label}</div>
                  <div className="text-xs text-theme-text-muted">{diff.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full py-4 bg-theme-accent hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all text-lg"
            >
              {loading ? 'Starting Interview...' : 'Begin Interview'}
            </button>
          </div>

          <div className="text-xs text-theme-text-muted text-center space-y-1 pt-4 border-t border-theme-border">
            <p>Webcam will be activated during the interview</p>
            <p>Tab switching will be monitored</p>
            <p>Your performance will be analyzed in real-time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPageNew;
