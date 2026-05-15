import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { TalkingHead } from '@met4citizen/talkinghead';
// Static import so Vite bundles it — TalkingHead's runtime `import("./lipsync-en.mjs")`
// otherwise 404s because Vite's dev server doesn't serve that path.
import { LipsyncEn } from '@met4citizen/talkinghead/modules/lipsync-en.mjs';

// Bundled locally in frontend/public/avatar.glb (CC BY-NC 4.0 demo from met4citizen/TalkingHead).
const DEFAULT_AVATAR_URL = '/avatar.glb';

// Oculus-Viseme morph target names present on the RPM brunette avatar.
const VISEMES = [
  'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
  'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD', 'viseme_kk',
  'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
];

/**
 * Lip-sync driver that bypasses TalkingHead's state machine. We monkey-patch
 * updateMorphTargets so that after TH writes its own morph values we overwrite
 * the mouth-related ones. This guarantees our writes reach the renderer even
 * if TH's internal smoothing or baselines would otherwise reset them.
 */
function createLipSyncDriver(head) {
  let active = false;
  let currentViseme = null;
  let visemeAmp = 0;
  let jawAmp = 0;
  let mouthOpenAmp = 0;
  let timer = null;

  const origUpdate = head.updateMorphTargets.bind(head);
  head.updateMorphTargets = function patched(dt) {
    origUpdate(dt);
    if (!active) return;
    const meshes = head.morphs || [];
    for (const mesh of meshes) {
      const dict = mesh.morphTargetDictionary;
      const infl = mesh.morphTargetInfluences;
      if (!dict || !infl) continue;
      // Reset all visemes + mouthClose so we don't leave stale values
      for (const v of VISEMES) {
        const idx = dict[v];
        if (idx !== undefined) infl[idx] = 0;
      }
      const closeIdx = dict.mouthClose;
      if (closeIdx !== undefined) infl[closeIdx] = 0;

      if (currentViseme) {
        const idx = dict[currentViseme];
        if (idx !== undefined) infl[idx] = visemeAmp;
      }
      const jawIdx = dict.jawOpen;
      if (jawIdx !== undefined) infl[jawIdx] = jawAmp;
      const mouthIdx = dict.mouthOpen;
      if (mouthIdx !== undefined) infl[mouthIdx] = mouthOpenAmp;
    }
  };

  const switchViseme = () => {
    if (!active) return;
    currentViseme = VISEMES[Math.floor(Math.random() * VISEMES.length)];
    // The GLB's mouth morph deltas are tiny in model units — we need large
    // amplitudes so the mouth visibly parts. three.js does not clamp morph
    // influences, so values above 1 work.
    visemeAmp    = 4 + Math.random() * 3;   // 4 – 7
    jawAmp       = 6 + Math.random() * 4;   // 6 – 10 (primary "mouth open")
    mouthOpenAmp = 3 + Math.random() * 3;   // 3 – 6 (reinforces lip separation)
    if (typeof window !== 'undefined' && window.__avatarDebug) {
      console.log('[Avatar] viseme', currentViseme, visemeAmp.toFixed(1), 'jaw', jawAmp.toFixed(1));
    }
    timer = setTimeout(switchViseme, 130 + Math.random() * 100);
  };

  return {
    start() {
      if (active) return;
      active = true;
      switchViseme();
    },
    stop() {
      active = false;
      if (timer) { clearTimeout(timer); timer = null; }
      currentViseme = null;
      visemeAmp = 0;
      jawAmp = 0;
      mouthOpenAmp = 0;
      try { head.updateMorphTargets(0); } catch (e) { /* ignore */ }
    },
    dispose() {
      active = false;
      if (timer) { clearTimeout(timer); timer = null; }
      // Restore original (best-effort)
      try { head.updateMorphTargets = origUpdate; } catch (e) { /* ignore */ }
    },
  };
}

const TalkingHeadAvatar = forwardRef(({ isListening, avatarUrl }, ref) => {
  const containerRef = useRef(null);
  const headRef = useRef(null);
  const driverRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    const head = new TalkingHead(containerRef.current, {
      ttsEndpoint: '',
      // Empty list so TalkingHead doesn't try to dynamic-import language files;
      // we register the English processor directly below.
      lipsyncModules: [],
      cameraView: 'head',  // close-up so mouth motion is visible
      cameraRotateEnable: false,
      cameraPanEnable: false,
      cameraZoomEnable: false,
      modelRoot: 'Armature',
      modelFPS: 30,
    });
    head.lipsync = head.lipsync || {};
    head.lipsync.en = new LipsyncEn();
    headRef.current = head;

    head
      .showAvatar({
        url: avatarUrl || DEFAULT_AVATAR_URL,
        body: 'F',
        avatarMood: 'neutral',
        lipsyncLang: 'en',
      })
      .then(() => {
        if (destroyed) return;
        driverRef.current = createLipSyncDriver(head);
        setReady(true);
        if (typeof window !== 'undefined') {
          window.__head = head;
          window.__setMorph = (name, value) => {
            let count = 0;
            for (const mesh of head.morphs || []) {
              const idx = mesh.morphTargetDictionary?.[name];
              if (idx !== undefined) {
                mesh.morphTargetInfluences[idx] = value;
                count++;
              }
            }
            return `set ${name}=${value} on ${count} meshes`;
          };
          // Direct test hooks — trigger the actual mouth driver without TTS.
          window.__speakStart = () => driverRef.current?.start();
          window.__speakStop  = () => driverRef.current?.stop();
          window.__speakFor   = (ms = 3000) => {
            driverRef.current?.start();
            setTimeout(() => driverRef.current?.stop(), ms);
          };
        }
        console.info(
          '[Avatar] ready. morphs:', head.morphs?.length,
          'mtAvatar keys:', Object.keys(head.mtAvatar || {}).length,
          'has jawOpen:', !!head.mtAvatar?.jawOpen,
        );
        console.info('[Avatar] debug: window.__head.setValue("jawOpen",1)  or  window.__setMorph("jawOpen",1)');
      })
      .catch((err) => {
        if (destroyed) return;
        console.warn('TalkingHead avatar load failed:', err);
        setError(err?.message || 'avatar load failed');
      });

    return () => {
      destroyed = true;
      driverRef.current?.dispose();
      driverRef.current = null;
      try { head.stop?.(); } catch (e) { /* ignore */ }
      headRef.current = null;
    };
  }, [avatarUrl]);

  useImperativeHandle(ref, () => ({
    speakText: () => { driverRef.current?.start(); },
    stopSpeaking: () => { driverRef.current?.stop(); },
    setMood: (mood) => { try { headRef.current?.setMood?.(mood); } catch (e) { /* ignore */ } },
  }), []);

  return (
    <div className="relative w-full h-full min-h-[200px] flex items-center justify-center bg-gradient-to-b from-[#0d1420] to-[#000] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600 z-10 pointer-events-none">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-[10px]">Loading avatar…</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center z-10">
          <span className="text-xl">⚠️</span>
          <p className="text-[10px] text-red-400">{error}</p>
        </div>
      )}

      {isListening && (
        <span className="absolute inline-flex h-40 w-40 rounded-full bg-green-500/20 animate-ping pointer-events-none" style={{ animationDuration: '1.4s' }} />
      )}
    </div>
  );
});

TalkingHeadAvatar.displayName = 'TalkingHeadAvatar';

export default TalkingHeadAvatar;
