import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slug';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Ankara Oto')).toBe('ankara-oto');
  });

  it('maps lowercase Turkish characters', () => {
    expect(slugify('çağrı öztürk şirketi')).toBe('cagri-ozturk-sirketi');
  });

  it('maps uppercase Turkish characters', () => {
    expect(slugify('İSTANBUL GARAJI')).toBe('istanbul-garaji');
    expect(slugify('ÇAĞRI ÖZTÜRK')).toBe('cagri-ozturk');
  });

  it('removes special characters and collapses separators', () => {
    expect(slugify('  Çetin & Koç  ')).toBe('cetin-koc');
    expect(slugify('Bayi---X')).toBe('bayi-x');
  });

  it('returns an empty string for an empty input', () => {
    expect(slugify('')).toBe('');
  });
});
