interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-0.5">
        <div
          className="h-full progress-gradient rounded-full transition-all duration-600"
          style={{
            width: `${clamped}%`,
            transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
          }}
        />
      </div>
      {label && (
        <div className="text-[11px] text-text-3 mt-1 tabular-nums">{label}</div>
      )}
    </div>
  );
}
