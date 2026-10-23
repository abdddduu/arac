export function toE164TR(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('90')) return digits;
  if (digits.startsWith('0')) return '90' + digits.slice(1);
  if (digits.length === 10 && digits.startsWith('5')) return '90' + digits;
  return digits;
}

export function waLink(phone: string, text?: string) {
  const digits = toE164TR(phone);
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function telLink(phone: string) {
  return `tel:+${toE164TR(phone)}`;
}
