import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', passwordConfirm: '' });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (formData.password !== formData.passwordConfirm) { alert('Passwords do not match!'); return; }
        await register(formData.name, formData.email, formData.password, formData.passwordConfirm);
      }
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.password?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Authentication failed. Check your credentials.';
      alert(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-stretch">
      {/* ── Left: branding panel ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-12 lg:p-24 relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg,#7A50F5,#5528DC 60%,#8158FF)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(600px 400px at 20% 15%, rgba(255,255,255,.18), transparent 60%), radial-gradient(500px 400px at 90% 90%, rgba(255,138,91,.35), transparent 60%)' }} />
        <div className="relative z-10 text-center max-w-lg">
          <span className="w-16 h-16 rounded-[20px] grid place-items-center mx-auto mb-6 text-white"
            style={{ background: 'rgba(255,255,255,.14)', boxShadow: 'inset 2px 2px 6px rgba(255,255,255,.25), 6px 8px 18px rgba(0,0,0,.15)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8"><path d="M6 9l-3 3 3 3M18 9l3 3-3 3M13 5l-2 14" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <h1 className="clay-display text-4xl lg:text-5xl leading-tight mb-4" style={{ color: '#fff', WebkitTextFillColor: '#fff' }}>Welcome to CrackItNow</h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,.85)' }}>Voice-led AI mock interviews, a live coding room, and honest feedback — master your next round.</p>
          <div className="flex items-end justify-center gap-1.5 h-16 mt-10">
            {[...Array(13)].map((_, i) => (
              <span key={i} className="w-2 rounded-full clay-floaty" style={{ background: 'rgba(255,255,255,.5)', height: `${25 + (i * 17 % 65)}%`, animationDelay: `${i * 0.12}s`, animationDuration: '2.4s' }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          {/* toggle */}
          <div className="clay-well p-1.5 flex mb-9 rounded-[16px]">
            {[['Login', true], ['Register', false]].map(([label, val]) => (
              <button key={label} onClick={() => setIsLogin(val)}
                className={`flex-1 py-2.5 rounded-[12px] clay-display text-sm transition ${isLogin === val ? 'clay-seg-on' : 'clay-ink-soft'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="mb-7">
            <h2 className="clay-display text-3xl mb-1">{isLogin ? 'Sign in to your account' : 'Create your account'}</h2>
            <p className="clay-ink-soft">Enter your details below to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="block text-sm clay-display clay-ink mb-2">Full name</label>
                <input name="name" placeholder="Enter your name" onChange={handleChange} required value={formData.name} className="clay-input" />
              </div>
            )}
            <div>
              <label className="block text-sm clay-display clay-ink mb-2">Email address</label>
              <input name="email" type="email" placeholder="you@example.com" onChange={handleChange} required value={formData.email} className="clay-input" />
            </div>
            <div>
              <label className="block text-sm clay-display clay-ink mb-2">Password</label>
              <input name="password" type="password" placeholder="Enter your password" onChange={handleChange} required value={formData.password} className="clay-input" />
            </div>
            {!isLogin && (
              <div>
                <label className="block text-sm clay-display clay-ink mb-2">Confirm password</label>
                <input name="passwordConfirm" type="password" placeholder="Confirm your password" onChange={handleChange} required value={formData.passwordConfirm} className="clay-input" />
              </div>
            )}
            <button type="submit" className="clay-btn w-full justify-center mt-2 text-lg">{isLogin ? 'Sign in' : 'Create account'}</button>
          </form>

          <p className="text-xs clay-ink-faint text-center mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} className="clay-display" style={{ color: 'var(--clay-violet)' }}>
              {isLogin ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
