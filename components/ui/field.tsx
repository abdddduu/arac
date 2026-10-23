import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Label } from './label';

type FieldProps = {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
};

export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
