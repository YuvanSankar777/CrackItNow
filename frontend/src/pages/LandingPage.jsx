import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    setMousePos({ x: clientX - left, y: clientY - top });
  };

  return (
    <div className="min-h-screen flex flex-col bg-theme-bg selection:bg-theme-accent selection:text-white">
      {/* ── Navigation ── */}
      <header className="bg-white border-b border-theme-border/50 sticky top-0 z-50">
        <nav className="container mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.png" alt="DevVox AI Logo" className="w-10 h-10 object-contain shadow-lg shadow-theme-accent/10" />
            <span className="text-xl font-bold tracking-tight text-theme-text uppercase">DevVox AI</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            {['Features', 'About', 'Pricing', 'Contact'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-semibold text-theme-text hover:text-theme-accent transition-colors">
                {item}
              </a>
            ))}
          </div>

          <button
            onClick={() => navigate('/auth')}
            className="group flex items-center gap-2 bg-[#1e40af] hover:bg-theme-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md shadow-theme-accent/20 active:scale-95"
          >
            Login
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </nav>
      </header>

      <main className="flex-1">
        <section
          onMouseMove={handleMouseMove}
          className="bg-hero-bg py-20 lg:py-32 relative overflow-hidden group"
        >
          {/* ── Cursor Follow Animation ── */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(59, 130, 246, 0.08), transparent 80%)`
            }}
          />

          <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
            <div className="max-w-2xl animate-slide-up">
              <h1 className="text-5xl lg:text-7xl font-serif text-white! leading-[1.1] mb-8 font-bold [text-shadow:0_1px_20px_rgba(255,255,255,0.1)]">
                Master your next <br />
                <span className="text-theme-accent tracking-tight">Technical Interview</span>
              </h1>
              <p className="text-lg lg:text-xl text-white mb-12 leading-relaxed font-normal opacity-100">
                Experience the first AI-driven platform that simulates high-stakes technical interviews.
                Speak naturally, solve problems in our IDE, and receive instant, deep-learning feedback.
              </p>

              <div className="flex flex-wrap gap-5">
                <button
                  onClick={() => navigate('/auth')}
                  className="bg-white text-hero-bg hover:bg-gray-100 px-10 py-4 rounded-lg font-bold text-base transition-all transform hover:-translate-y-1 shadow-xl active:scale-95"
                >
                  Get Started
                </button>
                <button
                  className="border-2 border-theme-accent/30 text-hero-text hover:bg-theme-accent/10 px-10 py-4 rounded-lg font-bold text-base transition-all transform hover:-translate-y-1 active:scale-95"
                >
                  Learn More
                </button>
              </div>
            </div>

            {/* AI Neural Decoration (CSS only, no images) */}
            <div className="hidden lg:flex justify-center items-center relative">
              <div className="neural-pulse">
                <div className="glow-orb" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    {/* Concentric Decorative Rings */}
                    {[1, 0.7, 0.4].map((scale, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 border-2 border-theme-accent/20 rounded-full animate-pulse"
                        style={{ transform: `scale(${scale})`, animationDelay: `${i * 0.5}s` }}
                      />
                    ))}
                    {/* Orbiting Elements */}
                    <div className="absolute inset-0 animate-orbit">
                      <div className="w-4 h-4 bg-theme-accent rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                    </div>
                    {/* Center Core */}
                    <div className="absolute inset-4 bg-theme-accent/10 backdrop-blur-xl rounded-full border border-theme-accent/30 flex items-center justify-center shadow-inner">
                      <div className="w-12 h-12 bg-white/10 rounded-full animate-breathe" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Section ── */}
        <section className="bg-theme-bg py-20 border-t border-theme-border">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-serif text-theme-text mb-4 font-bold">Why Choose DevVox AI?</h2>
              <p className="text-theme-text-muted max-w-2xl mx-auto text-lg">
                Experience the future of technical interview preparation with AI-powered coaching.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-theme-surface rounded-xl p-8 border border-theme-border hover:border-theme-accent transition-all hover:shadow-lg">
                <div className="w-14 h-14 bg-theme-accent/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 20h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-theme-text mb-2">Interactive Coding IDE</h3>
                <p className="text-theme-text-muted">
                  Write and test code in real-time with support for Python, Java, C++, and JavaScript. Get instant feedback on your solutions.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-theme-surface rounded-xl p-8 border border-theme-border hover:border-theme-accent transition-all hover:shadow-lg">
                <div className="w-14 h-14 bg-theme-accent/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-theme-text mb-2">AI-Powered Interviewer</h3>
                <p className="text-theme-text-muted">
                  Our advanced AI mimics real interviewers, asking contextual questions based on your code and providing personalized feedback.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-theme-surface rounded-xl p-8 border border-theme-border hover:border-theme-accent transition-all hover:shadow-lg">
                <div className="w-14 h-14 bg-theme-accent/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-theme-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-theme-text mb-2">Detailed Analysis</h3>
                <p className="text-theme-text-muted">
                  Get in-depth insights on time complexity, space complexity, and optimization suggestions for every solution.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="bg-theme-surface py-20 border-t border-theme-border">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="space-y-6">
                <h2 className="text-4xl font-serif font-bold text-theme-text">Ready to Master Interviews?</h2>
                <p className="text-lg text-theme-text-muted leading-relaxed">
                  Start practicing with our AI interviewer today. Get feedback, track progress, and build confidence for your next technical interview.
                </p>
                <ul className="space-y-3">
                  {['Adaptive difficulty levels', 'Real-time code evaluation', 'Voice interaction support', 'Performance analytics'].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-theme-accent rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-theme-text">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right CTA Card */}
              <div className="bg-theme-bg rounded-2xl p-8 border border-theme-border">
                <h3 className="text-2xl font-bold text-theme-text mb-4">Get Started Now</h3>
                <p className="text-theme-text-muted mb-6">
                  Start your free interview session and see how AI-powered coaching can transform your preparation.
                </p>
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full bg-theme-accent hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 mb-3"
                >
                  Start Practicing
                </button>
                <p className="text-xs text-theme-text-muted text-center">No credit card required • Free to try</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white py-8 border-t border-theme-border/50">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-theme-text-muted">© 2024 DevVox AI. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-theme-text-muted">
            <a href="#" className="hover:text-theme-accent">Privacy Policy</a>
            <a href="#" className="hover:text-theme-accent">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
