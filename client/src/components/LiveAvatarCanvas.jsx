import React, { useState, useEffect } from 'react';

/**
 * LiveAvatarCanvas Component
 * Renders a stylized, animated SVG AI Interviewer persona with:
 * - Dynamic mouth animation synced to SpeechSynthesis `isSpeaking`
 * - Periodic natural eye blinking
 * - Audio wave rings & equalizer aura synced to speaking/listening states
 * - High-tech neural visor and sleek teal/cyan lighting
 */
export const LiveAvatarCanvas = ({
  isSpeaking = false,
  isListening = false,
  isAiThinking = false,
  isCrossQuestioning = false,
  personaName = 'Nexus AI',
  roleTitle = 'Technical Lead Interviewer',
  interviewType = 'technical',
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthFrame, setMouthFrame] = useState(0);

  // Periodic natural blinking (every 3 to 5 seconds)
  useEffect(() => {
    let blinkTimeout;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        const nextInterval = 2500 + Math.random() * 3000;
        blinkTimeout = setTimeout(triggerBlink, nextInterval);
      }, 160);
    };

    blinkTimeout = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Sync mouth movement frame when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }

    const mouthInterval = setInterval(() => {
      setMouthFrame((prev) => (prev + 1) % 4);
    }, 140);

    return () => clearInterval(mouthInterval);
  }, [isSpeaking]);

  // Mouth SVG paths for speech animation cycle
  const mouthPaths = [
    // Frame 0: Rest / slight smile
    'M 86 142 Q 100 148 114 142',
    // Frame 1: Small open vowel
    'M 88 139 Q 100 134 112 139 Q 100 152 88 139 Z',
    // Frame 2: Wide open talk
    'M 86 138 Q 100 131 114 138 Q 100 158 86 138 Z',
    // Frame 3: Medium open / consonant
    'M 87 140 Q 100 136 113 140 Q 100 149 87 140 Z',
  ];

  const currentMouthPath = isSpeaking ? mouthPaths[mouthFrame] : mouthPaths[0];

  const isHr = interviewType === 'hr';
  const primaryGlow = isHr ? '#a855f7' : '#4FA393';
  const secondaryGlow = isHr ? '#ec4899' : '#38bdf8';

  return (
    <div className="relative flex flex-col items-center justify-center p-6 select-none">
      {/* Dynamic Soundwave Rings Behind Avatar */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Ambient Ring 1 */}
        <div
          className={`w-64 h-64 rounded-full transition-all duration-700 ${
            isSpeaking
              ? 'scale-110 opacity-40 animate-ping'
              : isListening
              ? 'scale-105 opacity-30 animate-pulse'
              : 'scale-95 opacity-15'
          }`}
          style={{
            background: `radial-gradient(circle, ${primaryGlow}44 0%, transparent 70%)`,
          }}
        />

        {/* Ambient Ring 2 */}
        <div
          className={`w-80 h-80 rounded-full transition-all duration-1000 ${
            isSpeaking || isListening ? 'opacity-25 animate-pulse' : 'opacity-10'
          }`}
          style={{
            border: `2px dashed ${isSpeaking ? primaryGlow : isListening ? '#f43f5e' : '#334155'}`,
          }}
        />
      </div>

      {/* Main Stylized Avatar Canvas */}
      <div
        className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-3xl p-3 shadow-2xl transition-all duration-300 flex items-center justify-center ${
          isCrossQuestioning ? 'scale-105 rotate-1' : ''
        }`}
        style={{
          background: 'linear-gradient(145deg, rgba(20, 24, 33, 0.95), rgba(12, 16, 24, 0.98))',
          border: isCrossQuestioning
            ? '2px solid #f59e0b'
            : `2px solid ${isSpeaking ? primaryGlow : isListening ? '#f43f5e' : 'rgba(79, 163, 147, 0.3)'}`,
          boxShadow: isCrossQuestioning
            ? '0 0 40px rgba(245, 158, 11, 0.4), inset 0 0 20px rgba(245, 158, 11, 0.2)'
            : isSpeaking
            ? `0 0 35px ${primaryGlow}40, inset 0 0 20px ${primaryGlow}20`
            : isListening
            ? '0 0 35px rgba(244, 63, 94, 0.35), inset 0 0 20px rgba(244, 63, 94, 0.15)'
            : '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-lg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Persona Gradient */}
            <linearGradient id="avatarSkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Visor / Iris Gradient */}
            <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={primaryGlow} />
              <stop offset="50%" stopColor={secondaryGlow} />
              <stop offset="100%" stopColor={primaryGlow} />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Torso / Shoulders */}
          <path
            d="M 45 190 Q 60 162 100 162 Q 140 162 155 190 Z"
            fill="#131b2a"
            stroke="#2a394f"
            strokeWidth="2"
          />
          {/* Collar Accent */}
          <path
            d="M 80 165 L 100 180 L 120 165"
            fill="none"
            stroke={primaryGlow}
            strokeWidth="2"
            opacity="0.7"
          />

          {/* Neck */}
          <rect
            x="88"
            y="140"
            width="24"
            height="26"
            rx="4"
            fill="#182232"
            stroke="#26354a"
            strokeWidth="1.5"
          />

          {/* Head Silhouette */}
          <rect
            x="58"
            y="42"
            width="84"
            height="104"
            rx="36"
            fill="url(#avatarSkin)"
            stroke={isSpeaking ? primaryGlow : '#334155'}
            strokeWidth="2"
            className="transition-colors duration-300"
          />

          {/* Hair / Head Accent Crown */}
          <path
            d="M 58 75 C 58 46 80 34 100 34 C 120 34 142 46 142 75 C 130 65 118 64 100 64 C 82 64 70 65 58 75 Z"
            fill="#090d16"
          />

          {/* Neural Visor / Eyebrow Band */}
          <rect
            x="66"
            y="82"
            width="68"
            height="26"
            rx="13"
            fill="#0b111e"
            stroke="#223048"
            strokeWidth="1.5"
          />

          {/* Eyes / Visor Optics */}
          {isBlinking ? (
            /* Closed Eyelids during blink */
            <g stroke={primaryGlow} strokeWidth="2.5" strokeLinecap="round">
              <line x1="75" y1="95" x2="89" y2="95" />
              <line x1="111" y1="95" x2="125" y2="95" />
            </g>
          ) : (
            /* Open Eyes with dynamic pupils */
            <g>
              {/* Left Eye */}
              <ellipse cx="82" cy="95" rx="8" ry="6" fill="#0f172a" stroke={primaryGlow} strokeWidth="1.5" />
              <circle
                cx="82"
                cy="95"
                r="3.5"
                fill="url(#visorGrad)"
                filter="url(#neonGlow)"
              />
              <circle cx="83.5" cy="93.5" r="1" fill="#ffffff" />

              {/* Right Eye */}
              <ellipse cx="118" cy="95" rx="8" ry="6" fill="#0f172a" stroke={primaryGlow} strokeWidth="1.5" />
              <circle
                cx="118"
                cy="95"
                r="3.5"
                fill="url(#visorGrad)"
                filter="url(#neonGlow)"
              />
              <circle cx="119.5" cy="93.5" r="1" fill="#ffffff" />
            </g>
          )}

          {/* Nose Accent */}
          <path
            d="M 100 114 L 97 125 L 103 125"
            fill="none"
            stroke="#334155"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Dynamic Animated Mouth */}
          <path
            d={currentMouthPath}
            fill={isSpeaking && mouthFrame > 0 ? '#1e1b4b' : 'none'}
            stroke={isSpeaking ? primaryGlow : '#64748b'}
            strokeWidth={isSpeaking ? '2.5' : '2'}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-100"
          />

          {/* Ear Modules / Microphones */}
          <rect x="52" y="86" width="6" height="18" rx="3" fill="#1e293b" stroke={primaryGlow} strokeWidth="1" />
          <rect x="142" y="86" width="6" height="18" rx="3" fill="#1e293b" stroke={primaryGlow} strokeWidth="1" />

          {/* Ambient Head Node Dots */}
          <circle cx="100" cy="52" r="2" fill={primaryGlow} opacity={isSpeaking ? '1' : '0.4'} />
          <circle cx="70" cy="66" r="1.5" fill="#38bdf8" opacity="0.5" />
          <circle cx="130" cy="66" r="1.5" fill="#38bdf8" opacity="0.5" />
        </svg>

        {/* Floating status dot */}
        <span
          className={`absolute top-4 right-4 w-3.5 h-3.5 rounded-full border-2 border-gray-900 transition-all duration-300 ${
            isSpeaking
              ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20'
              : isListening
              ? 'bg-rose-500 animate-ping ring-4 ring-rose-500/30'
              : isAiThinking
              ? 'bg-amber-400 animate-spin'
              : 'bg-teal-500/80'
          }`}
        />
      </div>

      {/* Persona Identification & State Indicator */}
      <div className="mt-4 flex flex-col items-center text-center">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-100 tracking-wide">{personaName}</span>
          <span
            className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-semibold"
            style={{
              backgroundColor: isHr ? 'rgba(168, 85, 247, 0.15)' : 'rgba(79, 163, 147, 0.15)',
              color: primaryGlow,
              border: `1px solid ${primaryGlow}40`,
            }}
          >
            {isHr ? 'HR & Leadership' : 'Technical Lead'}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{roleTitle}</p>

        {/* Live Audio State Pill */}
        <div className="mt-3">
          {isCrossQuestioning ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-300 text-xs font-semibold shadow-lg shadow-amber-900/30 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>⚡ Probing Cross-Question (Interviewer Leaning In...)</span>
            </div>
          ) : isSpeaking ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs font-medium shadow-lg shadow-teal-900/20 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span>Interviewer Speaking...</span>
              {/* Mini animated audio bars */}
              <div className="flex items-center gap-0.5 ml-1">
                {[12, 18, 8, 16, 10].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-teal-400 rounded-full animate-bounce"
                    style={{ height: `${h}px`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : isListening ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-medium shadow-lg shadow-rose-900/20 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Listening to Candidate...</span>
              <div className="flex items-center gap-0.5 ml-1">
                {[8, 16, 12, 20, 10].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-rose-400 rounded-full animate-bounce"
                    style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : isAiThinking ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Analyzing Candidate Answer...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/70 border border-gray-700/60 text-gray-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              <span>Ready & Standing By</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAvatarCanvas;
