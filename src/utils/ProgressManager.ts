export interface LevelStats {
  score: number;
  energy: number;
  stars: number;
}

export class ProgressManager {
  private static KEY_HIGHEST = 'rockstar_highest_unlocked_level';
  private static KEY_STATS = 'rockstar_level_stats';

  /** Gets the highest level number unlocked (1-10) */
  static getHighestUnlockedLevel(): number {
    const val = localStorage.getItem(this.KEY_HIGHEST);
    return val ? parseInt(val, 10) : 1;
  }

  /** Sets the highest unlocked level directly */
  static setHighestUnlockedLevel(level: number): void {
    localStorage.setItem(this.KEY_HIGHEST, String(level));
  }

  /** Checks if a level is completed (has >0 stars) */
  static isLevelCompleted(level: number): boolean {
    const stats = this.getLevelStats(level);
    return stats !== null && stats.stars > 0;
  }

  /** Gets all completed level numbers */
  static getCompletedLevels(): number[] {
    const stats = this.getAllStats();
    return Object.keys(stats).map(Number).filter(lvl => stats[lvl].stars > 0);
  }

  /** Gets the statistics for a specific level */
  static getLevelStats(level: number): LevelStats | null {
    const stats = this.getAllStats();
    return stats[level] || null;
  }

  /** Saves stats and potentially unlocks the next level */
  static markLevelCompleted(level: number, score: number, energy: number, stars: number): void {
    const stats = this.getAllStats();
    const existing = stats[level];

    const bestScore = existing ? Math.max(existing.score, score) : score;
    const bestEnergy = existing ? Math.max(existing.energy, energy) : energy;
    const bestStars = existing ? Math.max(existing.stars, stars) : stars;

    stats[level] = { score: bestScore, energy: bestEnergy, stars: bestStars };
    localStorage.setItem(this.KEY_STATS, JSON.stringify(stats));

    // Unlock next level (up to Level 15)
    const currentHighest = this.getHighestUnlockedLevel();
    if (level < 15 && level + 1 > currentHighest) {
      this.setHighestUnlockedLevel(level + 1);
    }
  }

  /** Reset all progress (for E2E test state setup) */
  static clearProgress(): void {
    localStorage.removeItem(this.KEY_HIGHEST);
    localStorage.removeItem(this.KEY_STATS);
  }

  /** Private helper to read raw JSON statistics */
  private static getAllStats(): Record<number, LevelStats> {
    const val = localStorage.getItem(this.KEY_STATS);
    if (!val) return {};
    try {
      return JSON.parse(val);
    } catch {
      return {};
    }
  }
}
