interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--ink-mute)',
        fontSize: 14,
        borderStyle: 'dashed',
      }}
    >
      {message}
    </div>
  );
}
