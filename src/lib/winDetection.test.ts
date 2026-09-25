import { describe, expect, it } from 'vitest';
import type { CardCell } from '../types';
import { checkWin, nearWinIndices } from './winDetection';
import { FREE_INDEX, TOTAL_CELLS } from './cardGeneration';

function buildCells(markedIndices: number[]): CardCell[] {
  return Array.from({ length: TOTAL_CELLS }, (_, i) => ({
    word: i === FREE_INDEX ? 'FREE' : `W${i}`,
    free: i === FREE_INDEX,
    marked: i === FREE_INDEX || markedIndices.includes(i),
  }));
}

describe('checkWin', () => {
  it('reports no win on a freshly dealt card', () => {
    const result = checkWin(buildCells([]));
    expect(result.won).toBe(false);
    expect(result.patterns).toHaveLength(0);
  });

  it('detects a completed row', () => {
    const result = checkWin(buildCells([0, 1, 2, 3, 4]));
    expect(result.won).toBe(true);
    expect(result.patterns).toEqual(['row']);
    expect(result.cellIndices.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it('detects a completed column', () => {
    const result = checkWin(buildCells([0, 5, 10, 15, 20]));
    expect(result.patterns).toEqual(['column']);
  });

  it('detects the main diagonal', () => {
    const result = checkWin(buildCells([0, 6, 18, 24])); // 12 is already free/marked
    expect(result.patterns).toEqual(['diagonal']);
  });

  it('detects the anti-diagonal', () => {
    const result = checkWin(buildCells([4, 8, 16, 20]));
    expect(result.patterns).toEqual(['diagonal']);
  });

  it('detects four corners', () => {
    const result = checkWin(buildCells([0, 4, 20, 24]));
    expect(result.patterns).toEqual(['corners']);
  });

  it('detects blackout and every line it implies', () => {
    const allIndices = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
    const result = checkWin(buildCells(allIndices));
    expect(result.won).toBe(true);
    expect(result.patterns).toContain('blackout');
    expect(result.patterns).toContain('row');
    expect(result.patterns).toContain('column');
    expect(result.cellIndices).toHaveLength(TOTAL_CELLS);
  });

  it('does not confuse a near-complete line with a win', () => {
    const result = checkWin(buildCells([0, 1, 2, 3])); // row missing index 4
    expect(result.won).toBe(false);
  });
});

describe('nearWinIndices', () => {
  it('is empty on a fresh card (only the FREE centre is marked)', () => {
    // FREE alone leaves every line 4 short, never 1.
    expect(nearWinIndices(buildCells([]))).toEqual([]);
  });

  it('names the single missing cell of a row that is one mark short', () => {
    // Row 0 = indices 0..4; mark 0,1,2,3 -> 4 completes it.
    expect(nearWinIndices(buildCells([0, 1, 2, 3]))).toEqual([4]);
  });

  it('collects one cell per near-complete line, deduplicated and sorted', () => {
    // Middle row (10..14, FREE at 12 already marked) missing 14; middle
    // column (2,7,12,17,22) missing 22; corners (0,4,20,24) missing 24.
    const cells = buildCells([10, 11, 13, 2, 7, 17, 0, 4, 20]);
    expect(nearWinIndices(cells)).toEqual([14, 22, 24]);
  });

  it('does not report a line that is already complete', () => {
    expect(nearWinIndices(buildCells([0, 1, 2, 3, 4]))).not.toContain(4);
  });
});
