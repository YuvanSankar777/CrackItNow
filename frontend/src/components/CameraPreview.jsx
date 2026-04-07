import React, { useEffect, useRef, useState, useCallback } from 'react';

const CameraPreview = ({ compact = false }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [state, setState] = useState('idle'); // idle | loading | active | error
  const [errorMsg, setErrorMsg] = useState('');

  const startCamera = useCallback(async () => {
    setState('loading');
    setErrorMsg('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      // Must wait for next tick so videoRef.current is mounted
      await new Promise((r) => setTimeout(r, 50));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setState('active');
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Camera permission denied. Please allow access.');
      } else if (err.name === 'NotFoundError') {
        setErrorMsg('No camera detected on this device.');
      } else {
        setErrorMsg(`Camera error: ${err.message}`);
      }
      setState('error');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  const sizeClass = compact ? 'w-full h-full' : 'w-48 h-36';

  return (
    <div className={`${sizeClass} relative bg-black rounded-xl overflow-hidden border border-[#444]`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${state === 'active' ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Loading Overlay */}
      {(state === 'loading' || state === 'idle') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-[10px] text-gray-500">Starting camera...</p>
        </div>
      )}

      {/* Error Overlay */}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111] gap-2 p-3 text-center">
          <span className="text-2xl">📷</span>
          <p className="text-[10px] text-gray-400 leading-relaxed">{errorMsg}</p>
          <button onClick={startCamera} className="text-[10px] text-blue-400 hover:text-blue-300 underline">
            Retry
          </button>
        </div>
      )}

      {/* Live indicator */}
      {state === 'active' && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] text-white font-mono">LIVE</span>
        </div>
      )}
    </div>
  );
};

export default CameraPreview;
