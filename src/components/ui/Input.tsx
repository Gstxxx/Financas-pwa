import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="mb-3.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] text-text-2 mb-1.5 tracking-widest uppercase font-medium"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full bg-bg border border-border-strong rounded-sm px-3.5 py-3 text-base text-text font-sans',
          'transition-colors focus:outline-none focus:border-accent appearance-none',
          className
        )}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="mb-3.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[11px] text-text-2 mb-1.5 tracking-widest uppercase font-medium"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full bg-bg border border-border-strong rounded-sm px-3.5 py-3 text-base text-text font-sans',
          'transition-colors focus:outline-none focus:border-accent appearance-none',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
