import { useState, useCallback, useRef, useEffect } from 'react';

export const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentUtterance = useRef(null);

  const speak = useCallback((text, onEndCallback = null) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech Synthesis not supported');
      if (onEndCallback) onEndCallback();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance.current = utterance;
    
    // Choose voice (preferably a natural english one)
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Premium')) || voices[0];
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }
    
    utterance.rate = 1.05; // Slightly faster for natural feel
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    
    utterance.onend = () => {
      setIsSpeaking(false);
      currentUtterance.current = null;
      if (onEndCallback) onEndCallback();
    };
    
    utterance.onerror = (e) => {
      console.error('TTS Error:', e);
      setIsSpeaking(false);
      currentUtterance.current = null;
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      currentUtterance.current = null;
    }
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.getVoices();
  }, []);

  return { speak, stop, isSpeaking };
};
