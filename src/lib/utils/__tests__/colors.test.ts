import { describe, it, expect } from 'vitest';
import { getDomainColorHex, getMasteryDotColorClass } from '../colors';

describe('getDomainColorHex', () => {
  it('returns blue hex for "blue"', () => {
    expect(getDomainColorHex('blue')).toBe('#3b82f6');
  });

  it('returns purple hex for "purple"', () => {
    expect(getDomainColorHex('purple')).toBe('#a855f7');
  });

  it('returns green hex for "green"', () => {
    expect(getDomainColorHex('green')).toBe('#22c55e');
  });

  it('returns orange hex for "orange"', () => {
    expect(getDomainColorHex('orange')).toBe('#f97316');
  });

  it('returns red hex for "red"', () => {
    expect(getDomainColorHex('red')).toBe('#ef4444');
  });

  it('returns fallback gray for unknown color', () => {
    expect(getDomainColorHex('magenta')).toBe('#6b7280');
  });

  it('returns fallback gray for empty string', () => {
    expect(getDomainColorHex('')).toBe('#6b7280');
  });
});

describe('getMasteryDotColorClass', () => {
  describe('green threshold (85+)', () => {
    it('returns green for 85', () => {
      expect(getMasteryDotColorClass(85)).toBe('bg-green-500');
    });

    it('returns green for 100', () => {
      expect(getMasteryDotColorClass(100)).toBe('bg-green-500');
    });
  });

  describe('amber threshold (60-84)', () => {
    it('returns amber for 84', () => {
      expect(getMasteryDotColorClass(84)).toBe('bg-amber-500');
    });

    it('returns amber for 60', () => {
      expect(getMasteryDotColorClass(60)).toBe('bg-amber-500');
    });
  });

  describe('red threshold (1-59)', () => {
    it('returns red for 59', () => {
      expect(getMasteryDotColorClass(59)).toBe('bg-red-500');
    });

    it('returns red for 1', () => {
      expect(getMasteryDotColorClass(1)).toBe('bg-red-500');
    });
  });

  describe('muted threshold (0)', () => {
    it('returns muted for 0', () => {
      expect(getMasteryDotColorClass(0)).toBe('bg-muted-foreground/30');
    });
  });
});
