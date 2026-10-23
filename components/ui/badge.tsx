import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

type BadgeVariant = 'default' | 'green' | 'amber' | 'red' | 'blue' | 'slate';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  slate: 'bg-slate-200 text-slate-700',
};

export type BadgeProps = ComponentProps<'span'> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
