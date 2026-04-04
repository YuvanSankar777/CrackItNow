import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', passwordConfirm: ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        if (formData.password !== formData.passwordConfirm) {
          alert("Passwords do not match!");
          return;
        }
        await register(formData.name, formData.email, formData.password, formData.passwordConfirm);
      }
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.password?.[0] || 
                       err.response?.data?.non_field_errors?.[0] || 
                       err.response?.data?.detail || 
                       "Authentication Failed. Check credentials.";
      alert(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* ── Left Column (Animation & Branding) ── */}
      <div className="w-full lg:w-1/2 bg-hero-bg flex flex-col justify-center items-center p-12 lg:p-24 relative overflow-hidden">
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 neural-grid opacity-10 pointer-events-none" />
        
        <div className="relative z-10 text-center max-w-lg mb-16 animate-fade">
          <h1 className="text-4xl lg:text-5xl font-serif !text-white font-bold leading-tight mb-4">
            Welcome to <br />
            <span className="text-theme-accent">DevVox AI Platform</span>
          </h1>
          <p className="text-hero-muted text-lg lg:text-xl font-normal leading-relaxed opacity-80">
            Connect, collaborate, and master your career with our AI-driven resources.
          </p>
        </div>

        {/* ── Neural Pulse Wave Animation (Replcaes Image) ── */}
        <div className="relative z-10 neural-wave-container w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 animate-slide-up shadow-2xl">
          {[...Array(15)].map((_, i) => (
            <div 
              key={i} 
              className="wave-bar" 
              style={{ 
                animationDelay: `${i * 0.15}s`,
                height: `${20 + Math.random() * 60}%`
              }} 
            />
          ))}
        </div>
        
        {/* Subtle Bottom Glow */}
        <div className="absolute bottom-[-10%] w-[120%] h-[20%] bg-theme-accent/20 blur-[100px] rounded-[100%] pointer-events-none" />
      </div>

      {/* ── Right Column (Form Side) ── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-16 bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.02)] relative z-20">
        
        {/* Toggle Switch */}
        <div className="mb-12 animate-fade">
          <div className="tab-pill">
            <button 
              onClick={() => setIsLogin(true)}
              className={`tab-pill-btn ${isLogin ? 'active' : ''}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`tab-pill-btn ${!isLogin ? 'active' : ''}`}
            >
              Register
            </button>
          </div>
        </div>

        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-serif text-theme-text font-bold mb-2">
              {isLogin ? 'Sign In to Account' : 'Register New Account'}
            </h2>
            <p className="text-theme-text-muted">Enter your details below to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="animate-fade">
                <label className="block text-sm font-semibold text-theme-text mb-2">Full Name</label>
                <input 
                  name="name" placeholder="Enter your Name" onChange={handleChange} required
                  className="input-premium border-slate-200 focus:border-theme-accent transition-all hover:border-slate-300"
                  value={formData.name}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-theme-text mb-2">Email Address</label>
              <input 
                name="email" type="email" placeholder="aaaa@example.com" onChange={handleChange} required
                className="input-premium border-slate-200 focus:border-theme-accent transition-all hover:border-slate-300"
                value={formData.email}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-theme-text mb-2">Password</label>
              <div className="relative">
                <input 
                  name="password" type="password" placeholder="Enter your password" onChange={handleChange} required
                  className="input-premium border-slate-200 focus:border-theme-accent transition-all hover:border-slate-300"
                  value={formData.password}
                />
              </div>
            </div>
            {!isLogin && (
              <div className="animate-fade">
                <label className="block text-sm font-semibold text-theme-text mb-2">Confirm Password</label>
                <input 
                  name="passwordConfirm" type="password" placeholder="Confirm your password" onChange={handleChange} required
                  className="input-premium border-slate-200 focus:border-theme-accent transition-all hover:border-slate-300"
                  value={formData.passwordConfirm}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-theme-accent focus:ring-theme-accent" />
                <span className="text-xs text-theme-text-muted group-hover:text-theme-text transition-colors">I agree to the Terms & Conditions</span>
              </label>
              {isLogin && (
                <button type="button" className="text-xs font-semibold text-[#1e40af] hover:text-theme-accent transition-colors">Forgot password?</button>
              )}
            </div>
            
            <button type="submit" className="btn-primary w-full mt-6 py-4 bg-[#64748b] hover:bg-slate-600 text-white shadow-lg font-bold">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          {/* Social Login */}
          <div className="mt-8 text-center relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <span className="relative px-4 bg-white text-[10px] text-slate-400 font-bold tracking-widest uppercase">OR</span>
          </div>

          <button className="w-full mt-8 py-3.5 border border-slate-100 rounded-lg flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 text-slate-600 font-medium text-sm">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
