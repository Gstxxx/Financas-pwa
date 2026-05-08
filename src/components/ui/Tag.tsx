import { cn } from '@/lib/utils';

interface TagProps {
  name: string;
  className?: string;
}

const tagClassMap: Record<string, string> = {
  pai: 'tag-pai',
  amor: 'tag-amor',
  fixo: 'tag-fixo',
  parcelado: 'tag-parcelado',
  servicos: 'tag-servicos',
  outros: 'tag-outros',
};

export function Tag({ name, className }: TagProps) {
  return (
    <span
      className={cn(
        'text-[10.5px] font-medium px-2 py-[3px] rounded-[6px] bg-white/[0.06] text-text-2',
        'tracking-wide uppercase',
        tagClassMap[name.toLowerCase()],
        className
      )}
    >
      {name}
    </span>
  );
}
