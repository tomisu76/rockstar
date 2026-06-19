import { StarThresholds } from '../levels/levels';

export class StarsSystem {
  /**
   * Calculates the number of stars earned for a level completion.
   * If the level was completed, it earns at least 1 star.
   * 2 and 3 stars are awarded if all respective thresholds are met.
   */
  static calculateStars(
    score: number,
    energy: number,
    movesLeft: number,
    thresholds: StarThresholds
  ): number {
    // Check 3 stars first
    if (this.meetsThreshold(score, energy, movesLeft, thresholds.threeStars)) {
      return 3;
    }
    // Check 2 stars next
    if (this.meetsThreshold(score, energy, movesLeft, thresholds.twoStars)) {
      return 2;
    }
    // Fallback: 1 star for completion
    return 1;
  }

  private static meetsThreshold(
    score: number,
    energy: number,
    movesLeft: number,
    tier: { score?: number; energy?: number; moves?: number }
  ): boolean {
    if (tier.score !== undefined && score < tier.score) {
      return false;
    }
    if (tier.energy !== undefined && energy < tier.energy) {
      return false;
    }
    if (tier.moves !== undefined && movesLeft < tier.moves) {
      return false;
    }
    return true;
  }
}
