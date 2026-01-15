import { describe, it, expect } from 'vitest';
import {
  getMasteryColorClass,
  getMasteryLabel,
  getMasteryStatus,
  formatStudyTime,
} from '../mastery';

describe('getMasteryColorClass', () => {
  describe('green threshold (85+)', () => {
    it('returns green for score of 85', () => {
      expect(getMasteryColorClass(85)).toBe('text-green-600');
    });

    it('returns green for score of 100', () => {
      expect(getMasteryColorClass(100)).toBe('text-green-600');
    });

    it('returns green for score of 90', () => {
      expect(getMasteryColorClass(90)).toBe('text-green-600');
    });
  });

  describe('amber threshold (60-84)', () => {
    it('returns amber for score of 84', () => {
      expect(getMasteryColorClass(84)).toBe('text-amber-600');
    });

    it('returns amber for score of 60', () => {
      expect(getMasteryColorClass(60)).toBe('text-amber-600');
    });

    it('returns amber for score of 70', () => {
      expect(getMasteryColorClass(70)).toBe('text-amber-600');
    });
  });

  describe('red threshold (1-59)', () => {
    it('returns red for score of 59', () => {
      expect(getMasteryColorClass(59)).toBe('text-red-600');
    });

    it('returns red for score of 1', () => {
      expect(getMasteryColorClass(1)).toBe('text-red-600');
    });

    it('returns red for score of 30', () => {
      expect(getMasteryColorClass(30)).toBe('text-red-600');
    });
  });

  describe('muted threshold (0)', () => {
    it('returns muted-foreground for score of 0', () => {
      expect(getMasteryColorClass(0)).toBe('text-muted-foreground');
    });
  });

  describe('edge cases', () => {
    it('handles decimal just below 85', () => {
      expect(getMasteryColorClass(84.9)).toBe('text-amber-600');
    });

    it('handles decimal just below 60', () => {
      expect(getMasteryColorClass(59.9)).toBe('text-red-600');
    });

    it('handles very small positive number', () => {
      expect(getMasteryColorClass(0.1)).toBe('text-red-600');
    });
  });
});

describe('getMasteryLabel', () => {
  describe('Mastered (85+)', () => {
    it('returns Mastered for 85', () => {
      expect(getMasteryLabel(85)).toBe('Mastered');
    });

    it('returns Mastered for 100', () => {
      expect(getMasteryLabel(100)).toBe('Mastered');
    });
  });

  describe('Developing (60-84)', () => {
    it('returns Developing for 84', () => {
      expect(getMasteryLabel(84)).toBe('Developing');
    });

    it('returns Developing for 60', () => {
      expect(getMasteryLabel(60)).toBe('Developing');
    });
  });

  describe('In Progress (1-59)', () => {
    it('returns In Progress for 59', () => {
      expect(getMasteryLabel(59)).toBe('In Progress');
    });

    it('returns In Progress for 1', () => {
      expect(getMasteryLabel(1)).toBe('In Progress');
    });
  });

  describe('Not Started (0)', () => {
    it('returns Not Started for 0', () => {
      expect(getMasteryLabel(0)).toBe('Not Started');
    });
  });
});

describe('getMasteryStatus', () => {
  describe('Exam Ready (85+)', () => {
    it('returns correct status for 85', () => {
      const status = getMasteryStatus(85);
      expect(status.label).toBe('Exam Ready');
      expect(status.variant).toBe('default');
    });

    it('returns correct status for 100', () => {
      const status = getMasteryStatus(100);
      expect(status.label).toBe('Exam Ready');
      expect(status.variant).toBe('default');
    });
  });

  describe('Developing (60-84)', () => {
    it('returns correct status for 84', () => {
      const status = getMasteryStatus(84);
      expect(status.label).toBe('Developing');
      expect(status.variant).toBe('secondary');
    });

    it('returns correct status for 60', () => {
      const status = getMasteryStatus(60);
      expect(status.label).toBe('Developing');
      expect(status.variant).toBe('secondary');
    });
  });

  describe('Building Foundation (1-59)', () => {
    it('returns correct status for 59', () => {
      const status = getMasteryStatus(59);
      expect(status.label).toBe('Building Foundation');
      expect(status.variant).toBe('outline');
    });

    it('returns correct status for 1', () => {
      const status = getMasteryStatus(1);
      expect(status.label).toBe('Building Foundation');
      expect(status.variant).toBe('outline');
    });
  });

  describe('Not Started (0)', () => {
    it('returns correct status for 0', () => {
      const status = getMasteryStatus(0);
      expect(status.label).toBe('Not Started');
      expect(status.variant).toBe('outline');
    });
  });
});

describe('formatStudyTime', () => {
  describe('minutes only (under 60)', () => {
    it('formats 0 minutes', () => {
      expect(formatStudyTime(0)).toBe('0m');
    });

    it('formats 30 minutes', () => {
      expect(formatStudyTime(30)).toBe('30m');
    });

    it('formats 59 minutes', () => {
      expect(formatStudyTime(59)).toBe('59m');
    });

    it('formats 1 minute', () => {
      expect(formatStudyTime(1)).toBe('1m');
    });
  });

  describe('hours only (exact multiples of 60)', () => {
    it('formats 60 minutes as 1h', () => {
      expect(formatStudyTime(60)).toBe('1h');
    });

    it('formats 120 minutes as 2h', () => {
      expect(formatStudyTime(120)).toBe('2h');
    });

    it('formats 180 minutes as 3h', () => {
      expect(formatStudyTime(180)).toBe('3h');
    });
  });

  describe('mixed hours and minutes', () => {
    it('formats 61 minutes as 1h 1m', () => {
      expect(formatStudyTime(61)).toBe('1h 1m');
    });

    it('formats 90 minutes as 1h 30m', () => {
      expect(formatStudyTime(90)).toBe('1h 30m');
    });

    it('formats 125 minutes as 2h 5m', () => {
      expect(formatStudyTime(125)).toBe('2h 5m');
    });

    it('formats 605 minutes as 10h 5m', () => {
      expect(formatStudyTime(605)).toBe('10h 5m');
    });

    it('formats 119 minutes as 1h 59m', () => {
      expect(formatStudyTime(119)).toBe('1h 59m');
    });
  });

  describe('edge cases', () => {
    it('handles large values', () => {
      expect(formatStudyTime(1440)).toBe('24h'); // full day
    });

    it('handles very large values', () => {
      expect(formatStudyTime(10000)).toBe('166h 40m');
    });
  });
});
