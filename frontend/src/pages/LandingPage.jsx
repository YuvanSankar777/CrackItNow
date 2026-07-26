import React from 'react';
import { useNavigate } from 'react-router-dom';
import heroImg from '../assets/hero-cut.png';

const FEATURES = [
  {
    title: 'Interactive Coding IDE',
    body: 'Write and run code in real time — Python, Java, C++, JavaScript and more. Instant results on every solution.',
    dot: 'var(--clay-violet)',
    icon: 'M8 20h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z M12 18h.01',
  },
  {
    title: 'AI-Powered Interviewer',
    body: 'A voice-led AI panelist asks contextual questions about your answers and code, and adapts the difficulty as you go.',
    dot: 'var(--clay-coral)',
    icon: 'M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5h.01M9.663 17h4.673',
  },
  {
    title: 'Detailed Analysis',
    body: 'Deep insight on time & space complexity, optimization tips, and a scored report after every session.',
    dot: 'var(--clay-mint)',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
];

const CTA_POINTS = ['Adaptive difficulty levels', 'Real-time code evaluation', 'Voice interaction support', 'Performance analytics'];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50" style={{ background: 'linear-gradient(180deg,rgba(240,233,255,.9),rgba(240,233,255,.5))', backdropFilter: 'blur(14px)' }}>
        <nav className="container mx-auto px-6 h-[68px] flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <span className="w-10 h-10 rounded-[13px] grid place-items-center text-white"
              style={{ background: 'linear-gradient(145deg,#8158FF,var(--clay-violet-deep))', boxShadow: '5px 6px 14px rgba(112,80,208,.4),-3px -3px 9px rgba(255,255,255,.7),inset 2px 2px 5px rgba(255,255,255,.4)' }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M6 9l-3 3 3 3M18 9l3 3-3 3M13 5l-2 14" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="clay-display text-xl clay-ink">CrackItNow</span>
          </div>

          <div className="hidden md:flex items-center gap-9">
            {['Features', 'About', 'Pricing', 'Contact'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="clay-display text-sm clay-ink-soft hover:text-[var(--clay-violet)] transition-colors">{item}</a>
            ))}
          </div>

          <button onClick={() => navigate('/auth')} className="clay-btn" style={{ padding: '11px 22px', fontSize: 14 }}>
            Login
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </nav>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="container mx-auto px-6 pt-14 pb-20 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="clay-eyebrow">AI Mock Interviews</span>
            <h1 className="clay-display leading-[1.02] mt-3 mb-5" style={{ fontSize: 'clamp(40px,5.6vw,66px)' }}>
              Walk in <span className="clay-grad-text">already inside the room.</span>
            </h1>
            <p className="text-lg clay-ink-soft mb-8" style={{ maxWidth: '46ch' }}>
              Voice-led mock interviews with an AI panelist, a live coding room, and instant, honest feedback — in a calm, tactile space that keeps you focused.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/auth')} className="clay-btn">Start a mock interview</button>
              <a href="#features" className="clay-btn-ghost">See how it works</a>
            </div>
            <div className="flex flex-wrap gap-3 mt-9">
              {[['10', 'company tracks'], ['12+', 'languages'], ['Real-time', 'scoring']].map(([b, t]) => (
                <span key={t} className="clay-pill"><b style={{ color: 'var(--clay-violet)', fontSize: 15 }}>{b}</b> {t}</span>
              ))}
            </div>
          </div>

          <div className="relative flex justify-center">
            <img src={heroImg} alt="A developer at a laptop taking an AI mock interview"
              className="clay-floaty w-full max-w-[620px]" style={{ filter: 'drop-shadow(0 28px 36px rgba(90,50,190,.30))' }} />
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="container mx-auto px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="clay-eyebrow">Why CrackItNow</span>
            <h2 className="clay-display mt-3 mb-3 leading-tight" style={{ fontSize: 'clamp(28px,4vw,42px)' }}>Everything you need to prepare, in one calm room.</h2>
            <p className="clay-ink-soft text-lg">AI-powered coaching that feels like the real thing — without the pressure.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-7">
            {FEATURES.map((f) => (
              <div key={f.title} className="clay-card p-8">
                <span className="w-14 h-14 rounded-[16px] grid place-items-center mb-5 clay-well" style={{ color: 'var(--clay-violet)' }}>
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
                </span>
                <h3 className="clay-display text-xl clay-ink mb-2">{f.title}</h3>
                <p className="clay-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="clay-display leading-tight mb-4" style={{ fontSize: 'clamp(26px,3.4vw,38px)' }}>Ready to master interviews?</h2>
              <p className="text-lg clay-ink-soft mb-6">Start practicing with the AI interviewer today. Get feedback, track your streak, and build real confidence for your next round.</p>
              <ul className="flex flex-col gap-3">
                {CTA_POINTS.map((p) => (
                  <li key={p} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full grid place-items-center shrink-0" style={{ background: 'linear-gradient(145deg,var(--clay-mint),#12a97a)', boxShadow: '3px 3px 8px rgba(31,199,154,.35)' }}>
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                    </span>
                    <span className="clay-ink">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="clay-card p-8">
              <h3 className="clay-display text-2xl clay-ink mb-3">Get started now</h3>
              <p className="clay-ink-soft mb-6">Begin a free interview session and see how AI-powered coaching transforms your prep.</p>
              <button onClick={() => navigate('/auth')} className="clay-btn w-full justify-center mb-3">Start practicing</button>
              <p className="text-xs clay-ink-faint text-center">No credit card required · Free to try</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="container mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="text-xs clay-ink-faint">© 2026 CrackItNow. All rights reserved.</p>
        <div className="flex gap-6 text-xs clay-ink-faint">
          <a href="#" className="hover:text-[var(--clay-violet)]">Privacy Policy</a>
          <a href="#" className="hover:text-[var(--clay-violet)]">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
