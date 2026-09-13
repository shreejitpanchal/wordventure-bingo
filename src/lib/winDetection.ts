import type { CardCell, WinPattern, WinResult } from '../types';
import { CARD_SIZE } from './cardGeneration';

function rowIndices(row: number): number[] {
  return Array.from({ length: CARD_SIZE }, (_, col) => row * CARD_SIZE + col);
}
function colIndices(col: number): number[] {
  return Array.from({ length: CARD_SIZE }, (_, row) => row * CARD_SIZE + col);
}
function diagonalIndices(direction: 'main' | 'anti'): number[] {
  return Array.from({ length: CARD_SIZE }, (_, i) =>
    direction === 'main' ? i * CARD_SIZE + i : i * CARD_SIZE + (CARD_SIZE - 1 - i),
  );
}
function cornerIndices(): number[] {
  const last = CARD_SIZE - 1;
  return [0, last, last * CARD_SIZE, last * CARD_SIZE + last];
}

function isLineComplete(cells: CardCell[], indices: number[]): boolean {
  return indices.every((i) => cells[i].marked);
}

/**
 * Checks every standard bingo pattern against the current card state.
 * A card can complete more than one pattern on the same mark (e.g. a row
 * that also happens to be part of a blackout), so this returns all of them.
 */
export function checkWin(cells: CardCell[]): WinResult {
  const patterns: WinPattern[] = [];
  const cellIndices = new Set<number>();

  for (let row = 0; row < CARD_SIZE; row++) {
    const indices = rowIndices(row);
    if (isLineComplete(cells, indices)) {
      patterns.push('row');
      indices.forEach((i) => cellIndices.add(i));
    }
  }

  for (let col = 0; col < CARD_SIZE; col++) {
    const indices = colIndices(col);
    if (isLineComplete(cells, indices)) {
      patterns.push('column');
      indices.forEach((i) => cellIndices.add(i));
    }
  }

  for (const direction of ['main', 'anti'] as const) {
    const indices = diagonalIndices(direction);
    if (isLineComplete(cells, indices)) {
      patterns.push('diagonal');
      indices.forEach((i) => cellIndices.add(i));
    }
  }

  const corners = cornerIndices();
  if (isLineComplete(cells, corners)) {
    patterns.push('corners');
    corners.forEach((i) => cellIndices.add(i));
  }

  if (cells.every((c) => c.marked)) {
    patterns.push('blackout');
    cells.forEach((_, i) => cellIndices.add(i));
  }

  return {
    won: patterns.length > 0,
    patterns,
    cellIndices: Array.from(cellIndices),
  };
}
