import React from 'react';
import { useNavigate } from 'react-router-dom';

const ThemeSettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: 'linear-gradient(180deg,rgba(240,233,255,.9),rgba(240,233,255,.5))', backdropFilter: 'blur(14px)' }}>
        <div className="container mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="clay-btn-ghost" style={{ padding: '9px 12px' }} title="Go back" aria-label="Go back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="clay-display text-2xl">Theme Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <section className="mb-10">
          <span className="clay-eyebrow">Appearance</span>
          <h2 className="clay-display text-xl mt-2 mb-1">How CrackItNow looks</h2>
          <p className="clay-ink-soft mb-6">CrackItNow uses a warm, light “Soft Clay” theme designed to keep you calm and focused.</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Light (active) */}
            <div className="clay-card p-6" style={{ outline: '2px solid var(--clay-violet)', outlineOffset: 2 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="clay-display text-lg">Soft Clay (Light)</h3>
                <span className="w-6 h-6 rounded-full grid place-items-center" style={{ background: 'linear-gradient(145deg,var(--clay-violet),var(--clay-violet-deep))' }}>
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                </span>
              </div>
              <div className="rounded-[14px] p-3 clay-well space-y-2">
                <div className="h-3 rounded w-3/4" style={{ background: 'linear-gradient(90deg,var(--clay-violet),var(--clay-peri))' }}></div>
                <div className="h-2 rounded w-full" style={{ background: 'rgba(109,83,246,.18)' }}></div>
                <div className="h-2 rounded w-5/6" style={{ background: 'rgba(109,83,246,.12)' }}></div>
              </div>
              <p className="clay-ink-soft text-sm mt-3">Bright, tactile, and easy on the eyes. Currently active.</p>
            </div>

            {/* Dark (coming soon, disabled) */}
            <div className="clay-card p-6 opacity-60 cursor-not-allowed" aria-disabled="true">
              <div className="flex items-center justify-between mb-4">
                <h3 className="clay-display text-lg">Dark</h3>
                <span className="clay-pill" style={{ padding: '4px 10px', fontSize: 11 }}>Coming soon</span>
              </div>
              <div className="rounded-[14px] p-3 space-y-2" style={{ background: '#2A2350', boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.4)' }}>
                <div className="h-3 rounded w-3/4" style={{ background: '#4A3F7A' }}></div>
                <div className="h-2 rounded w-full" style={{ background: '#3A3363' }}></div>
                <div className="h-2 rounded w-5/6" style={{ background: '#3A3363' }}></div>
              </div>
              <p className="clay-ink-faint text-sm mt-3">A dark variant is in the works.</p>
            </div>
          </div>
        </section>

        <section className="clay-card p-6">
          <h3 className="clay-display mb-3">About the theme</h3>
          <ul className="space-y-2 text-sm clay-ink-soft">
            <li>• CrackItNow ships with the light Soft Clay theme for a calm, focused feel.</li>
            <li>• Molded surfaces and soft depth keep the interface friendly and readable.</li>
            <li>• A dark variant is planned for a future update.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default ThemeSettingsPage;
