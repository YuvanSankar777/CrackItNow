import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { interviewAPI } from '../api/client';

const SetupPageNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const company = location.state?.company || null;
  const [loading, setLoading] = useState(false);
  const [playingPreview, setPlayingPreview] = useState(null);
  const audioRef = useRef(null);

  const [config, setConfig] = useState({
    difficulty: 'medium',
    aiVoice: 'female',
    aiGender: 'female',
  });

  const difficulties = [
    { id: 'easy', label: 'Easy', description: 'Beginner friendly problems' },
    { id: 'medium', label: 'Medium', description: 'Intermediate challenges' },
    { id: 'hard', label: 'Hard', description: 'Expert level problems' },
  ];

  const voiceOptions = [
    {
      id: 'female',
      label: 'Female Voice',
      genders: ['female'],
      color: 'from-pink-500 to-rose-500',
      previewText: 'Hello! I\'m your female interviewer. Let\'s explore your technical expertise today.',
    },
    {
      id: 'male',
      label: 'Male Voice',
      genders: ['male'],
      color: 'from-blue-500 to-cyan-500',
      previewText: 'Hi there! I\'m your male interviewer. Ready to dive into some coding challenges?',
    },
    {
      id: 'neutral',
      label: 'Neutral Voice',
      genders: ['neutral'],
      color: 'from-purple-500 to-indigo-500',
      previewText: 'Greetings. This is your neutral voice interviewer. Let\'s begin the technical assessment.',
    },
  ];

  const playVoicePreview = async (voiceId) => {
    setPlayingPreview(voiceId);
    try {
      const voiceOption = voiceOptions.find(v => v.id === voiceId);
      const previewText = voiceOption?.previewText || 'Welcome to the interview.';
      
      // Call backend to generate TTS preview
      const response = await interviewAPI.tts(previewText);
      if (audioRef.current && response.data.audio_url) {
        audioRef.current.src = response.data.audio_url;
        audioRef.current.play();
        audioRef.current.onended = () => setPlayingPreview(null);
      }
    } catch (error) {
      console.error('Failed to play voice preview:', error);
      setPlayingPreview(null);
    }
  };

  const handleStart = async () => {
    // Persist voice mode so InterviewPage picks it up
    sessionStorage.setItem('voiceMode', config.aiVoice);
    setLoading(true);
    try {
      const { data } = await interviewAPI.start({
        role: 'fullstack',
        level: 'mid',
        type: 'coding',
        difficulty: config.difficulty,
        max_questions: 5,
        ai_voice: config.aiVoice,
        ai_gender: config.aiGender,
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
      <audio ref={audioRef} />

      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-theme-text">Interview Setup</h1>
          {company && <p className="text-sm font-medium text-theme-accent mt-1">Company: {company}</p>}
          <p className="text-theme-text-muted">Configure your interview experience</p>
        </div>

        {/* Card */}
        <div className="bg-theme-surface rounded-2xl shadow-lg p-8 space-y-8 border border-theme-border">
          {/* Difficulty Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-theme-text">Select Difficulty</h2>
            <p className="text-sm text-theme-text-muted">Choose the problem difficulty level</p>

            <div className="grid grid-cols-3 gap-4">
              {difficulties.map((diff) => (
                <button
                  key={diff.id}
                  onClick={() => setConfig({ ...config, difficulty: diff.id })}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    config.difficulty === diff.id
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

          {/* AI Voice Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-theme-text">Select AI Voice</h2>
            <p className="text-sm text-theme-text-muted">Customize your interviewer's voice</p>

            <div className="grid grid-cols-1 gap-4">
              {voiceOptions.map((voice) => (
                <div
                  key={voice.id}
                  className={`p-6 rounded-lg border-2 transition-all cursor-pointer ${
                    config.aiVoice === voice.id
                      ? 'border-theme-accent bg-theme-accent/10'
                      : 'border-theme-border hover:border-theme-border/80'
                  }`}
                  onClick={() => setConfig({ ...config, aiVoice: voice.id, aiGender: voice.id })}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div
                        className={`w-16 h-16 rounded-full bg-linear-to-br ${voice.color} flex items-center justify-center text-2xl shadow-lg`}
                      >
                        {voice.id === 'female' && '👩'}
                        {voice.id === 'male' && '👨'}
                        {voice.id === 'neutral' && '🤖'}
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="font-bold text-theme-text">{voice.label}</div>
                        <div className="text-xs text-theme-text-muted">Professional interviewer voice</div>
                      </div>
                    </div>

                    {/* Play Preview */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playVoicePreview(voice.id);
                      }}
                      disabled={playingPreview !== null}
                      className="p-3 bg-theme-accent hover:bg-blue-600 disabled:opacity-50 text-white rounded-full transition-all"
                    >
                      {playingPreview === voice.id ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-4">
            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full py-4 bg-theme-accent hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all text-lg"
            >
              {loading ? 'Starting Interview...' : 'Begin Interview'}
            </button>
          </div>

          {/* Quick Settings */}
          <div className="text-xs text-theme-text-muted text-center space-y-1 pt-4 border-t border-theme-border">
            <p>✓ Webcam will be activated during the interview</p>
            <p>✓ Tab switching will be monitored</p>
            <p>✓ Your performance will be analyzed in real-time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPageNew;
