import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string | null, currency = 'TRY') {
  if (amount === null || amount === undefined || amount === '') return '—';
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value);
}

export function formatKm(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `${new Intl.NumberFormat('tr-TR').format(n)} km`;
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date);
}
