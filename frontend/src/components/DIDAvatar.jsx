import React, { useEffect, useRef } from 'react';

const DIDAvatar = ({ stream, isSpeaking, isListening, didStatus }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      // Avoid re-assigning if it's the exact same stream to prevent flickering
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full min-h-[160px] flex items-center justify-center bg-[#111] overflow-hidden">
      {!stream && didStatus === 'connecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-[10px] text-gray-500">Connecting to API...</p>
        </div>
      )}

      {didStatus === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <span className="text-xl">⚠️</span>
          <p className="text-[10px] text-red-400">Failed to connect to avatar server. Please check API Key.</p>
        </div>
      )}

      <video 
        ref={videoRef}
        playsInline 
        autoPlay
        muted={false}
        className={`w-full h-full object-cover transition-opacity duration-500 ${stream ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Dynamic Status Badges */}
      <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 rounded-full px-2 py-1 backdrop-blur-sm z-10">
        <span className={`w-2 h-2 rounded-full ${
          isSpeaking ? 'bg-blue-500 animate-pulse' : 
          isListening ? 'bg-green-500 animate-pulse' : 
          'bg-gray-400'
        }`} />
        <span className="text-[10px] uppercase font-bold tracking-wider text-white">
          {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Idle'}
        </span>
      </div>

      {/* Audio Wave visualizer when speaking */}
      {isSpeaking && (
        <div className="absolute bottom-3 right-3 flex items-end gap-1 h-6 z-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 bg-blue-400 rounded-full opacity-80"
              style={{
                animation: 'avatarWave 0.6s ease-in-out infinite alternate',
                animationDelay: `${i * 0.15}s`,
                height: '4px'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DIDAvatar;
