import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
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
      className={cn('btn', variantClass[variant], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  );
}
