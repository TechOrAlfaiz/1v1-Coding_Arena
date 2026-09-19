import React from 'react';

/**
 * RubricRadarChart Component
 * SVG-based 8-axis radar chart displaying 0-5 rubric ratings
 */
const AXES = [
  { key: 'problemSolving', label: 'Problem Solving' },
  { key: 'codeQuality', label: 'Code Quality' },
  { key: 'technicalKnowledge', label: 'Tech Knowledge' },
  { key: 'communication', label: 'Communication' },
  { key: 'complexityAnalysis', label: 'Complexity' },
  { key: 'edgeCaseHandling', label: 'Edge Cases' },
  { key: 'systemDesign', label: 'System Design' },
  { key: 'behavioralResponse', label: 'Behavioral' },
];

export const RubricRadarChart = ({ rubric = {}, size = 320 }) => {
  const center = size / 2;
  const radius = (size / 2) - 45;
  const totalAxes = AXES.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  // Compute coordinate for an axis at a specific normalized value (0 to 1)
  const getCoordinates = (index, valueNormalized) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = radius * valueNormalized;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Polygon points for candidate scores
  const polygonPoints = AXES.map((axis, i) => {
    const score = Math.max(0, Math.min(5, rubric[axis.key] || 3.0));
    const normalized = score / 5;
    const { x, y } = getCoordinates(i, normalized);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4FA393" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4FA393" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* Concentric Grid Circles (1 to 5) */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((ratio, idx) => (
          <circle
            key={idx}
            cx={center}
            cy={center}
            r={radius * ratio}
            fill="none"
            stroke="#262D3D"
            strokeWidth="1"
            strokeDasharray={idx === 4 ? '' : '3 3'}
          />
        ))}

        {/* Axis Spokes & Labels */}
        {AXES.map((axis, i) => {
          const outer = getCoordinates(i, 1.0);
          const labelCoord = getCoordinates(i, 1.22);
          const score = (rubric[axis.key] || 3.0).toFixed(1);

          return (
            <g key={axis.key}>
              {/* Spoke Line */}
              <line
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="#262D3D"
                strokeWidth="1"
              />

              {/* Axis Label */}
              <text
                x={labelCoord.x}
                y={labelCoord.y}
                fill="#8B93A1"
                fontSize="10"
                fontFamily="Inter, sans-serif"
                fontWeight="500"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {axis.label}
              </text>

              {/* Axis Score Tag */}
              <text
                x={labelCoord.x}
                y={labelCoord.y + 12}
                fill="#4FA393"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="600"
                textAnchor="middle"
              >
                {score}/5
              </text>
            </g>
          );
        })}

        {/* Candidate Rating Polygon */}
        <polygon
          points={polygonPoints}
          fill="url(#radarGradient)"
          stroke="#4FA393"
          strokeWidth="1.5"
          className="transition-all duration-500"
        />

        {/* Vertex Dots */}
        {AXES.map((axis, i) => {
          const score = Math.max(0, Math.min(5, rubric[axis.key] || 3.0));
          const { x, y } = getCoordinates(i, score / 5);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              fill="#4FA393"
              stroke="#161B22"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
};

export default RubricRadarChart;
