import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-text text-bg',
  ghost: 'bg-transparent text-text-2 border border-border-strong',
  danger: 'bg-transparent text-critical border border-critical/30',
};

export function Button({
  variant = 'primary',
  fullWidth = true,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'py-3.5 rounded-sm font-display text-[15px] font-semibold tracking-tight cursor-pointer transition-all',
        'active:scale-[0.98]',
        fullWidth && 'w-full',
        variant === 'primary' && 'mt-2',
        variant === 'ghost' && 'mt-1.5',
        variant === 'danger' && 'mt-3.5 py-3 text-sm font-medium font-sans',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
