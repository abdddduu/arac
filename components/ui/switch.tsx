import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export function Switch({ className, ...props }: ComponentProps<'input'>) {
  return (
    <label className={cn('relative inline-flex cursor-pointer items-center', className)}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-slate-900 peer-checked:after:translate-x-5 peer-disabled:opacity-50" />
    </label>
  );
}
