import type { ConfidenceScore } from "../types";

interface ProgressBarProps {
  score: ConfidenceScore;
}

export function ProgressBar({ score }: ProgressBarProps) {
  const color = score.tone === "green" ? "bg-success" : "bg-primary";

  return (
    <div className="grid grid-cols-[minmax(120px,1fr)_minmax(110px,190px)_44px] items-center gap-3 text-sm">
      <span className="truncate text-ink">{score.label}</span>
      <span className="h-2 rounded-full bg-slate-200">
        <span className={`block h-2 rounded-full ${color}`} style={{ width: `${score.value}%` }} />
      </span>
      <span className="text-right font-bold text-ink">{score.value}%</span>
    </div>
  );
}
