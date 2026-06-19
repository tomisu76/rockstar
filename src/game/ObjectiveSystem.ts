// ─── Objective System ─────────────────────────────────────────────────────────

import { LevelObjective } from '../levels/levels';

export interface ObjectiveState {
  type: 'collect' | 'energy' | 'obstacles' | 'score';
  tile?: string;
  target: number;
  collected: number;
}

export class ObjectiveSystem {
  private objectives: ObjectiveState[];

  constructor(objectives: LevelObjective[]) {
    this.objectives = objectives.map(o => ({
      type: o.type,
      tile: o.tile,
      target: o.target,
      collected: 0,
    }));
  }

  /** Called after tiles are cleared. tileTypeCounts maps tileType → count removed. */
  onTilesCleared(tileTypeCounts: Record<string, number>): void {
    for (const obj of this.objectives) {
      if (obj.type === 'collect' && obj.tile && tileTypeCounts[obj.tile]) {
        obj.collected = Math.min(
          obj.collected + tileTypeCounts[obj.tile],
          obj.target
        );
      }
    }
  }

  /** Called when obstacles are cleared. */
  onObstaclesCleared(count: number): void {
    for (const obj of this.objectives) {
      if (obj.type === 'obstacles') {
        obj.collected = Math.min(obj.collected + count, obj.target);
      }
    }
  }

  /** Called when score changes. */
  updateScore(currentScore: number): void {
    for (const obj of this.objectives) {
      if (obj.type === 'score') {
        obj.collected = Math.min(currentScore, obj.target);
      }
    }
  }

  /** Called when crowd energy is updated. */
  updateEnergy(currentEnergy: number): void {
    for (const obj of this.objectives) {
      if (obj.type === 'energy') {
        obj.collected = Math.min(currentEnergy, obj.target);
      }
    }
  }

  isComplete(): boolean {
    return this.objectives.every(o => o.collected >= o.target);
  }

  getObjectives(): ObjectiveState[] {
    return this.objectives;
  }

  getPrimaryObjective(): ObjectiveState | undefined {
    return this.objectives[0];
  }

  getScoreTarget(): number {
    const obj = this.objectives.find(o => o.type === 'score');
    return obj ? obj.target : 0;
  }

  getObstaclesTarget(): number {
    const obj = this.objectives.find(o => o.type === 'obstacles');
    return obj ? obj.target : 0;
  }

  getObstaclesCleared(): number {
    const obj = this.objectives.find(o => o.type === 'obstacles');
    return obj ? obj.collected : 0;
  }
}
