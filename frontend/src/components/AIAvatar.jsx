import React, { useEffect, useState } from 'react';

/**
 * Pixar-stylized female AI interviewer portrait in pure SVG.
 * - Large expressive eyes, thick brows, dark messy bun, freckles, peach lips
 * - Blinks every 3–6s, subtle breathing float
 * - Lips open while speaking
 * - Listening: slight head tilt + green aura
 */
const AIAvatar = ({ isSpeaking, isListening }) => {
  const [blink, setBlink] = useState(false);
  const [mouth, setMouth] = useState({ open: 0, width: 1 });

  useEffect(() => {
    let cancel = false;
    const schedule = () => {
      const wait = 3000 + Math.random() * 3500;
      setTimeout(() => {
        if (cancel) return;
        setBlink(true);
        setTimeout(() => { if (!cancel) { setBlink(false); schedule(); } }, 140);
      }, wait);
    };
    schedule();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!isSpeaking) { setMouth({ open: 0, width: 1 }); return; }
    let cancel = false;
    const tick = () => {
      if (cancel) return;
      setMouth({
        open: 0.3 + Math.random() * 0.65,
        width: 0.85 + Math.random() * 0.4,
      });
      setTimeout(tick, 100 + Math.random() * 90);
    };
    tick();
    return () => { cancel = true; };
  }, [isSpeaking]);

  // Mouth geometry — cupid's bow upper lip + opening lower lip.
  const lipCx = 100, lipCy = 158;
  const halfW = 8 * mouth.width;
  const openY = 6 * mouth.open;
  const upperLip = `
    M ${lipCx - halfW} ${lipCy}
    C ${lipCx - halfW * 0.55} ${lipCy - 1.8}, ${lipCx - halfW * 0.25} ${lipCy - 2.6}, ${lipCx - halfW * 0.12} ${lipCy - 1}
    Q ${lipCx} ${lipCy - 2.4}, ${lipCx + halfW * 0.12} ${lipCy - 1}
    C ${lipCx + halfW * 0.25} ${lipCy - 2.6}, ${lipCx + halfW * 0.55} ${lipCy - 1.8}, ${lipCx + halfW} ${lipCy}
    Q ${lipCx} ${lipCy - 0.6}, ${lipCx - halfW} ${lipCy}
    Z
  `;
  const lowerLip = `
    M ${lipCx - halfW} ${lipCy + openY * 0.6}
    Q ${lipCx} ${lipCy + 4.5 + openY}, ${lipCx + halfW} ${lipCy + openY * 0.6}
    Q ${lipCx} ${lipCy + 1.2 + openY * 0.55}, ${lipCx - halfW} ${lipCy + openY * 0.6}
    Z
  `;
  const cavity = `
    M ${lipCx - halfW * 0.85} ${lipCy + 0.4}
    Q ${lipCx} ${lipCy + 3 + openY * 0.95}, ${lipCx + halfW * 0.85} ${lipCy + 0.4}
    Q ${lipCx} ${lipCy + 0.1}, ${lipCx - halfW * 0.85} ${lipCy + 0.4}
    Z
  `;

  // Freckles — tight across nose bridge only (not under the eyes)
  const freckles = [
    [95, 143, 0.6], [100, 142, 0.7], [105, 143, 0.6],
    [97, 147, 0.5], [103, 147, 0.5],
  ];

  return (
    <div
      className="relative w-full h-full min-h-[200px] flex items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 50% 40%, #2a2f45 0%, #0b0e18 70%, #05070d 100%)',
      }}
    >
      {isSpeaking && (
        <span className="absolute inline-flex h-48 w-48 rounded-full bg-blue-500/15 animate-pulse pointer-events-none" style={{ animationDuration: '1.2s' }} />
      )}
      {isListening && (
        <span className="absolute inline-flex h-48 w-48 rounded-full bg-green-500/20 animate-ping pointer-events-none" style={{ animationDuration: '1.4s' }} />
      )}

      <svg
        viewBox="0 0 200 240"
        className="relative z-10 w-full h-full max-w-[300px] max-h-[360px]"
        style={{
          transform: isListening ? 'rotate(-2deg)' : 'rotate(0deg)',
          transition: 'transform 500ms ease-in-out',
          animation: 'aiAvatarBreath 4.5s ease-in-out infinite',
        }}
      >
        <defs>
          <radialGradient id="skin2" cx="50%" cy="50%" r="55%">
            <stop offset="0%"  stopColor="#ffddc0" />
            <stop offset="70%" stopColor="#f4bc96" />
            <stop offset="100%" stopColor="#cc8e6a" />
          </radialGradient>
          <linearGradient id="hair2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1c1d28" />
            <stop offset="55%" stopColor="#242634" />
            <stop offset="100%" stopColor="#131420" />
          </linearGradient>
          <linearGradient id="lip2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#e79d86" />
            <stop offset="100%" stopColor="#c47560" />
          </linearGradient>
          <radialGradient id="iris2" cx="50%" cy="50%" r="55%">
            <stop offset="0%"  stopColor="#8a5a34" />
            <stop offset="55%" stopColor="#5a3a20" />
            <stop offset="100%" stopColor="#2b1810" />
          </radialGradient>
        </defs>

        {/* Shirt / chest */}
        <path d="M 50 230 Q 100 210 150 230 L 150 240 L 50 240 Z" fill="#eeeef2" />
        {/* Thin necklace */}
        <path d="M 80 220 Q 100 228 120 220" stroke="#d6cbb3" strokeWidth="0.7" fill="none" />

        {/* Neck — tapered, curved (narrower at top, wider toward collar) */}
        <path
          d="
            M 88 190
            C 86 200, 82 212, 80 222
            Q 100 232, 120 222
            C 118 212, 114 200, 112 190
            Q 100 196, 88 190
            Z
          "
          fill="url(#skin2)"
        />
        {/* Soft neck contour shadow */}
        <path d="M 90 202 Q 100 208 110 202" stroke="#bd8055" strokeWidth="0.7" fill="none" opacity="0.4" />

        {/* Hair — back full silhouette (messy bun + nape) */}
        <path
          d="
            M 42 96
            C 36 72, 55 30, 100 28
            C 150 28, 165 70, 158 96
            L 160 135
            Q 150 140, 140 138
            L 138 120
            Q 130 110, 100 108
            Q 70 110, 62 120
            L 60 138
            Q 50 140, 40 135
            Z
          "
          fill="url(#hair2)"
        />

        {/* Bun / top knot (volume on top of head) */}
        <ellipse cx="100" cy="32" rx="38" ry="22" fill="url(#hair2)" />
        <ellipse cx="88"  cy="24" rx="14" ry="8"  fill="#2a2b3a" opacity="0.9" />
        <ellipse cx="115" cy="26" rx="12" ry="7"  fill="#2a2b3a" opacity="0.9" />

        {/* Face shape — rounded (Pixar-style) */}
        <path
          d="
            M 62 100
            C 62 78, 76 62, 100 62
            C 124 62, 138 78, 138 100
            C 138 130, 132 165, 118 180
            Q 108 192, 100 192
            Q 92 192, 82 180
            C 68 165, 62 130, 62 100
            Z
          "
          fill="url(#skin2)"
        />

        {/* Ears */}
        <path d="M 60 115 Q 52 118, 54 135 Q 58 140, 63 132 Z" fill="url(#skin2)" />
        <path d="M 140 115 Q 148 118, 146 135 Q 142 140, 137 132 Z" fill="url(#skin2)" />
        <path d="M 58 122 Q 56 128, 59 133" stroke="#a76a47" strokeWidth="0.6" fill="none" opacity="0.5" />
        <path d="M 142 122 Q 144 128, 141 133" stroke="#a76a47" strokeWidth="0.6" fill="none" opacity="0.5" />

        {/* Cheek blush */}
        <ellipse cx="78" cy="152" rx="9" ry="6" fill="#f0999a" opacity="0.35" />
        <ellipse cx="122" cy="152" rx="9" ry="6" fill="#f0999a" opacity="0.35" />

        {/* Thick arched eyebrows */}
        <path
          d="M 68 104 Q 78 92, 95 100 Q 80 97, 68 104 Z"
          fill="#1d1d28"
        />
        <path
          d="M 132 104 Q 122 92, 105 100 Q 120 97, 132 104 Z"
          fill="#1d1d28"
        />

        {/* HUGE expressive eyes */}
        {blink ? (
          <>
            <path d="M 68 124 Q 82 130, 96 124" stroke="#1d1d28" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M 104 124 Q 118 130, 132 124" stroke="#1d1d28" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <g>
            {/* Left eye */}
            <ellipse cx="82" cy="124" rx="11" ry="12" fill="#fff" />
            <ellipse cx="82" cy="124" rx="7.5" ry="8.5" fill="url(#iris2)" />
            <circle cx="82" cy="125" r="3.2" fill="#0a0607" />
            <circle cx="84" cy="122" r="2" fill="#fff" opacity="0.95" />
            <circle cx="79" cy="127" r="0.9" fill="#fff" opacity="0.6" />
            {/* Thick upper lash */}
            <path d="M 70 116 Q 82 112, 94 116 L 94 118 Q 82 116, 70 118 Z" fill="#0f0e18" />

            {/* Right eye */}
            <ellipse cx="118" cy="124" rx="11" ry="12" fill="#fff" />
            <ellipse cx="118" cy="124" rx="7.5" ry="8.5" fill="url(#iris2)" />
            <circle cx="118" cy="125" r="3.2" fill="#0a0607" />
            <circle cx="120" cy="122" r="2" fill="#fff" opacity="0.95" />
            <circle cx="115" cy="127" r="0.9" fill="#fff" opacity="0.6" />
            <path d="M 106 116 Q 118 112, 130 116 L 130 118 Q 118 116, 106 118 Z" fill="#0f0e18" />
          </g>
        )}

        {/* Tiny button nose */}
        <path
          d="M 97 140 Q 96 148, 98 150 Q 100 152, 102 150 Q 104 148, 103 140 Q 100 143, 97 140 Z"
          fill="#d89872"
          opacity="0.75"
        />
        <ellipse cx="98" cy="149.5" rx="1" ry="0.6" fill="#8a5a3a" opacity="0.45" />
        <ellipse cx="102" cy="149.5" rx="1" ry="0.6" fill="#8a5a3a" opacity="0.45" />

        {/* Freckles across nose / upper cheeks */}
        <g fill="#8a5a3a" opacity="0.55">
          {freckles.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>

        {/* Mouth */}
        <g>
          {mouth.open > 0.12 && <path d={cavity} fill="#3a1620" />}
          {mouth.open > 0.35 && (
            <rect
              x={lipCx - halfW * 0.7}
              y={lipCy + 0.4}
              width={halfW * 1.4}
              height={1.6 + mouth.open * 1.6}
              fill="#f6edd8"
              rx="0.3"
            />
          )}
          <path d={upperLip} fill="url(#lip2)" />
          <path d={lowerLip} fill="url(#lip2)" />
          <ellipse cx={lipCx} cy={lipCy + 3 + openY * 0.4} rx={halfW * 0.35} ry="0.5" fill="#fff" opacity="0.35" />
        </g>

        {/* Hair — full front sweep over the forehead, no parting/gaps */}
        <path
          d="
            M 52 95
            C 52 70, 70 50, 100 52
            C 130 50, 148 70, 148 95
            C 148 100, 146 104, 142 106
            Q 135 90, 118 94
            Q 100 88, 82 94
            Q 65 90, 58 106
            C 54 104, 52 100, 52 95
            Z
          "
          fill="url(#hair2)"
        />
        {/* Loose strand on left */}
        <path
          d="M 54 94 Q 44 140, 52 175 Q 56 140, 62 100 Z"
          fill="url(#hair2)"
        />
        {/* Loose strand on right */}
        <path
          d="M 146 94 Q 156 140, 148 175 Q 144 140, 138 100 Z"
          fill="url(#hair2)"
        />
        {/* Little wispy bits from bun */}
        <path d="M 70 40 Q 62 28, 74 25" stroke="#1c1d28" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M 130 40 Q 138 28, 126 25" stroke="#1c1d28" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </svg>

      {/* Status pill */}
      <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/60 rounded-full px-2 py-1 backdrop-blur-sm z-20">
        <span className={`w-2 h-2 rounded-full ${
          isSpeaking ? 'bg-blue-500 animate-pulse' :
          isListening ? 'bg-green-500 animate-pulse' :
          'bg-gray-500'
        }`} />
        <span className="text-[10px] uppercase font-bold tracking-wider text-white">
          {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Idle'}
        </span>
      </div>

      <style>{`
        @keyframes aiAvatarBreath {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-1.5px); }
        }
      `}</style>
    </div>
  );
};

export default AIAvatar;
