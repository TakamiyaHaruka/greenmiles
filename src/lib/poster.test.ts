import { describe, it, expect } from 'vitest';
import { wrapText, truncateWithEllipsis, formatPosterDate } from './poster';

// Deterministic fake measure: every character is 10px wide
const measure = (s: string) => s.length * 10;

describe('truncateWithEllipsis', () => {
  it('returns the text unchanged when it fits', () => {
    expect(truncateWithEllipsis('abcdef', 100, measure)).toBe('abcdef');
  });

  it('clips and appends an ellipsis when too wide', () => {
    // 100px budget: 'abc…' is 4 chars = 40px… wait, ellipsis counts too
    expect(truncateWithEllipsis('abcdefgh', 40, measure)).toBe('abc…');
  });

  it('never returns an empty string for non-empty input', () => {
    expect(truncateWithEllipsis('ab', 5, measure)).toBe('a…');
  });
});

describe('wrapText', () => {
  it('returns a single line when everything fits', () => {
    expect(wrapText('abcdefghij', 100, measure)).toEqual(['abcdefghij']);
  });

  it('splits across the max width', () => {
    expect(wrapText('abcdefghijklmn', 100, measure)).toEqual(['abcdefghij', 'klmn']);
  });

  it('clips with an ellipsis when exceeding maxLines', () => {
    // 3+ lines needed with maxLines 2 → second line clips so line+ellipsis fits the width
    expect(wrapText('abcdefghijklmnopqrstuvwxyz', 100, measure, 2)).toEqual(['abcdefghij', 'klmnopqrs…']);
  });

  it('handles empty text', () => {
    expect(wrapText('', 100, measure)).toEqual([]);
  });
});

describe('formatPosterDate', () => {
  it('formats with zero-padded month and day', () => {
    expect(formatPosterDate(new Date(2026, 7, 31))).toBe('2026.08.31');
    expect(formatPosterDate(new Date(2026, 0, 5))).toBe('2026.01.05');
  });
});
