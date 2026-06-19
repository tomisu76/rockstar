// ─── Match Detector ───────────────────────────────────────────────────────────
// Pure logic – no Phaser dependency.

export interface MatchGroup {
  cells: Array<{ row: number; col: number }>;
  tileType: string;
  length: number;  // how many in the group
}

/**
 * Scans the grid for all horizontal and vertical matches of 3+.
 * Returns an array of MatchGroup objects.
 */
export function detectMatches(grid: string[][], rows: number, cols: number): MatchGroup[] {
  const matched: Set<string> = new Set();
  const groups: MatchGroup[] = [];

  // ── Horizontal ──
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const type = grid[r][c];
      if (!type) { c++; continue; }
      let len = 1;
      while (c + len < cols && grid[r][c + len] === type) len++;
      if (len >= 3) {
        const cells = [];
        for (let k = 0; k < len; k++) cells.push({ row: r, col: c + k });
        groups.push({ cells, tileType: type, length: len });
        cells.forEach(({ row, col }) => matched.add(`${row},${col}`));
      }
      c += len;
    }
  }

  // ── Vertical ──
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const type = grid[r][c];
      if (!type) { r++; continue; }
      let len = 1;
      while (r + len < rows && grid[r + len][c] === type) len++;
      if (len >= 3) {
        const cells = [];
        for (let k = 0; k < len; k++) cells.push({ row: r + k, col: c });
        groups.push({ cells, tileType: type, length: len });
      }
      r += len;
    }
  }

  return groups;
}

/** Collect all unique (row,col) cells that are part of any match. */
export function matchedCells(groups: MatchGroup[]): Set<string> {
  const set = new Set<string>();
  for (const g of groups) {
    for (const c of g.cells) set.add(`${c.row},${c.col}`);
  }
  return set;
}
