import React from 'react';

const HumanAvatar = ({ isSpeaking, isListening }) => {
  return (
    <div className="relative w-full h-full min-h-[160px] flex items-center justify-center">
      {/* Outer Pulse effect when speaking */}
      {isSpeaking && (
        <>
          <div className="absolute inset-[-4px] rounded-2xl bg-theme-accent/30 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute inset-[-8px] rounded-2xl bg-theme-accent/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
        </>
      )}

      {/* Main Avatar Container */}
      <div 
        className={`relative w-full aspect-video md:aspect-[4/3] lg:aspect-video rounded-xl overflow-hidden shadow-2xl transition-all duration-300 z-10 z-[11]
          ${isSpeaking 
            ? 'border-2 border-theme-accent scale-[1.02] shadow-[0_0_30px_rgba(59,130,246,0.3)]' 
            : isListening 
              ? 'border-2 border-green-500 scale-[1.01] shadow-[0_0_20px_rgba(34,197,94,0.2)]'
              : 'border border-theme-border'
          }`}
      >
        <img 
          src="/ai-avatar.png" 
          alt="AI Interviewer" 
          className="w-full h-full object-cover"
        />

        {/* Dynamic Overlay Elements */}
        {/* Speaking Overlay - subtle audio waves animation */}
        {isSpeaking && (
          <div className="absolute bottom-3 right-3 flex items-end gap-1 h-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1.5 bg-white rounded-full opacity-80"
                style={{
                  animation: 'avatarWave 0.6s ease-in-out infinite alternate',
                  animationDelay: `${i * 0.15}s`,
                  height: '4px'
                }}
              />
            ))}
          </div>
        )}

        {/* Status Indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 rounded-full px-2 py-1 backdrop-blur-sm">
          <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-theme-accent animate-pulse' : isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-[10px] uppercase font-bold tracking-wider text-white">
            {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Idle'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HumanAvatar;
