interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-center py-10 px-5 text-text-3 text-sm bg-surface border border-dashed border-border-strong rounded-[18px]">
      {message}
    </div>
  );
}
