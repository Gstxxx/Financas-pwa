import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  numeric?: boolean;
}

export function Input({ label, hint, numeric, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <input id={inputId} className={cn('input', numeric && 'num', className)} {...props} />
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>{hint}</div>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, hint, options, className, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label htmlFor={selectId} className="field-label">
          {label}
        </label>
      )}
      <select id={selectId} className={cn('input', className)} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>{hint}</div>
      )}
    </div>
  );
}
