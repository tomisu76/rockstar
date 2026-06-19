import { LevelConfig } from '../levels/levels';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export class LevelValidator {
  /**
   * Validates a LevelConfig.
   * Returns a list of errors and warnings.
   */
  static validate(config: LevelConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Level ID and Name
    if (!config.id) {
      errors.push('Missing level ID');
    }
    if (!config.name) {
      errors.push('Missing level name');
    }

    // 2. Level Number
    if (typeof config.number !== 'number' || config.number <= 0) {
      errors.push(`Invalid level number: ${config.number}`);
    }

    // 3. Board rows/columns
    const rows = config.board?.rows;
    const cols = config.board?.columns;
    if (typeof rows !== 'number' || rows < 4 || rows > 12) {
      errors.push(`Invalid board rows: ${rows}. Must be between 4 and 12.`);
    }
    if (typeof cols !== 'number' || cols < 4 || cols > 12) {
      errors.push(`Invalid board columns: ${cols}. Must be between 4 and 12.`);
    }

    // 4. Tile types
    const tileTypes = config.board?.tileTypes;
    const allowedTileTypes = ['gold_record', 'silver_record', 'music_note', 'star', 'spotlight', 'speaker'];
    if (!tileTypes || !Array.isArray(tileTypes) || tileTypes.length === 0) {
      errors.push('Board must define at least one tile type');
    } else {
      tileTypes.forEach(t => {
        if (!allowedTileTypes.includes(t)) {
          errors.push(`Invalid tile type: ${t}. Allowed: ${allowedTileTypes.join(', ')}`);
        }
      });
    }

    // 5. Moves
    if (typeof config.moves !== 'number' || config.moves <= 0) {
      errors.push(`Invalid move count: ${config.moves}. Must be > 0.`);
    }

    // 6. Objectives
    const objectives = config.objectives;
    if (!objectives || !Array.isArray(objectives) || objectives.length === 0) {
      errors.push('Level must define at least one objective');
    } else {
      objectives.forEach((obj, idx) => {
        const allowedObjTypes = ['collect', 'energy', 'obstacles', 'score'];
        if (!allowedObjTypes.includes(obj.type)) {
          errors.push(`Objective[${idx}] has invalid type: ${obj.type}`);
        }
        if (typeof obj.target !== 'number' || obj.target <= 0) {
          errors.push(`Objective[${idx}] has invalid target target count: ${obj.target}. Must be > 0.`);
        }
        if (obj.type === 'collect' && !obj.tile) {
          errors.push(`Objective[${idx}] type is 'collect' but missing 'tile' parameter`);
        }
        if (obj.type === 'collect' && obj.tile && !allowedTileTypes.includes(obj.tile)) {
          errors.push(`Objective[${idx}] collects invalid tile type: ${obj.tile}`);
        }
      });
    }

    // 7. Venue and Difficulty
    if (!config.theme?.venue) {
      errors.push('Missing theme venue name');
    }
    if (!config.theme?.difficulty) {
      errors.push('Missing theme difficulty label');
    }

    // 8. Star Thresholds
    if (!config.starThresholds) {
      errors.push('Missing star thresholds configuration');
    } else {
      const thresholds = config.starThresholds;
      if (!thresholds.twoStars || (thresholds.twoStars.score === undefined && thresholds.twoStars.energy === undefined && thresholds.twoStars.moves === undefined)) {
        errors.push('twoStars threshold must define at least one condition (score, energy, or moves)');
      }
      if (!thresholds.threeStars || (thresholds.threeStars.score === undefined && thresholds.threeStars.energy === undefined && thresholds.threeStars.moves === undefined)) {
        errors.push('threeStars threshold must define at least one condition (score, energy, or moves)');
      }
    }

    // 9. Obstacles Positions & Duplicates
    const locked = config.board?.lockedPositions || [];
    const fog = config.board?.fogPositions || [];

    const lockedSet = new Set<string>();
    const fogSet = new Set<string>();

    locked.forEach((pos, idx) => {
      if (typeof pos.row !== 'number' || pos.row < 0 || pos.row >= rows || typeof pos.col !== 'number' || pos.col < 0 || pos.col >= cols) {
        errors.push(`Locked position[${idx}] at (${pos.row}, ${pos.col}) is out of board bounds`);
      }
      const key = `${pos.row},${pos.col}`;
      if (lockedSet.has(key)) {
        errors.push(`Duplicate locked position detected at (${pos.row}, ${pos.col})`);
      }
      lockedSet.add(key);
    });

    fog.forEach((pos, idx) => {
      if (typeof pos.row !== 'number' || pos.row < 0 || pos.row >= rows || typeof pos.col !== 'number' || pos.col < 0 || pos.col >= cols) {
        errors.push(`Fog position[${idx}] at (${pos.row}, ${pos.col}) is out of board bounds`);
      }
      const key = `${pos.row},${pos.col}`;
      if (fogSet.has(key)) {
        errors.push(`Duplicate fog position detected at (${pos.row}, ${pos.col})`);
      }
      fogSet.add(key);
    });

    // 10. Check if any cell is designated as both locked and fog
    lockedSet.forEach(key => {
      if (fogSet.has(key)) {
        errors.push(`Cell at (${key}) cannot be both locked (cable) and fogged (smoke)`);
      }
    });

    // 11. Warnings for optional balancing metadata
    if (!config.balancing) {
      warnings.push('Optional balancing metadata is missing');
    } else {
      const bal = config.balancing;
      if (!bal.estimatedDifficulty) {
        warnings.push('Optional balancing field estimatedDifficulty is missing');
      }
      if (typeof bal.targetWinRate !== 'number') {
        warnings.push('Optional balancing field targetWinRate is missing or not a number');
      }
      if (typeof bal.recommendedMoves !== 'number') {
        warnings.push('Optional balancing field recommendedMoves is missing or not a number');
      }
    }

    return { errors, warnings };
  }
}
