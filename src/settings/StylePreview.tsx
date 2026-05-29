import type { ClockStyle } from "../domain/settings";

interface StylePreviewProps {
  style: ClockStyle;
}

function DigitalPreview() {
  return (
    <div style={{ fontSize: "14px", fontFamily: "monospace", height: "48px", display: "flex", alignItems: "center", justifyContent: "center" }}>12:34</div>
  );
}

function AnalogPreviewSVG({ showNumbers, showMarkers }: { showNumbers: boolean; showMarkers: boolean }) {
  const cx = 24;
  const cy = 24;
  const r = 20;

  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="1" />
      {showNumbers &&
        [12, 3, 6, 9].map((h) => {
          const angle = (h * 30 - 90) * (Math.PI / 180);
          return (
            <text
              key={h}
              x={cx + 15 * Math.cos(angle)}
              y={cy + 15 * Math.sin(angle)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="currentColor"
              fontSize="7"
            >
              {h}
            </text>
          );
        })}
      {showMarkers &&
        Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30) * (Math.PI / 180);
          const inner = i % 3 === 0 ? 15 : 17;
          return (
            <line
              key={i}
              x1={cx + inner * Math.sin(angle)}
              y1={cy - inner * Math.cos(angle)}
              x2={cx + r * Math.sin(angle)}
              y2={cy - r * Math.cos(angle)}
              stroke="currentColor"
              strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
            />
          );
        })}
      <line x1={cx} y1={cy} x2={cx} y2={cy - 10} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx + 8} y2={cy + 5} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="1.5" fill="currentColor" />
    </svg>
  );
}

export function StylePreview({ style }: StylePreviewProps) {
  switch (style) {
    case "digital":
      return <DigitalPreview />;
    case "analog-simple":
      return <AnalogPreviewSVG showNumbers={false} showMarkers={false} />;
    case "analog-numbers":
      return <AnalogPreviewSVG showNumbers={true} showMarkers={false} />;
    case "analog-markers":
      return <AnalogPreviewSVG showNumbers={false} showMarkers={true} />;
  }
}
