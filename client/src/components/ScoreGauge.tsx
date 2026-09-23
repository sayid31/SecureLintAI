import { scoreColor } from "../api";

interface ScoreGaugeProps {
  score: number;
}

/** Gauge donut SVG: 0–100, makin tinggi makin hijau. */
export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);

  return (
    <div className="relative mx-auto w-[168px]">
      <svg viewBox="0 0 140 140" className="w-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="12"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color }}
        >
          {clamped}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Security Score
        </span>
      </div>
    </div>
  );
}
