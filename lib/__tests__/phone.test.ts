import { describe, expect, it } from 'vitest';
import { telLink, toE164TR, waLink } from '@/lib/phone';

describe('toE164TR', () => {
  it('converts Turkish mobile numbers', () => {
    expect(toE164TR('05321234567')).toBe('905321234567');
    expect(toE164TR('5321234567')).toBe('905321234567');
    expect(toE164TR('+90 532 123 45 67')).toBe('905321234567');
    expect(toE164TR('0 532 123 45 67')).toBe('905321234567');
  });

  it('keeps other international numbers as digits', () => {
    expect(toE164TR('+49 30 1234567')).toBe('49301234567');
    expect(toE164TR('+1 212 555 0100')).toBe('12125550100');
  });

  it('returns empty string for empty input', () => {
    expect(toE164TR('')).toBe('');
    expect(toE164TR('abc')).toBe('');
  });
});

describe('waLink', () => {
  it('builds a wa.me link', () => {
    expect(waLink('05321234567')).toBe('https://wa.me/905321234567');
  });

  it('encodes the text', () => {
    expect(waLink('05321234567', 'Merhaba, arac hakkında bilgi almak istiyorum.')).toBe(
      'https://wa.me/905321234567?text=Merhaba%2C%20arac%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.',
    );
  });
});

describe('telLink', () => {
  it('builds a tel link', () => {
    expect(telLink('0532 123 45 67')).toBe('tel:+905321234567');
  });
});
