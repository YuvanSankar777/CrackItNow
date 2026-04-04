import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewAPI } from '../api/client';

const SetupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    role: 'fullstack',
    level: 'mid',
    type: 'mixed',
    difficulty: 'medium',
    max_questions: 5
  });

  const roles = [
    { id: 'frontend', label: 'Frontend' },
    { id: 'backend', label: 'Backend' },
    { id: 'fullstack', label: 'Full Stack' },
    { id: 'general', label: 'General SWE' }
  ];

  const handleStart = async () => {
    setLoading(true);
    try {
      const { data } = await interviewAPI.start(config);
      // Pass the initial context to Interview via state
      navigate('/interview', { state: { session: data }});
    } catch (e) {
      console.error('Start interview failed:', e);
      const msg = e?.response?.data?.error || e?.message || 'Failed to start interview.';
      alert(msg);
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl min-h-screen py-20 flex flex-col justify-center animate-fade">
      <h1 className="text-4xl font-serif mb-2">Configure Interview</h1>
      <p className="text-theme-text-muted mb-12">Tailor the AI to your target role and experience level.</p>
      
      <div className="card-premium space-y-10">
        
        {/* Role Selection */}
        <div>
          <label className="text-xs uppercase tracking-widest text-theme-text-muted font-mono block mb-4">Target Role</label>
          <div className="flex flex-wrap gap-3">
            {roles.map(r => (
              <button 
                key={r.id}
                onClick={() => setConfig({...config, role: r.id})}
                className={`py-2 px-5 rounded-full text-sm border transition-all ${config.role === r.id ? 'bg-theme-text text-theme-surface border-theme-text' : 'border-theme-text-muted/30 text-theme-text-muted hover:border-theme-text-muted'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Level Selection */}
          <div>
            <label className="text-xs uppercase tracking-widest text-theme-text-muted font-mono block mb-4">Experience</label>
            <select 
              value={config.level} 
              onChange={e => setConfig({...config, level: e.target.value})}
              className="input-premium appearance-none"
            >
              <option value="junior">Junior</option>
              <option value="mid">Mid-Level</option>
              <option value="senior">Senior</option>
            </select>
          </div>
          
          {/* Type Selection */}
          <div>
            <label className="text-xs uppercase tracking-widest text-theme-text-muted font-mono block mb-4">Focus Area</label>
            <select 
              value={config.type} 
              onChange={e => setConfig({...config, type: e.target.value})}
              className="input-premium appearance-none"
            >
              <option value="technical">Technical Only</option>
              <option value="behavioral">Behavioral Only</option>
              <option value="mixed">Mixed</option>
              <option value="coding">Coding focus</option>
            </select>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5">
          <button 
            onClick={handleStart} 
            disabled={loading}
            className="btn-primary w-full h-14 text-base"
          >
            {loading ? 'Initializing Interface...' : 'Begin Session'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
