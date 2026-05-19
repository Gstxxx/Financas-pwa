interface ProgressBarProps {
  value: number;
  label?: string;
  color?: string;
}

export function ProgressBar({ value, label, color = 'var(--accent)' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div
        style={{
          height: 3,
          background: 'var(--surface-2)',
          borderRadius: 99,
          overflow: 'hidden',
          marginTop: 2,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            background: color,
            borderRadius: 99,
            transition: 'width 0.6s cubic-bezier(.2,.8,.2,1)',
          }}
        />
      </div>
      {label && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-mute)',
            marginTop: 6,
            fontFamily: 'var(--f-mono)',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
