import { describe, expect, it } from 'vitest';
import type { CardCell } from '../types';
import { checkWin } from './winDetection';
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
