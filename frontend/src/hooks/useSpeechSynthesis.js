import { useState, useCallback, useRef, useEffect } from 'react';

// Voice name preferences per mode
const VOICE_PREFS = {
  female:  ['Samantha', 'Google US English', 'Microsoft Zira', 'Karen', 'Victoria', 'Moira', 'Tessa', 'Alice'],
  male:    ['Daniel', 'Google UK English Male', 'Microsoft David', 'Fred', 'Alex', 'Tom', 'Albert'],
  neutral: ['Google UK English Female', 'Fiona', 'Eloquence'],
};

function pickVoice(mode) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefs = VOICE_PREFS[mode] || VOICE_PREFS.female;
  for (const pref of prefs) {
    const match = voices.find((v) => v.name.toLowerCase().includes(pref.toLowerCase()));
    if (match) return match;
  }
  // Fallback: any English voice
  return voices.find((v) => v.lang && v.lang.startsWith('en')) || voices[0] || null;
}

export const useSpeechSynthesis = (voiceMode = 'female') => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const utteranceRef = useRef(null);
  const pendingRef = useRef(null); // {text, onEnd}

  // Load voices — they load async and fire onvoiceschanged
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const onVoicesChanged = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        setVoicesReady(true);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    // Try immediately (some browsers load sync)
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoicesReady(true);
    }

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
    };
  }, []);

  // If there was a pending speak and voices just loaded, execute it
  useEffect(() => {
    if (voicesReady && pendingRef.current) {
      const { text, onEnd } = pendingRef.current;
      pendingRef.current = null;
      doSpeak(text, onEnd);
    }
  }, [voicesReady]);

  const doSpeak = useCallback((text, onEndCallback) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    const voice = pickVoice(voiceMode);
    if (voice) utterance.voice = voice;

    // Adjust pitch/rate for gender feel
    utterance.rate  = voiceMode === 'male' ? 0.92 : 1.0;
    utterance.pitch = voiceMode === 'female' ? 1.15 : voiceMode === 'male' ? 0.85 : 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
      onEndCallback?.();
    };
    utterance.onerror = (e) => {
      console.warn('TTS error:', e.error);
      setIsSpeaking(false);
      utteranceRef.current = null;
      onEndCallback?.();
    };

    window.speechSynthesis.speak(utterance);
  }, [voiceMode]);

  const speak = useCallback((text, onEndCallback = null) => {
    if (!('speechSynthesis' in window)) {
      onEndCallback?.();
      return;
    }
    if (!voicesReady) {
      // Voices not loaded yet — queue for when they are
      pendingRef.current = { text, onEnd: onEndCallback };
      return;
    }
    doSpeak(text, onEndCallback);
  }, [voicesReady, doSpeak]);

  const stop = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    pendingRef.current = null;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, []);

  return { speak, stop, isSpeaking };
};
