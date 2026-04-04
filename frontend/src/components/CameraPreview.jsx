import React, { useEffect, useRef, useState } from 'react';

const CameraPreview = ({ isFullscreen, onFullscreen }) => {
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
          setCameraError(null);
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        setCameraError('Camera not available');
        setIsCameraActive(false);
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (!isCameraActive) {
    return (
      <div className={`flex items-center justify-center bg-theme-bg border-2 border-theme-border rounded-lg ${
        isFullscreen ? 'floating-camera' : 'w-64 h-48'
      }`}>
        <div className="text-center p-4">
          <svg className="w-12 h-12 mx-auto text-theme-text-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-xs text-theme-text-muted">{cameraError || 'Camera initializing...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center bg-black rounded-lg overflow-hidden border-2 border-theme-accent ${
        isFullscreen
          ? 'floating-camera'
          : 'w-64 h-48'
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <button
        onClick={onFullscreen}
        className="absolute bottom-2 right-2 p-1.5 bg-theme-accent hover:bg-blue-600 text-white rounded-full transition-all opacity-0 hover:opacity-100"
        title="Toggle fullscreen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6v4m12 0h4v-4m0 12h-4v4m-12 0H6v-4" />
        </svg>
      </button>
    </div>
  );
};

export default CameraPreview;
