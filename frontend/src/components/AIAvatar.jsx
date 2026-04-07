import React from 'react';

const AIAvatar = ({ isSpeaking, isListening }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 relative w-full h-full min-h-[140px]">
      <div className="relative flex items-center justify-center">
        {/* Outer pulse rings */}
        {isSpeaking && (
          <>
            <span className="absolute inline-flex h-32 w-32 rounded-full bg-blue-500/30 animate-ping" style={{ animationDuration: '1.2s' }} />
            <span className="absolute inline-flex h-28 w-28 rounded-full bg-blue-400/20 animate-ping" style={{ animationDuration: '1.6s', animationDelay: '0.3s' }} />
          </>
        )}
        {isListening && (
          <span className="absolute inline-flex h-28 w-28 rounded-full bg-green-500/30 animate-ping" style={{ animationDuration: '1.4s' }} />
        )}
        
        {/* Avatar circle */}
        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl border-4 transition-all duration-500 z-10 ${
          isSpeaking
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400 shadow-blue-500/50 scale-110'
            : isListening
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 shadow-green-500/50 scale-105'
              : 'bg-gradient-to-br from-gray-800 to-black border-gray-600 shadow-black'
        }`}>
          {/* Fancy Robot Face SVG */}
          <svg className={`w-12 h-12 transition-colors duration-500 ${
            isSpeaking ? 'text-white' : isListening ? 'text-white' : 'text-gray-400'
          }`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5a7 7 0 0 1 7-7h1V5.73A2 2 0 1 1 12 2zm3 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>
      </div>

      {/* Wave bars indicator */}
      <div className="flex items-end gap-1 h-8 mt-2">
        {isSpeaking ? (
          [0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-1.5 bg-blue-400 rounded-full"
              style={{
                height: `${Math.random() * 60 + 40}%`,
                animation: `waveBar 0.5s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.1}s`,
                minHeight: '6px',
              }}
            />
          ))
        ) : isListening ? (
          <div className="w-full flex gap-1 justify-center items-center h-full">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
             <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
             <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        ) : (
          <div className="h-1 w-12 bg-gray-600 rounded-full opacity-50" />
        )}
      </div>

      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.5); opacity: 0.7; }
          to { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AIAvatar;
