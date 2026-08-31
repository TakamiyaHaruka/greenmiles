// Pure text-layout helpers for the canvas-drawn share posters
// (SharePoster.tsx). Kept free of DOM dependencies so they unit-test easily —
// callers pass a measure function, e.g. ctx.measureText(s).width.

/**
 * Greedy character-based word wrap. Breaks anywhere, which is correct for
 * CJK text and acceptable for the short latin strings on the posters.
 * Overflow beyond maxLines is clipped with an ellipsis on the last line.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
  maxLines = 2
): string[] {
  if (!text || maxLines <= 0) return [];
  const lines: string[] = [];
  let rest = text;

  while (rest.length > 0) {
    if (lines.length === maxLines - 1) {
      // Last allowed line: whatever remains, clipped if too wide
      lines.push(truncateWithEllipsis(rest, maxWidth, measure));
      return lines;
    }
    // Greedily take as many characters as fit
    let take = 0;
    while (take < rest.length && measure(rest.slice(0, take + 1)) <= maxWidth) {
      take += 1;
    }
    if (take === 0) take = 1; // an oversized single char still gets its own line
    lines.push(rest.slice(0, take));
    rest = rest.slice(take);
  }
  return lines;
}

/** Clips a single line to maxWidth, appending "…" when it had to cut. */
export function truncateWithEllipsis(
  text: string,
  maxWidth: number,
  measure: (s: string) => number
): string {
  if (measure(text) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && measure(clipped + '…') > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return clipped + '…';
}

/** Poster-style date: 2026.08.31 */
export function formatPosterDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}
