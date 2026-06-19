import { Board } from './Board';
import { ObjectiveSystem } from './ObjectiveSystem';
import { CrowdEnergySystem } from './CrowdEnergySystem';
import { LevelConfig } from '../levels/levels';

class SimplePRNG {
  private seed: number;

  constructor(seed = 12345) {
    this.seed = seed;
  }

  // Returns pseudo-random value [0, 1)
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export interface SimulationResult {
  completed: boolean;
  movesUsed: number;
  score: number;
  crowdEnergy: number;
  objectivesProgressed: boolean;
  errors: string[];
  warnings: string[];
  gotStuck: boolean;
  finalBoardStable: boolean;
}

export class LevelSimulator {
  /**
   * Run a logic-only simulated playthrough of the given LevelConfig.
   * Leverages a seedable PRNG to temporarily mock global Math.random
   * for deterministic tile generation and selection.
   */
  static simulateLevel(levelConfig: LevelConfig, maxMoves = 50, seed = 42): SimulationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let movesUsed = 0;
    let score = 0;
    let gotStuck = false;
    let finalBoardStable = true;
    let objectivesProgressed = false;

    // Temporary override of Math.random
    const prng = new SimplePRNG(seed);
    const originalRandom = Math.random;
    Math.random = () => prng.next();

    let board: Board | undefined;
    let objectiveSys: ObjectiveSystem | undefined;
    let crowdSys: CrowdEnergySystem | undefined;

    try {
      board = new Board(
        levelConfig.board.rows,
        levelConfig.board.columns,
        levelConfig.board.tileTypes,
        false, // testMode = false to generate a normal random board
        levelConfig.board.lockedPositions || [],
        levelConfig.board.fogPositions || []
      );

      objectiveSys = new ObjectiveSystem(levelConfig.objectives);
      crowdSys = new CrowdEnergySystem(levelConfig.crowdEnergy);

      // 1. Initial resolution (clear any starting matches that fell in)
      let initialResolveCount = 0;
      const maxCascadeLimit = 100;

      while (board.resolve(initialResolveCount > 0)) {
        initialResolveCount++;
        if (initialResolveCount > maxCascadeLimit) {
          errors.push('Infinite cascade loop detected during initial board generation');
          finalBoardStable = false;
          break;
        }
      }

      // 2. Playthrough Loop
      while (movesUsed < levelConfig.moves && movesUsed < maxMoves && !objectiveSys.isComplete() && finalBoardStable) {
        // Find all possible adjacent valid swaps
        const validMoves: Array<{ r1: number; c1: number; r2: number; c2: number; score: number }> = [];
        const rows = levelConfig.board.rows;
        const cols = levelConfig.board.columns;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            // Check horizontal swap
            if (c < cols - 1 && board.canSwap(r, c, r, c + 1)) {
              if (board.hasMatchAfterSwap(r, c, r, c + 1) || this.isPowerUpSwap(board, r, c, r, c + 1)) {
                validMoves.push({ r1: r, c1: c, r2: r, c2: c + 1, score: 1 });
              }
            }
            // Check vertical swap
            if (r < rows - 1 && board.canSwap(r, c, r + 1, c)) {
              if (board.hasMatchAfterSwap(r, c, r + 1, c) || this.isPowerUpSwap(board, r, c, r + 1, c)) {
                validMoves.push({ r1: r, c1: c, r2: r + 1, c2: c, score: 1 });
              }
            }
          }
        }

        // If no valid swaps found, simulation has run out of moves (got stuck)
        if (validMoves.length === 0) {
          gotStuck = true;
          break;
        }

        // Pick a move (simulate a simple player: pick the first or random valid move)
        // LCG PRNG is used for picking
        const chosenIndex = Math.floor(Math.random() * validMoves.length);
        const move = validMoves[chosenIndex];

        // Perform Swap
        const isAPu = this.isPowerUp(board.getCell(move.r1, move.c1));
        const isBPu = this.isPowerUp(board.getCell(move.r2, move.c2));
        
        board.swap(move.r1, move.c1, move.r2, move.c2);
        movesUsed++;

        // Resolve cascades
        let cascadeCount = 0;
        let resolveRes;

        // If swap involved power-ups, activate them
        if (isAPu || isBPu) {
          const puRowActual = isAPu ? move.r1 : move.r2;
          const puColActual = isAPu ? move.c1 : move.c2;
          const puType = isAPu ? board.getCell(move.r1, move.c1) : board.getCell(move.r2, move.c2);
          const targetType = isAPu ? board.getCell(move.r2, move.c2) : board.getCell(move.r1, move.c1);

          let puRes;
          if (isAPu && isBPu) {
            puRes = board.triggerStageExplosion(puRowActual, puColActual);
          } else {
            puRes = board.activatePowerUp(puRowActual, puColActual, puType, targetType);
          }

          // Apply power-up clears
          objectiveSys.onTilesCleared(puRes.tileTypeCounts);
          objectiveSys.onObstaclesCleared(puRes.obstaclesCleared.length);
          score += (puRes.clearedCells.length * 50) + (puRes.obstaclesCleared.length * 100);
          objectiveSys.updateScore(score);
          crowdSys.addEnergy(puRes.clearedCells.length * 2);
        }

        // Standard cascade loop
        while ((resolveRes = board.resolve(cascadeCount > 0))) {
          cascadeCount++;
          if (cascadeCount > maxCascadeLimit) {
            errors.push(`Infinite cascade loop detected during move resolution (move #${movesUsed})`);
            finalBoardStable = false;
            break;
          }

          // Accumulate objectives
          objectiveSys.onTilesCleared(resolveRes.tileTypeCounts);
          objectiveSys.onObstaclesCleared(resolveRes.obstaclesCleared.length);
          crowdSys.onMatches(resolveRes.groups, resolveRes.isCascade);

          let matchScore = 0;
          for (const g of resolveRes.groups) {
            if (g.cells.length === 3) matchScore += 300;
            else if (g.cells.length === 4) matchScore += 600;
            else if (g.cells.length >= 5) matchScore += 1000;
          }
          score += (matchScore * cascadeCount) + (resolveRes.obstaclesCleared.length * 100);
          objectiveSys.updateScore(score);
        }
      }

      // Check if objectives made any progress at all
      const objectives = objectiveSys.getObjectives();
      const progressed = objectives.some(o => o.collected > 0);
      if (progressed) {
        objectivesProgressed = true;
      }

    } catch (err: any) {
      errors.push(`Runtime error during simulation: ${err.message || String(err)}`);
      finalBoardStable = false;
    } finally {
      // Restore global Math.random
      Math.random = originalRandom;
    }

    const finalCrowdEnergy = crowdSys ? Math.round(crowdSys.getEnergy()) : 0;
    const completed = objectiveSys ? objectiveSys.isComplete() : false;

    return {
      completed,
      movesUsed,
      score,
      crowdEnergy: finalCrowdEnergy,
      objectivesProgressed,
      errors,
      warnings,
      gotStuck,
      finalBoardStable
    };
  }

  private static isPowerUp(type: string): boolean {
    const powerUps = ['microphone_blast', 'spotlight_burst', 'superstar_power', 'stage_explosion'];
    return powerUps.includes(type);
  }

  private static isPowerUpSwap(board: Board, r1: number, c1: number, r2: number, c2: number): boolean {
    const p1 = board.getCell(r1, c1);
    const p2 = board.getCell(r2, c2);
    return this.isPowerUp(p1) || this.isPowerUp(p2);
  }
}
