// ─── Crowd Energy System ──────────────────────────────────────────────────────

import { CrowdEnergyConfig } from '../levels/levels';
import { MatchGroup } from './MatchDetector';

export class CrowdEnergySystem {
  private cfg: CrowdEnergyConfig;
  private energy: number = 0; // 0–100
  private isFull: boolean = false;

  constructor(cfg: CrowdEnergyConfig) {
    this.cfg = cfg;
  }

  onMatches(groups: MatchGroup[], isCascade: boolean): number {
    let gained = 0;
    for (const g of groups) {
      if (g.length >= 5)      gained += this.cfg.match5Gain;
      else if (g.length >= 4) gained += this.cfg.match4Gain;
      else                    gained += this.cfg.match3Gain;
    }
    if (isCascade) gained += this.cfg.cascadeBonus;

    this.energy = Math.min(100, this.energy + gained);
    if (this.energy >= 100) this.isFull = true;
    return gained;
  }

  getEnergy(): number  { return this.energy; }
  getTargetPercent(): number { return this.cfg.targetPercent; }
  hasReachedTarget(): boolean { return this.energy >= this.cfg.targetPercent; }
  isMaxed(): boolean   { return this.isFull; }

  /** Fills to 100 on win */
  fillOnWin(): void { this.energy = 100; }

  addEnergy(amount: number): void {
    this.energy = Math.min(100, this.energy + amount);
    if (this.energy >= 100) this.isFull = true;
  }
}
