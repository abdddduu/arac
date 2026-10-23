import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
