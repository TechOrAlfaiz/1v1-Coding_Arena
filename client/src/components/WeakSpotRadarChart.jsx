import React from 'react';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * WeakSpotRadarChart
 * Renders an SVG 5-axis radar polygon displaying category proficiency scores
 * and highlights recommended weak spots for targeted preparation.
 */
export default function WeakSpotRadarChart({ radarData = [], size = 300 }) {
  if (!radarData || radarData.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        No battle analytics available yet. Compete in 1v1 arenas to calibrate your radar.
      </div>
    );
  }

  const center = size / 2;
  const radius = (size / 2) - 48;
  const totalAxes = radarData.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  // Normalized coordinate generator
  const getCoordinates = (index, valueNormalized) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = radius * valueNormalized;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Polygon points
  const polygonPoints = radarData.map((item, i) => {
    const normalized = Math.max(0.1, Math.min(1.0, (item.score || 50) / 100));
    const { x, y } = getCoordinates(i, normalized);
    return `${x},${y}`;
  }).join(' ');

  // Identify weak spots (score < 65)
  const weakSpots = radarData.filter((item) => (item.score || 0) < 65);

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 p-2">
      {/* SVG Radar */}
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <radialGradient id="weakSpotGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4FA393" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4FA393" stopOpacity="0.05" />
            </radialGradient>
          </defs>

          {/* Grid Rings */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius * ratio}
              fill="none"
              stroke="#262D3D"
              strokeWidth="1"
              strokeDasharray={idx === 3 ? '' : '3 3'}
            />
          ))}

          {/* Spokes & Axis Labels */}
          {radarData.map((item, i) => {
            const outer = getCoordinates(i, 1.0);
            const labelCoord = getCoordinates(i, 1.25);
            const isWeak = (item.score || 0) < 65;

            return (
              <g key={item.category}>
                <line
                  x1={center}
                  y1={center}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#262D3D"
                  strokeWidth="1"
                />
                <text
                  x={labelCoord.x}
                  y={labelCoord.y}
                  fill={isWeak ? '#D9736A' : '#8B93A1'}
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="monospace"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {item.category}
                </text>
                <text
                  x={labelCoord.x}
                  y={labelCoord.y + 12}
                  fill={isWeak ? '#D9736A' : '#4FA393'}
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {item.score}%
                </text>
              </g>
            );
          })}

          {/* Filled Data Polygon */}
          <polygon
            points={polygonPoints}
            fill="url(#weakSpotGradient)"
            stroke="#4FA393"
            strokeWidth="2"
            className="transition-all duration-700 ease-out"
          />

          {/* Axis Data Points */}
          {radarData.map((item, i) => {
            const normalized = Math.max(0.1, Math.min(1.0, (item.score || 50) / 100));
            const pt = getCoordinates(i, normalized);
            const isWeak = (item.score || 0) < 65;

            return (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill={isWeak ? '#D9736A' : '#4FA393'}
                stroke="#10141C"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      {/* Weak Spot Diagnostics & Actionable Tips */}
      <div className="flex-1 max-w-sm space-y-3 font-mono">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border)]">
          <Target className="w-4 h-4 text-[var(--accent)]" />
          <span>ALGORITHMIC RADAR DIAGNOSTICS</span>
        </div>

        {radarData.map((item) => {
          const isWeak = (item.score || 0) < 65;
          return (
            <div
              key={item.category}
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                isWeak
                  ? 'bg-[var(--error)]/10 border-[var(--error)]/30 text-[var(--error)]'
                  : 'bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-secondary)]'
              }`}
            >
              <div className="flex items-center gap-2">
                {isWeak ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--error)] flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
                )}
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{item.category}</p>
                  <p className="text-[10px] opacity-75">
                    {item.passedMatches || 0} / {item.totalMatches || 0} rounds won
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-sm font-black ${isWeak ? 'text-[var(--error)]' : 'text-[var(--accent)]'}`}>
                  {item.score}%
                </span>
                {isWeak && (
                  <span className="block text-[9px] text-[var(--error)] uppercase tracking-widest font-bold">
                    Weak Spot
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {weakSpots.length > 0 && (
          <div className="p-3 rounded-xl bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] text-[11px] leading-relaxed">
            💡 <span className="font-bold">Recommendation:</span> Focus on{' '}
            <span className="underline">{weakSpots.map((w) => w.category).join(', ')}</span> in solo practice to balance your competitive ranking.
          </div>
        )}
      </div>
    </div>
  );
}
