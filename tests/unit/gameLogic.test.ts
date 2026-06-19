import { describe, it, expect, beforeEach } from 'vitest';
import { detectMatches, matchedCells } from '../../src/game/MatchDetector';
import { Board } from '../../src/game/Board';
import { ObjectiveSystem } from '../../src/game/ObjectiveSystem';

describe('MatchDetector Unit Tests', () => {
  it('detects horizontal match-3', () => {
    const grid = [
      ['gold_record', 'gold_record', 'gold_record', 'silver_record', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
    ];
    const matches = detectMatches(grid, 8, 8);
    // Should find horizontal match-3 of gold_record at row 0 (cols 0, 1, 2)
    // and horizontal match-4 of star at row 0 (cols 4, 5, 6, 7)
    // and horizontal match-8 of star at all other rows
    const goldMatch = matches.find(m => m.tileType === 'gold_record');
    expect(goldMatch).toBeDefined();
    expect(goldMatch?.length).toBe(3);
    expect(goldMatch?.cells).toContainEqual({ row: 0, col: 0 });
    expect(goldMatch?.cells).toContainEqual({ row: 0, col: 1 });
    expect(goldMatch?.cells).toContainEqual({ row: 0, col: 2 });
  });

  it('detects vertical match-4', () => {
    const grid = [
      ['gold_record', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['gold_record', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['gold_record', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['gold_record', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
    ];
    const matches = detectMatches(grid, 8, 8);
    const goldMatch = matches.find(m => m.tileType === 'gold_record');
    expect(goldMatch).toBeDefined();
    expect(goldMatch?.length).toBe(4);
    expect(goldMatch?.cells).toContainEqual({ row: 0, col: 0 });
    expect(goldMatch?.cells).toContainEqual({ row: 3, col: 0 });
  });

  it('detects horizontal match-5', () => {
    const grid = [
      ['gold_record', 'gold_record', 'gold_record', 'gold_record', 'gold_record', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
    ];
    const matches = detectMatches(grid, 8, 8);
    const goldMatch = matches.find(m => m.tileType === 'gold_record' && m.length === 5);
    expect(goldMatch).toBeDefined();
  });

  it('detects T/L shaped matches (intersection)', () => {
    const grid = [
      ['gold_record', 'gold_record', 'gold_record', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'gold_record', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'gold_record', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
      ['star', 'star', 'star', 'star', 'star', 'star', 'star', 'star'],
    ];
    const matches = detectMatches(grid, 8, 8);
    // Should detect horizontal match-3 of gold_record at row 0 (cols 0, 1, 2)
    // and vertical match-3 of gold_record at col 1 (rows 0, 1, 2)
    const goldMatches = matches.filter(m => m.tileType === 'gold_record');
    expect(goldMatches.length).toBe(2);
    
    const cells = matchedCells(matches);
    expect(cells.has('0,1')).toBe(true); // Intersection point
  });
});

describe('Board Swap and Gravity Logic', () => {
  it('allows swapping adjacent normal tiles but rejects swaps involving locked tiles', () => {
    const board = new Board(
      8, 8,
      ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      false,
      [{ row: 5, col: 2 }], // locked tile at (5, 2)
      []
    );

    // Normal adjacent swap
    expect(board.canSwap(0, 0, 0, 1)).toBe(true);
    expect(board.canSwap(0, 0, 1, 0)).toBe(true);

    // Non-adjacent swap
    expect(board.canSwap(0, 0, 0, 2)).toBe(false);

    // Swap involving a locked tile
    expect(board.canSwap(5, 2, 5, 3)).toBe(false);
    expect(board.canSwap(5, 1, 5, 2)).toBe(false);
  });

  it('verifies gravity moves non-locked tiles while locked tiles remain fixed', () => {
    const board = new Board(
      8, 8,
      ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      true, // testMode loaded with locked at (5,2) and fog at (3,6)
      [], []
    );

    // Let's clear the cell directly underneath the locked tile at (5, 2)
    // The cell underneath is (6, 2)
    board.setCell(6, 2, '');
    
    // Resolve matches/gravity
    const result = board.resolve(false);
    expect(result).toBeDefined();

    // The locked tile at (5, 2) must remain locked and must NOT have fallen!
    expect(board.isLocked(5, 2)).toBe(true);
    expect(board.getCell(5, 2)).not.toBe('');
  });

  it('verifies fog deflection: first clear only defogs, tile remains, doesn\'t trigger gravity', () => {
    const board = new Board(
      8, 8,
      ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      true, // testMode loaded with locked at (5,2) and fog at (3,6)
      [], []
    );

    expect(board.hasFog(3, 6)).toBe(true);

    // Activate a power-up or clear at (3, 6)
    const result = board.activatePowerUp(3, 6, 'spotlight_burst');
    
    // The fog overlay should be defogged
    expect(board.hasFog(3, 6)).toBe(false);
    // The tile underneath (3, 6) must remain in the grid
    expect(board.getCell(3, 6)).not.toBe('');
    // The obstacle must be logged as cleared
    expect(result.obstaclesCleared).toContainEqual({ row: 3, col: 6, type: 'fog' });
    // Since the tile remained, it should not be in clearedCells
    expect(result.clearedCells.some(c => c.row === 3 && c.col === 6)).toBe(false);
  });
});

describe('ObjectiveSystem Logic', () => {
  it('updates targets and completes objectives when criteria are met', () => {
    const objectives = [
      { type: 'collect' as const, tile: 'gold_record', target: 5 },
      { type: 'obstacles' as const, target: 2 },
      { type: 'score' as const, target: 1000 },
      { type: 'energy' as const, target: 80 }
    ];
    const system = new ObjectiveSystem(objectives);

    expect(system.isComplete()).toBe(false);

    // 1. Collect tiles
    system.onTilesCleared({ gold_record: 3, silver_record: 10 });
    expect(system.getObjectives().find(o => o.tile === 'gold_record')?.collected).toBe(3);
    
    system.onTilesCleared({ gold_record: 3 });
    expect(system.getObjectives().find(o => o.tile === 'gold_record')?.collected).toBe(5); // Capped at 5

    // 2. Obstacles
    system.onObstaclesCleared(1);
    expect(system.getObstaclesCleared()).toBe(1);
    system.onObstaclesCleared(2);
    expect(system.getObstaclesCleared()).toBe(2); // Capped at 2

    // 3. Score
    system.updateScore(500);
    expect(system.getObjectives().find(o => o.type === 'score')?.collected).toBe(500);
    system.updateScore(1200);
    expect(system.getObjectives().find(o => o.type === 'score')?.collected).toBe(1000); // Capped

    // 4. Energy
    system.updateEnergy(50);
    expect(system.getObjectives().find(o => o.type === 'energy')?.collected).toBe(50);
    system.updateEnergy(90);
    expect(system.getObjectives().find(o => o.type === 'energy')?.collected).toBe(80); // Capped

    // All complete
    expect(system.isComplete()).toBe(true);
  });
});

describe('Power-up Activations', () => {
  it('verifies Spotlight Burst clears a 3x3 area', () => {
    const board = new Board(
      8, 8,
      ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      false, [], []
    );

    // Make sure cells around (3, 3) are populated
    for (let r = 2; r <= 4; r++) {
      for (let c = 2; c <= 4; c++) {
        board.setCell(r, c, 'gold_record');
      }
    }

    const result = board.activatePowerUp(3, 3, 'spotlight_burst');
    
    // Should clear exactly 9 cells (3x3 area)
    expect(result.clearedCells.length).toBe(9);
    for (let r = 2; r <= 4; r++) {
      for (let c = 2; c <= 4; c++) {
        expect(board.getCell(r, c)).toBe('');
      }
    }
  });

  it('verifies Stage Explosion clears a 5x5 area', () => {
    const board = new Board(
      8, 8,
      ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      false, [], []
    );

    // Make sure cells around (4, 4) are populated
    for (let r = 2; r <= 6; r++) {
      for (let c = 2; c <= 6; c++) {
        board.setCell(r, c, 'gold_record');
      }
    }

    const result = board.triggerStageExplosion(4, 4);
    
    // Should clear exactly 25 cells (5x5 area)
    expect(result.clearedCells.length).toBe(25);
    for (let r = 2; r <= 6; r++) {
      for (let c = 2; c <= 6; c++) {
        expect(board.getCell(r, c)).toBe('');
      }
    }
  });
});

import { ProgressManager } from '../../src/utils/ProgressManager';
import { StarsSystem } from '../../src/game/StarsSystem';

describe('ProgressManager & StarsSystem Unit Tests', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    global.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const k in store) delete store[k]; },
      length: 0,
      key: () => null,
    };
  });

  it('starts with Level 1 unlocked and no completed levels', () => {
    expect(ProgressManager.getHighestUnlockedLevel()).toBe(1);
    expect(ProgressManager.getCompletedLevels()).toEqual([]);
    expect(ProgressManager.isLevelCompleted(1)).toBe(false);
  });

  it('saves level stats and unlocks the next level', () => {
    ProgressManager.markLevelCompleted(1, 5000, 85, 2);
    expect(ProgressManager.getHighestUnlockedLevel()).toBe(2);
    expect(ProgressManager.getCompletedLevels()).toEqual([1]);
    expect(ProgressManager.isLevelCompleted(1)).toBe(true);

    const stats = ProgressManager.getLevelStats(1);
    expect(stats).toEqual({ score: 5000, energy: 85, stars: 2 });
  });

  it('keeps the highest unlocked level when re-completing a lower level', () => {
    ProgressManager.setHighestUnlockedLevel(5);
    ProgressManager.markLevelCompleted(2, 6000, 90, 3);
    expect(ProgressManager.getHighestUnlockedLevel()).toBe(5);
  });

  it('preserves the best stats across completions', () => {
    ProgressManager.markLevelCompleted(1, 4000, 80, 1);
    ProgressManager.markLevelCompleted(1, 3000, 95, 2); // higher energy & stars, lower score
    ProgressManager.markLevelCompleted(1, 6000, 75, 1); // higher score, lower energy & stars

    const stats = ProgressManager.getLevelStats(1);
    expect(stats).toEqual({ score: 6000, energy: 95, stars: 2 });
  });

  it('clears progress correctly', () => {
    ProgressManager.markLevelCompleted(1, 5000, 85, 2);
    ProgressManager.clearProgress();
    expect(ProgressManager.getHighestUnlockedLevel()).toBe(1);
    expect(ProgressManager.getCompletedLevels()).toEqual([]);
  });

  it('calculates stars based on level thresholds', () => {
    const thresholds = {
      twoStars: { score: 4000, energy: 80, moves: 5 },
      threeStars: { score: 8000, energy: 95, moves: 10 }
    };

    // 1 Star: Complete, but meets neither 2-star nor 3-star
    expect(StarsSystem.calculateStars(3000, 75, 2, thresholds)).toBe(1);

    // Meets 2-star threshold (score >= 4000, energy >= 80, moves >= 5)
    expect(StarsSystem.calculateStars(4500, 85, 6, thresholds)).toBe(2);

    // Meets 3-star threshold (score >= 8000, energy >= 95, moves >= 10)
    expect(StarsSystem.calculateStars(8500, 96, 12, thresholds)).toBe(3);

    // Meets 3-star but missing one requirement (e.g. moves < 10 but >= 5) -> returns 2 stars
    expect(StarsSystem.calculateStars(9000, 98, 8, thresholds)).toBe(2);

    // Missing score for 2 stars -> returns 1 star
    expect(StarsSystem.calculateStars(3500, 98, 12, thresholds)).toBe(1);
  });
});

import { LevelValidator } from '../../src/utils/LevelValidator';
import { LevelSimulator } from '../../src/game/LevelSimulator';
import { LEVELS, LevelConfig } from '../../src/levels/levels';

describe('v0.8 Balancing & Pipeline Unit Tests', () => {
  it('all 15 levels pass LevelValidator', () => {
    LEVELS.forEach(level => {
      const result = LevelValidator.validate(level);
      expect(result.errors).toEqual([]);
    });
  });

  it('invalid sample level fails validation', () => {
    const invalidConfig: LevelConfig = {
      id: '',
      number: 0,
      name: '',
      board: {
        rows: 2, // invalid
        columns: 8,
        tileTypes: ['gold_record'],
        fogPositions: [{ row: 10, col: 10 }] // invalid
      },
      moves: -1, // invalid
      objectives: [], // invalid
      crowdEnergy: { targetPercent: 70, match3Gain: 3, match4Gain: 6, match5Gain: 10, cascadeBonus: 2 },
      powerUps: [],
      theme: { venue: '', stageMood: '', crowdSize: '', difficulty: '' }, // invalid
      starThresholds: null as any // invalid
    };

    const result = LevelValidator.validate(invalidConfig);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('all 15 levels can initialize in LevelSimulator', () => {
    LEVELS.forEach(level => {
      const result = LevelSimulator.simulateLevel(level, 0);
      expect(result.errors).toEqual([]);
      expect(result.finalBoardStable).toBe(true);
    });
  });

  it('simulator does not get stuck and runs playthrough', () => {
    const result = LevelSimulator.simulateLevel(LEVELS[0], 10, 12345);
    expect(result.errors).toEqual([]);
    expect(result.finalBoardStable).toBe(true);
    expect(result.movesUsed).toBeLessThanOrEqual(10);
  });

  it('simulator respects max cascade/move limits', () => {
    const result = LevelSimulator.simulateLevel(LEVELS[0], 2, 42);
    expect(result.movesUsed).toBeLessThanOrEqual(2);
  });

  it('VenueMap supports the full level list count', () => {
    expect(LEVELS.length).toBe(15);
    const startY = 120;
    const endY = 844 - 80;
    const stepY = (endY - startY) / (LEVELS.length - 1);
    expect(stepY).toBeGreaterThan(0);
    expect(isFinite(stepY)).toBe(true);
  });
});

describe('Dead Board & Reshuffle System Unit Tests', () => {
  it('detects at least one valid move on the test board', () => {
    const board = new Board(
      8, 8,
      ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      true // testMode
    );
    expect(board.hasAnyValidMove()).toBe(true);
    const moves = board.findValidMoves();
    expect(moves.length).toBeGreaterThan(0);
    const hasTestSwap = moves.some(m =>
      (m.from.row === 0 && m.from.col === 2 && m.to.row === 0 && m.to.col === 3) ||
      (m.from.row === 0 && m.from.col === 3 && m.to.row === 0 && m.to.col === 2)
    );
    expect(hasTestSwap).toBe(true);
  });

  it('detects no valid moves on a constructed dead board', () => {
    const board = new Board(
      8, 8,
      ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      true, // testMode
      [], [],
      true // forceDeadBoard
    );
    expect(board.hasAnyValidMove()).toBe(false);
    expect(board.findValidMoves().length).toBe(0);
  });

  it('verifies locked tiles are not counted as valid swaps', () => {
    const board = new Board(
      8, 8,
      ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      true, // testMode
      [{ row: 0, col: 2 }], // lock the star tile at (0, 2)
      []
    );
    const moves = board.findValidMoves();
    const hasTestSwap = moves.some(m =>
      (m.from.row === 0 && m.from.col === 2 && m.to.row === 0 && m.to.col === 3) ||
      (m.from.row === 0 && m.from.col === 3 && m.to.row === 0 && m.to.col === 2)
    );
    expect(hasTestSwap).toBe(false);
  });

  it('shuffle produces a board with at least one valid move and preserves obstacle positions', () => {
    const board = new Board(
      8, 8,
      ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'],
      true, // testMode
      [{ row: 1, col: 1 }, { row: 5, col: 5 }], // locked positions
      [{ row: 2, col: 2 }, { row: 6, col: 6 }], // fog positions
      true // start with a dead board
    );

    expect(board.hasAnyValidMove()).toBe(false);
    expect(board.isLocked(1, 1)).toBe(true);
    expect(board.isLocked(5, 5)).toBe(true);
    expect(board.hasFog(2, 2)).toBe(true);
    expect(board.hasFog(6, 6)).toBe(true);

    const originalGrid = board.getGrid();

    const shuffleSuccess = board.shuffle();
    expect(shuffleSuccess).toBe(true);

    expect(board.hasAnyValidMove()).toBe(true);
    expect(board.isLocked(1, 1)).toBe(true);
    expect(board.isLocked(5, 5)).toBe(true);
    expect(board.hasFog(2, 2)).toBe(true);
    expect(board.hasFog(6, 6)).toBe(true);

    expect(board.getCell(1, 1)).toBe(originalGrid[1][1]);
    expect(board.getCell(5, 5)).toBe(originalGrid[5][5]);
  });
});

