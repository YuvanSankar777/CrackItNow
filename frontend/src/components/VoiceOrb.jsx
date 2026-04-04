import React from 'react';

const VoiceOrb = ({ status, onClick }) => {
  // status: 'idle', 'listening', 'speaking', 'processing'
  
  const getOrbStyles = () => {
    switch(status) {
      case 'listening': 
        return 'bg-theme-text border-white animate-breathe';
      case 'speaking':
        return 'bg-theme-surface border-theme-text-muted animate-pulse-fast';
      case 'processing':
        return 'bg-theme-surface border-theme-text-muted';
      default:
        return 'bg-theme-bg border-theme-text-muted/30 hover:border-theme-text-muted group hover:scale-[1.02]';
    }
  };

  const getIconColor = () => {
    if (status === 'listening') return 'text-theme-surface';
    return 'text-theme-text-muted group-hover:text-theme-text';
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Dynamic ripples for speaking/listening */}
      {(status === 'listening' || status === 'speaking') && (
        <>
          <div className="absolute inset-[-8px] rounded-full border border-theme-text/20 animate-[ripple_1.5s_ease-out_infinite]"></div>
          <div className="absolute inset-[-8px] rounded-full border border-theme-text/20 animate-[ripple_1.5s_ease-out_infinite_0.5s]"></div>
        </>
      )}

      {/* Main Orb */}
      <div 
        onClick={onClick}
        className={`orb-base ${getOrbStyles()} flex items-center justify-center`}
      >
        {status === 'processing' ? (
          <div className="flex gap-1 items-center h-8">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 bg-theme-text-muted rounded-full animate-bounce`} 
                style={{ animationDelay: `${i * 0.15}s` }} 
              />
            ))}
          </div>
        ) : (
          <svg className={`w-8 h-8 ${getIconColor()} transition-colors duration-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </div>

      <div className="absolute -bottom-8 w-full text-center text-xs font-mono uppercase text-theme-text-muted/70 tracking-widest">
        {status}
      </div>
    </div>
  );
};

export default VoiceOrb;
