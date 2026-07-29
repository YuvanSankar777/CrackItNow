import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { interviewAPI } from '../api/client';

const SetupPageNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const company = location.state?.company || null;
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [round, setRound] = useState('mixed');

  const rounds = [
    { id: 'mixed',      label: 'Technical + HR', description: 'Theory, scenario coding & HR' },
    { id: 'technical',  label: 'CS Fundamentals', description: 'OOP, DBMS, OS, CN, Java theory' },
    { id: 'coding',     label: 'Coding',          description: 'Problems in the online compiler' },
    { id: 'behavioral', label: 'HR / Behavioral', description: 'Intro, projects, bond, relocation' },
  ];

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
        type: round,
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

  const logo = company ? `https://www.google.com/s2/favicons?domain=${company.toLowerCase().replace(/\s+/g, '')}.com&sz=128` : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <span className="clay-eyebrow">Interview Setup</span>
          <div className="flex items-center justify-center gap-3 mt-3">
            {logo && (
              <span className="w-12 h-12 rounded-[15px] grid place-items-center clay-well">
                <img src={logo} alt="" className="w-6 h-6" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </span>
            )}
            <h1 className="clay-display text-4xl">
              {company || 'General'} <span className="clay-grad-text">Interview</span>
            </h1>
          </div>
          <p className="clay-ink-soft mt-2">Choose a difficulty to begin</p>
        </div>

        <div className="clay-card p-8">
          <h2 className="clay-display text-xl mb-1">Interview round</h2>
          <p className="text-sm clay-ink-soft mb-5">Pick which kind of round you want to practice.</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {rounds.map((r) => {
              const on = round === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRound(r.id)}
                  className={`clay-seg p-4 rounded-[18px] text-left ${on ? 'clay-seg-on' : ''}`}
                  style={!on ? { background: 'linear-gradient(160deg,var(--clay-surface-2),var(--clay-surface))', boxShadow: 'var(--clay-shadow-sm)' } : undefined}
                >
                  <div className="clay-display mb-1" style={{ color: on ? '#fff' : 'var(--clay-ink)' }}>{r.label}</div>
                  <div className="text-xs" style={{ color: on ? 'rgba(255,255,255,.85)' : 'var(--clay-ink-faint)' }}>{r.description}</div>
                </button>
              );
            })}
          </div>

          <h2 className="clay-display text-xl mb-1">Select difficulty</h2>
          <p className="text-sm clay-ink-soft mb-5">Pick how challenging the problems should be.</p>

          <div className="grid grid-cols-3 gap-4">
            {difficulties.map((diff) => {
              const on = difficulty === diff.id;
              return (
                <button
                  key={diff.id}
                  onClick={() => setDifficulty(diff.id)}
                  className={`clay-seg p-4 rounded-[18px] text-center ${on ? 'clay-seg-on' : ''}`}
                  style={!on ? { background: 'linear-gradient(160deg,var(--clay-surface-2),var(--clay-surface))', boxShadow: 'var(--clay-shadow-sm)' } : undefined}
                >
                  <div className="clay-display mb-1" style={{ color: on ? '#fff' : 'var(--clay-ink)' }}>{diff.label}</div>
                  <div className="text-xs" style={{ color: on ? 'rgba(255,255,255,.85)' : 'var(--clay-ink-faint)' }}>{diff.description}</div>
                </button>
              );
            })}
          </div>

          <button onClick={handleStart} disabled={loading} className="clay-btn w-full justify-center mt-8 text-lg disabled:opacity-60">
            {loading ? 'Starting interview…' : 'Begin interview →'}
          </button>

          <div className="text-xs clay-ink-faint text-center mt-6 pt-5 flex flex-col gap-1" style={{ borderTop: '1px solid var(--clay-line)' }}>
            <p>Webcam will be activated during the interview</p>
            <p>Tab switching will be monitored</p>
            <p>Your performance is analyzed in real time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPageNew;
