import { useState, useRef, useEffect, useCallback } from 'react';

const DID_URL = '/did-api/talks/streams';

export const useDIDStream = () => {
  const [stream, setStream] = useState(null);
  const [didStatus, setDidStatus] = useState('idle'); // idle, connecting, ready, error
  const pcRef = useRef(null);
  const streamIdRef = useRef(null);
  const sessionIdRef = useRef(null);

  const getAuthHeader = () => {
    const key = import.meta.env.VITE_DID_API_KEY || '';
    return key.includes(':') ? `Basic ${btoa(key)}` : `Basic ${key}`;
  };

  const initStream = useCallback(async () => {
    setDidStatus('connecting');
    try {
      // 1. Create stream
      const res = await fetch(DID_URL, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_url: import.meta.env.VITE_DID_AVATAR_IMAGE_URL
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        console.error('D-ID API Error Response:', data);
        throw new Error(data.description || data.message || `HTTP ${res.status}`);
      }
      
      const { id: streamId, session_id: sessionId, offer } = data;
      streamIdRef.current = streamId;
      sessionIdRef.current = sessionId;

      // 2. Setup WebRTC PeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      pc.addEventListener('track', (e) => {
        if (e.track.kind === 'video' || e.track.kind === 'audio') {
          setStream(e.streams[0]);
          setDidStatus('ready');
        }
      });

      pc.addEventListener('icecandidate', async (e) => {
        if (e.candidate && streamIdRef.current) {
          try {
            await fetch(`${DID_URL}/${streamIdRef.current}/ice`, {
              method: 'POST',
              headers: {
                'Authorization': getAuthHeader(),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                candidate: e.candidate.candidate,
                sdpMid: e.candidate.sdpMid,
                sdpMLineIndex: e.candidate.sdpMLineIndex,
                session_id: sessionIdRef.current
              })
            });
          } catch (err) {
            console.error('Error submitting ICE candidate', err);
          }
        }
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 3. Submit Answer
      await fetch(`${DID_URL}/${streamIdRef.current}/sdp`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          answer: answer,
          session_id: sessionIdRef.current
        })
      });
    } catch (err) {
      console.error('Failed to init D-ID stream', err);
      setDidStatus('error');
    }
  }, []);

  const speak = useCallback(async (text, onFinish) => {
    if (didStatus !== 'ready' || !streamIdRef.current) return;
    
    try {
      await fetch(`${DID_URL}/${streamIdRef.current}`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          script: {
            type: 'text',
            input: text,
            provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' }
          },
          session_id: sessionIdRef.current,
          config: {
            stitch: true,
            fluent: true
          }
        })
      });
      // The video stream plays automatically. D-ID streams don't fire precise JS events on speech end locally, 
      // but we can manually trigger the finish callback after approx length based on text.
      if (onFinish) {
         // rough estimation: ~180 words per min = 3 words/sec. + 1 second buffer.
         const duration = (text.split(' ').length / 3) * 1000 + 1000;
         setTimeout(onFinish, duration < 2000 ? 2000 : duration);
      }
    } catch (err) {
      console.error('Failed to send speak event to D-ID', err);
      if (onFinish) onFinish();
    }
  }, [didStatus]);

  const disconnect = useCallback(async () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamIdRef.current) {
      try {
        await fetch(`${DID_URL}/${streamIdRef.current}`, {
          method: 'DELETE',
          headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ session_id: sessionIdRef.current })
        });
      } catch (err) {
        console.error('Failed to cleanup D-ID stream', err);
      }
    }
    setStream(null);
    setDidStatus('idle');
  }, []);

  useEffect(() => {
    initStream();
    return () => {
      disconnect();
    };
  }, [initStream, disconnect]);

  return { stream, didStatus, speak, initStream, disconnect };
};
