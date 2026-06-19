// ─── Board ────────────────────────────────────────────────────────────────────
// Manages the 2-D grid of tile types (string[][]) and pure grid mutations.
// Phaser visual objects are managed by GameScene; Board is logic-only.

import { NORMAL_TILE_TYPES } from '../config/TileDefs';
import { detectMatches, matchedCells, MatchGroup } from './MatchDetector';

export interface FallingTile {
  row: number;
  col: number;
  fromRow: number; // visual origin row
}

export interface NewTile {
  row: number;
  col: number;
  tileType: string;
  dropFrom: number; // rows above 0 to start drop animation from
}

export interface ResolveResult {
  groups: MatchGroup[];
  clearedCells: Array<{ row: number; col: number }>;
  powerUpCreated: Array<{ row: number; col: number; type: string }>; // cells that become power-ups
  fallen: FallingTile[];
  newTiles: NewTile[];
  tileTypeCounts: Record<string, number>;
  isCascade: boolean;
  obstaclesCleared: Array<{ row: number; col: number; type: 'locked' | 'fog' }>;
  activeObstacleCount: number;
}

export interface PowerUpResult {
  clearedCells: Array<{ row: number; col: number }>;
  obstaclesCleared: Array<{ row: number; col: number; type: 'locked' | 'fog' }>;
  tileTypeCounts: Record<string, number>;
}

// ── Deterministic test board ──────────────────────────────────────────────────
// Used when ?testMode=1 is in the URL.
// Guarantees:
//  • No starting matches (no 3-in-a-row anywhere)
//  • At least one valid adjacent swap (row 0, col 2 ↔ col 3 creates a music_note match)
//
// Swap proof:
//  Row 0 = ['music_note','music_note','star','music_note',...]
//  Swap col2(star) ↔ col3(music_note) → ['music_note','music_note','music_note','star',...]
//  → 3-match on music_note at (0,0),(0,1),(0,2) ✓
export const TEST_BOARD_GRID: string[][] = [
  ['music_note',    'music_note',    'star',          'music_note',    'star',          'spotlight',     'speaker',       'silver_record'],
  ['star',          'spotlight',     'speaker',       'silver_record', 'gold_record',   'music_note',    'star',          'spotlight'    ],
  ['spotlight',     'speaker',       'gold_record',   'star',          'music_note',    'silver_record', 'spotlight',     'speaker'      ],
  ['speaker',       'gold_record',   'silver_record', 'spotlight',     'star',          'speaker',       'gold_record',   'music_note'   ],
  ['gold_record',   'star',          'music_note',    'speaker',       'spotlight',     'gold_record',   'silver_record', 'star'         ],
  ['silver_record', 'music_note',    'spotlight',     'gold_record',   'silver_record', 'star',          'music_note',    'spotlight'    ],
  ['music_note',    'spotlight',     'star',          'music_note',    'speaker',       'silver_record', 'star',          'gold_record'  ],
  ['spotlight',     'silver_record', 'music_note',    'star',          'gold_record',   'speaker',       'music_note',    'silver_record'],
];

// The guaranteed valid swap for testMode
export const TEST_SWAP_A = { row: 0, col: 2 }; // star
export const TEST_SWAP_B = { row: 0, col: 3 }; // music_note → creates NNN match at row 0

export interface Cell {
  row: number;
  col: number;
}

export const DEAD_BOARD_GRID: string[][] = [
  ['gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record'],
  ['silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note'   ],
  ['music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record'  ],
  ['gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record'],
  ['silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note'   ],
  ['music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record'  ],
  ['gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record'],
  ['silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note',    'gold_record',   'silver_record', 'music_note'   ],
];

export class Board {
  readonly rows: number;
  readonly cols: number;
  readonly testMode: boolean;
  private grid: string[][];
  private locked: boolean[][];
  private fog: number[][]; // 0 = no fog, 1 = fog covered

  constructor(
    rows: number,
    cols: number,
    tileTypes: string[],
    testMode = false,
    lockedPositions: Array<{ row: number; col: number }> = [],
    fogPositions: Array<{ row: number; col: number }> = [],
    forceDeadBoard = false
  ) {
    this.rows = rows;
    this.cols = cols;
    this.testMode = testMode;
    
    if (forceDeadBoard) {
      this.grid = DEAD_BOARD_GRID.map(row => [...row]);
    } else {
      this.grid = testMode
        ? this.buildTestGrid()
        : this.buildInitialGrid(tileTypes);
    }

    this.locked = Array.from({ length: rows }, () => Array(cols).fill(false));
    this.fog = Array.from({ length: rows }, () => Array(cols).fill(0));

    // Load configured obstacles
    for (const pos of lockedPositions) {
      if (pos.row >= 0 && pos.row < rows && pos.col >= 0 && pos.col < cols) {
        this.locked[pos.row][pos.col] = true;
      }
    }
    for (const pos of fogPositions) {
      if (pos.row >= 0 && pos.row < rows && pos.col >= 0 && pos.col < cols) {
        this.fog[pos.row][pos.col] = 1;
      }
    }

    // In testMode, inject deterministic test obstacles:
    if (this.testMode && !forceDeadBoard) {
      this.locked[5][2] = true; // locked spotlight
      this.fog[3][6] = 1;      // fogged gold_record
    }
  }

