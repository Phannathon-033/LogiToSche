import { Info } from "lucide-react";
import type { ConfidenceScore } from "../types";
import { Card } from "./Card";
import { ProgressBar } from "./ProgressBar";

interface ConfidenceCardProps {
  overall: number;
  scores: ConfidenceScore[];
}

export function ConfidenceCard({ overall, scores }: ConfidenceCardProps) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (overall / 100) * circumference;

  return (
    <Card title="ความมั่นใจ / Confidence" icon={<Info className="h-4 w-4 text-slate-500" aria-hidden="true" />} className="h-full">
      <div className="grid items-center gap-5 sm:grid-cols-[110px_1fr]">
        <div className="relative mx-auto h-[110px] w-[110px]">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-label={`Overall confidence ${overall}%`}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#1D4ED8"
              strokeLinecap="round"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-2xl font-extrabold text-primary">{overall}%</span>
        </div>
        <div className="space-y-3">
          {scores.map((score) => (
            <ProgressBar key={score.label} score={score} />
          ))}
        </div>
      </div>
    </Card>
  );
}
