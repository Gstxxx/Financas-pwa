import { cn, hashHue } from '@/lib/utils';

interface TagProps {
  name: string;
  hue?: number;
  className?: string;
}

/** Legacy text pill. For category entities, prefer CatPill. */
export function Tag({ name, hue, className }: TagProps) {
  const h = hue ?? hashHue(name);
  return (
    <span
      className={cn('pill', className)}
      style={{
        color: `oklch(0.80 0.10 ${h})`,
        borderColor: `oklch(0.40 0.06 ${h} / 0.6)`,
        background: `oklch(0.24 0.04 ${h} / 0.4)`,
      }}
    >
      <span className="dot" style={{ background: `oklch(0.78 0.12 ${h})` }} />
      {name}
    </span>
  );
}