  // ── Accessors ────────────────────────────────────────────────────────────
  getCell(r: number, c: number): string {
    return this.grid[r]?.[c] ?? '';
  }

  setCell(r: number, c: number, type: string): void {
    if (this.grid[r]) {
      this.grid[r][c] = type;
    }
  }

  getGrid(): string[][] {
    return this.grid.map(row => [...row]);
  }

  isLocked(r: number, c: number): boolean {
    return this.locked[r]?.[c] ?? false;
  }

  hasFog(r: number, c: number): boolean {
    return (this.fog[r]?.[c] ?? 0) > 0;
  }

  setLocked(r: number, c: number, value: boolean): void {
    if (this.locked[r]) {
      this.locked[r][c] = value;
    }
  }

  setFog(r: number, c: number, value: number): void {
    if (this.fog[r]) {
      this.fog[r][c] = value;
    }
  }

  getActiveObstacleCount(): number {
    let count = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.locked[r][c]) count++;
        if (this.fog[r][c] > 0) count++;
      }
    }
    return count;
  }

  // ── Swap ─────────────────────────────────────────────────────────────────
  /** Returns true if (r1,c1) and (r2,c2) are adjacent and neither is locked. */
  canSwap(r1: number, c1: number, r2: number, c2: number): boolean {
    if (this.isLocked(r1, c1) || this.isLocked(r2, c2)) {
      return false;
    }
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  swap(r1: number, c1: number, r2: number, c2: number): void {
    const tmp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = tmp;
  }

  /** After swap, check if there's at least one match. Does NOT mutate permanently. */
  hasMatchAfterSwap(r1: number, c1: number, r2: number, c2: number): boolean {
    this.swap(r1, c1, r2, c2);
    const groups = detectMatches(this.grid, this.rows, this.cols);
    this.swap(r1, c1, r2, c2); // revert
    return groups.length > 0;
  }

  wouldSwapCreateMatch(r1: number, c1: number, r2: number, c2: number): boolean {
    if (r1 < 0 || r1 >= this.rows || c1 < 0 || c1 >= this.cols) return false;
    if (r2 < 0 || r2 >= this.rows || c2 < 0 || c2 >= this.cols) return false;
    if (!this.canSwap(r1, c1, r2, c2)) return false;
    if (!this.grid[r1]?.[c1] || !this.grid[r2]?.[c2]) return false;

    // A swap is valid if it contains a power-up or creates a match
    const powerUps = ['microphone_blast', 'spotlight_burst', 'stage_explosion', 'superstar_power'];
    const hasPowerUp = powerUps.includes(this.grid[r1][c1]) || powerUps.includes(this.grid[r2][c2]);
    if (hasPowerUp) {
      return true;
    }

    return this.hasMatchAfterSwap(r1, c1, r2, c2);
  }

  findValidMoves(): Array<{ from: Cell; to: Cell }> {
    const moves: Array<{ from: Cell; to: Cell }> = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols) {
          if (this.wouldSwapCreateMatch(r, c, r, c + 1)) {
            moves.push({ from: { row: r, col: c }, to: { row: r, col: c + 1 } });
          }
        }
        if (r + 1 < this.rows) {
          if (this.wouldSwapCreateMatch(r, c, r + 1, c)) {
            moves.push({ from: { row: r, col: c }, to: { row: r + 1, col: c } });
          }
        }
      }
    }
    return moves;
  }

  hasAnyValidMove(): boolean {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols && this.wouldSwapCreateMatch(r, c, r, c + 1)) {
          return true;
        }
        if (r + 1 < this.rows && this.wouldSwapCreateMatch(r, c, r + 1, c)) {
          return true;
        }
      }
    }
    return false;
  }

  shuffle(): boolean {
    const movableCoords: Cell[] = [];
    const movableValues: string[] = [];
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.locked[r][c] && this.grid[r][c]) {
          movableCoords.push({ row: r, col: c });
          movableValues.push(this.grid[r][c]);
        }
      }
    }

    if (movableCoords.length === 0) return false;

    const shuffleArray = (arr: any[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
    };

    // Try 20 times to find a clean state (no matches, has valid moves)
    for (let attempt = 0; attempt < 20; attempt++) {
      shuffleArray(movableValues);
      for (let i = 0; i < movableCoords.length; i++) {
        const { row, col } = movableCoords[i];
        this.grid[row][col] = movableValues[i];
      }

      const matches = detectMatches(this.grid, this.rows, this.cols);
      if (matches.length === 0 && this.hasAnyValidMove()) {
        return true;
      }
    }

    // Relax the "no matches" constraint and check again up to 20 times
    for (let attempt = 0; attempt < 20; attempt++) {
      shuffleArray(movableValues);
      for (let i = 0; i < movableCoords.length; i++) {
        const { row, col } = movableCoords[i];
        this.grid[row][col] = movableValues[i];
      }
      if (this.hasAnyValidMove()) {
        return true;
      }
    }

    // Safely regenerate movable cells if needed
    const uniqueTypes = Array.from(new Set(movableValues.filter(t => NORMAL_TILE_TYPES.includes(t as any))));
    const allowedTypes = uniqueTypes.length > 0 ? uniqueTypes : NORMAL_TILE_TYPES;

    for (let attempt = 0; attempt < 20; attempt++) {
      for (const { row, col } of movableCoords) {
        let t: string;
        let tries = 0;
        do {
          t = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
          tries++;
        } while (tries < 10 && this.wouldMatchAt(this.grid, row, col, t));
        this.grid[row][col] = t;
      }

      if (this.hasAnyValidMove()) {
        return true;
      }
    }

    return false;
  }

  // ── Resolve (match → clear → fall → refill) ───────────────────────────────
  /**
   * Applies one resolve pass on the current grid state.
   * Returns what changed so the scene can animate it.
   */
  resolve(isCascade = false): ResolveResult | null {
    const groups = detectMatches(this.grid, this.rows, this.cols);
    
    let hasEmpty = false;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c]) {
          hasEmpty = true;
          break;
        }
      }
      if (hasEmpty) break;
    }

    if (groups.length === 0 && !hasEmpty) return null;

    const matched = matchedCells(groups);
    const tileTypeCounts: Record<string, number> = {};
    const powerUpCreated: Array<{ row: number; col: number; type: string }> = [];
    const clearedCells: Array<{ row: number; col: number }> = [];
    const obstaclesCleared: Array<{ row: number; col: number; type: 'locked' | 'fog' }> = [];

    // 1. Detect adjacent locked tiles to clear
    const adjacentLocked = new Set<string>();
    for (const key of matched) {
      const [r, c] = key.split(',').map(Number);
      const neighbors = [
        { r: r - 1, c }, { r: r + 1, c },
        { r, c: c - 1 }, { r, c: c + 1 }
      ];
      for (const n of neighbors) {
        if (n.r >= 0 && n.r < this.rows && n.c >= 0 && n.c < this.cols) {
          if (this.locked[n.r][n.c]) {
            adjacentLocked.add(`${n.r},${n.c}`);
          }
        }
      }
    }

    // 2. Process matched cells
    for (const key of matched) {
      const [r, c] = key.split(',').map(Number);
      const t = this.grid[r][c];
      if (!t) continue;

      if (this.fog[r][c] > 0) {
        // Fog covered: remove fog layer, tile stays
        this.fog[r][c] = 0;
        obstaclesCleared.push({ row: r, col: c, type: 'fog' });
      } else {
        // Clear tile
        if (this.locked[r][c]) {
          this.locked[r][c] = false;
          obstaclesCleared.push({ row: r, col: c, type: 'locked' });
        }
        tileTypeCounts[t] = (tileTypeCounts[t] || 0) + 1;
        clearedCells.push({ row: r, col: c });
      }
    }

    // 3. Process adjacent locked cells
    for (const key of adjacentLocked) {
      const [r, c] = key.split(',').map(Number);
      if (this.locked[r][c]) {
        this.locked[r][c] = false;
        obstaclesCleared.push({ row: r, col: c, type: 'locked' });

        const t = this.grid[r][c];
        if (t) {
          tileTypeCounts[t] = (tileTypeCounts[t] || 0) + 1;
          clearedCells.push({ row: r, col: c });
        }
      }
    }

    // 4. Identify power-up creations from matched groups
    const horizontalGroups: MatchGroup[] = [];
    const verticalGroups: MatchGroup[] = [];
    for (const g of groups) {
      if (g.cells.length >= 2) {
        if (g.cells[0].row === g.cells[1].row) {
          horizontalGroups.push(g);
        } else {
          verticalGroups.push(g);
        }
      }
    }

    const consumedH = new Set<number>();
    const consumedV = new Set<number>();

    // T/L matches -> Spotlight Burst
    for (let i = 0; i < horizontalGroups.length; i++) {
      const h = horizontalGroups[i];
      for (let j = 0; j < verticalGroups.length; j++) {
        const v = verticalGroups[j];
        if (h.tileType === v.tileType) {
          const intersect = h.cells.find(hc => v.cells.some(vc => vc.row === hc.row && vc.col === hc.col));
          if (intersect) {
            consumedH.add(i);
            consumedV.add(j);
            powerUpCreated.push({ row: intersect.row, col: intersect.col, type: 'spotlight_burst' });
          }
        }
      }
    }

    // Match 5 H -> Superstar
    for (let i = 0; i < horizontalGroups.length; i++) {
      if (consumedH.has(i)) continue;
      const h = horizontalGroups[i];
      if (h.length >= 5) {
        consumedH.add(i);
        const mid = h.cells[Math.floor(h.cells.length / 2)];
        powerUpCreated.push({ row: mid.row, col: mid.col, type: 'superstar_power' });
      }
    }

    // Match 5 V -> Superstar
    for (let j = 0; j < verticalGroups.length; j++) {
      if (consumedV.has(j)) continue;
      const v = verticalGroups[j];
      if (v.length >= 5) {
        consumedV.add(j);
        const mid = v.cells[Math.floor(v.cells.length / 2)];
        powerUpCreated.push({ row: mid.row, col: mid.col, type: 'superstar_power' });
      }
    }

    // Match 4 H -> Microphone Blast
    for (let i = 0; i < horizontalGroups.length; i++) {
      if (consumedH.has(i)) continue;
      const h = horizontalGroups[i];
      if (h.length === 4) {
        consumedH.add(i);
        const mid = h.cells[Math.floor(h.cells.length / 2)];
        powerUpCreated.push({ row: mid.row, col: mid.col, type: 'microphone_blast' });
      }
    }

    // Match 4 V -> Microphone Blast
    for (let j = 0; j < verticalGroups.length; j++) {
      if (consumedV.has(j)) continue;
      const v = verticalGroups[j];
      if (v.length === 4) {
        consumedV.add(j);
        const mid = v.cells[Math.floor(v.cells.length / 2)];
        powerUpCreated.push({ row: mid.row, col: mid.col, type: 'microphone_blast' });
      }
    }

    // 5. Mutate grid for cleared cells
    for (const { row, col } of clearedCells) {
      this.grid[row][col] = '';
    }

    // 6. Place power-ups after clearing
    for (const pu of powerUpCreated) {
      this.grid[pu.row][pu.col] = pu.type;
      this.locked[pu.row][pu.col] = false;
      this.fog[pu.row][pu.col] = 0;
    }

    // 7. Apply segment-aware gravity
    const fallen = this.applyGravity();

    // 8. Refill segments
    const newTiles = this.refill();

    return {
      groups,
      clearedCells,
      powerUpCreated,
      fallen,
      newTiles,
      tileTypeCounts,
      isCascade,
      obstaclesCleared,
      activeObstacleCount: this.getActiveObstacleCount()
    };
  }

  // ── Power-up activation ───────────────────────────────────────────────────
  activatePowerUp(r: number, c: number, type: string, targetType?: string): PowerUpResult {
    const clearedCells: Array<{ row: number; col: number }> = [];
    const obstaclesCleared: Array<{ row: number; col: number; type: 'locked' | 'fog' }> = [];
    const tileTypeCounts: Record<string, number> = {};

    const addCell = (row: number, col: number) => {
      if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
        const t = this.grid[row][col];
        if (t) {
          if (this.fog[row][col] > 0) {
            // Power-up clears fog layer, tile stays
            this.fog[row][col] = 0;
            obstaclesCleared.push({ row, col, type: 'fog' });
          } else {
            // Power-up clears lock and tile
            if (this.locked[row][col]) {
              this.locked[row][col] = false;
              obstaclesCleared.push({ row, col, type: 'locked' });
            }
            tileTypeCounts[t] = (tileTypeCounts[t] || 0) + 1;
            clearedCells.push({ row, col });
            this.grid[row][col] = '';
          }
        }
      }
    };

    if (type === 'microphone_blast') {
      const clearRow = this.testMode ? (c !== 2) : (Math.random() < 0.5);
      if (clearRow) {
        for (let col = 0; col < this.cols; col++) addCell(r, col);
      } else {
        for (let row = 0; row < this.rows; row++) addCell(row, c);
      }
    } else if (type === 'spotlight_burst') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          addCell(r + dr, c + dc);
        }
      }
    } else if (type === 'stage_explosion') {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          addCell(r + dr, c + dc);
        }
      }
    } else if (type === 'superstar_power') {
      const tType = targetType || NORMAL_TILE_TYPES[Math.floor(Math.random() * NORMAL_TILE_TYPES.length)];
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          if (this.grid[row][col] === tType) {
            addCell(row, col);
          }
        }
      }
      addCell(r, c);
    }

    return { clearedCells, obstaclesCleared, tileTypeCounts };
  }

  triggerStageExplosion(r: number, c: number): PowerUpResult {
    return this.activatePowerUp(r, c, 'stage_explosion');
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  /** Returns a deep copy of the hardcoded test grid. */
  private buildTestGrid(): string[][] {
    return TEST_BOARD_GRID.map(row => [...row]);
  }

  private buildInitialGrid(tileTypes: string[]): string[][] {
    const grid: string[][] = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill('')
    );

    // Fill with random tiles, re-rolling to avoid starting matches
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let t: string;
        let tries = 0;
        do {
          t = tileTypes[Math.floor(Math.random() * tileTypes.length)];
          tries++;
        } while (tries < 20 && this.wouldMatchAt(grid, r, c, t));
        grid[r][c] = t;
      }
    }
    return grid;
  }

  private wouldMatchAt(grid: string[][], r: number, c: number, t: string): boolean {
    // Check left 2
    if (c >= 2 && grid[r][c - 1] === t && grid[r][c - 2] === t) return true;
    // Check up 2
    if (r >= 2 && grid[r - 1][c] === t && grid[r - 2][c] === t) return true;
    return false;
  }

  private applyGravity(): FallingTile[] {
    const fallen: FallingTile[] = [];

    for (let c = 0; c < this.cols; c++) {
      // Find segments of non-locked tiles in this column
      const segments: number[][] = [];
      let currentSegment: number[] = [];

      for (let r = 0; r < this.rows; r++) {
        if (this.locked[r][c]) {
          if (currentSegment.length > 0) {
            segments.push(currentSegment);
            currentSegment = [];
          }
        } else {
          currentSegment.push(r);
        }
      }
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      // Apply gravity within each segment independently
      for (const seg of segments) {
        const tiles: string[] = [];
        // Gather non-empty cells
        for (let idx = seg.length - 1; idx >= 0; idx--) {
          const r = seg[idx];
          if (this.grid[r][c]) {
            tiles.push(this.grid[r][c]);
          }
        }

        // Write back from bottom to top of segment
        for (let idx = seg.length - 1; idx >= 0; idx--) {
          const r = seg[idx];
          const tileIndex = seg.length - 1 - idx;
          const newType = tiles[tileIndex] ?? '';

          if (newType && this.grid[r][c] !== newType) {
            // Find where this tile came from in the grid to calculate animation offset
            let origRow = r;
            let foundCount = 0;
            for (let idx2 = seg.length - 1; idx2 >= 0; idx2--) {
              const r2 = seg[idx2];
              if (this.grid[r2][c]) {
                if (foundCount === tileIndex) {
                  origRow = r2;
                  break;
                }
                foundCount++;
              }
            }
            if (origRow !== r) {
              fallen.push({ row: r, col: c, fromRow: origRow });
            }
          }
          this.grid[r][c] = newType;
        }
      }
    }
    return fallen;
  }

  private refill(): NewTile[] {
    const newTiles: NewTile[] = [];

    for (let c = 0; c < this.cols; c++) {
      // Find segments
      const segments: number[][] = [];
      let currentSegment: number[] = [];

      for (let r = 0; r < this.rows; r++) {
        if (this.locked[r][c]) {
          if (currentSegment.length > 0) {
            segments.push(currentSegment);
            currentSegment = [];
          }
        } else {
          currentSegment.push(r);
        }
      }
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      // Refill each segment from top to bottom
      for (const seg of segments) {
        let emptyCount = 0;
        for (let idx = 0; idx < seg.length; idx++) {
          const r = seg[idx];
          if (!this.grid[r][c]) {
            const t = NORMAL_TILE_TYPES[Math.floor(Math.random() * NORMAL_TILE_TYPES.length)];
            this.grid[r][c] = t;
            emptyCount++;
            newTiles.push({ row: r, col: c, tileType: t, dropFrom: -emptyCount });
          }
        }
      }
    }
    return newTiles;
  }
}
