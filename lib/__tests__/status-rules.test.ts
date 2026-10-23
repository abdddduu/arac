import { describe, expect, it } from 'vitest';
import {
  daysUntil,
  paintLight,
  tireLight,
  tramerLight,
  tuvturkLight,
  worstLight,
} from '@/lib/status-rules';

describe('paintLight', () => {
  it('returns red when there is heavy damage', () => {
    expect(paintLight([{ state: 'original' }], true)).toBe('red');
  });

  it('returns red when any panel is replaced', () => {
    expect(paintLight([{ state: 'original' }, { state: 'replaced' }], false)).toBe('red');
  });

  it('returns amber when any panel is local_paint, painted or plastic_repair', () => {
    expect(paintLight([{ state: 'local_paint' }], false)).toBe('amber');
    expect(paintLight([{ state: 'painted' }], false)).toBe('amber');
    expect(paintLight([{ state: 'plastic_repair' }], false)).toBe('amber');
  });

  it('returns green for an empty list', () => {
    expect(paintLight([], false)).toBe('green');
  });

  it('returns green when all panels are original', () => {
    expect(paintLight([{ state: 'original' }, { state: 'original' }], false)).toBe('green');
  });
});

describe('tramerLight', () => {
  it('returns red when there is heavy damage', () => {
    expect(tramerLight(0, true)).toBe('red');
  });

  it('returns red when total exceeds the threshold', () => {
    expect(tramerLight(25000, false)).toBe('red');
    expect(tramerLight(25000, false, 20000)).toBe('red');
  });

  it('returns amber when total is between 0 and the threshold inclusive', () => {
    expect(tramerLight(5000, false)).toBe('amber');
    expect(tramerLight(20000, false)).toBe('amber');
  });

  it('returns green when total is 0', () => {
    expect(tramerLight(0, false)).toBe('green');
  });
});

describe('daysUntil', () => {
  it('returns positive days for future dates', () => {
    const now = new Date('2026-10-23T12:00:00Z');
    expect(daysUntil('2026-10-25T12:00:00Z', now)).toBe(2);
  });

  it('returns negative days for past dates', () => {
    const now = new Date('2026-10-23T12:00:00Z');
    expect(daysUntil('2026-10-20T12:00:00Z', now)).toBe(-3);
  });
});

describe('tuvturkLight', () => {
  const now = new Date('2026-10-23T12:00:00Z');

  it('returns unknown when validUntil is null', () => {
    expect(tuvturkLight(null, now)).toBe('unknown');
  });

  it('returns red when expired', () => {
    expect(tuvturkLight('2026-10-20T12:00:00Z', now)).toBe('red');
  });

  it('returns amber when 0-90 days left', () => {
    expect(tuvturkLight('2026-10-25T12:00:00Z', now)).toBe('amber');
    expect(tuvturkLight('2026-12-01T12:00:00Z', now)).toBe('amber');
  });

  it('returns green when more than 90 days left', () => {
    expect(tuvturkLight('2027-02-01T12:00:00Z', now)).toBe('green');
  });
});

describe('tireLight', () => {
  it('returns unknown when treadMm is null', () => {
    expect(tireLight(null)).toBe('unknown');
  });

  it('returns red when tread is below 2mm', () => {
    expect(tireLight(1.5)).toBe('red');
  });

  it('returns amber when tread is below 4mm', () => {
    expect(tireLight(2)).toBe('amber');
    expect(tireLight(3.9)).toBe('amber');
  });

  it('returns green when tread is 4mm or more', () => {
    expect(tireLight(4)).toBe('green');
    expect(tireLight(8)).toBe('green');
  });
});

describe('worstLight', () => {
  it('returns the worst light in a list', () => {
    expect(worstLight(['green', 'amber', 'red'])).toBe('red');
    expect(worstLight(['green', 'unknown', 'amber'])).toBe('amber');
    expect(worstLight(['green', 'unknown'])).toBe('green');
  });

  it('returns unknown for an empty list', () => {
    expect(worstLight([])).toBe('unknown');
  });
});
