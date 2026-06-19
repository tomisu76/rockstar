/**
 * StateBridge
 * -----------
 * Writes game state to the hidden #rockstar-state DOM element so that
 * Playwright tests can read it without touching the Phaser canvas.
 *
 * This module has ZERO effect on game behaviour – it only reflects state.
 * Safe to include in production builds (the div stays hidden to users).
 *
 * NOTE for Playwright:
 *   The bridge div has `display:none` in CSS.
 *   Use page.waitForFunction() or getAttribute() — NOT waitForSelector() with
 *   default state:'visible' — because hidden elements will never be "visible".
 */

const BRIDGE_ID = 'rockstar-state';

function bridge(): HTMLElement | null {
  return document.getElementById(BRIDGE_ID);
}

function set(attr: string, value: string | number | boolean): void {
  bridge()?.setAttribute(`data-${attr}`, String(value));
}

export const StateBridge = {
  setCurrentScene(sceneName: string): void {
    set('current-scene', sceneName);
  },

  /** Called once when GameScene.create() finishes successfully. */
  markLoaded(testMode = false, muted = false): void {
    set('loaded',            'true');
    set('game-state',        'idle');
    set('test-mode',         String(testMode));
    set('muted',             String(muted));
    set('valid-moves-count', 0);
    set('last-board-action', 'normal');
    set('shuffle-count',     0);
  },

  /** Set static level info. */
  setLevelInfo(params: {
    levelId: string;
    levelNumber: number;
    levelName: string;
    venueName: string;
    movesTotal: number;
    objectiveTile: string;
  }): void {
    set('level-id',          params.levelId);
    set('level-number',      params.levelNumber);
    set('level-name',        params.levelName);
    set('venue-name',        params.venueName);
    set('moves-total',       params.movesTotal);
    set('objective-tile',    params.objectiveTile);
  },

  /** Called if GameScene.create() throws – exposes the error to Playwright. */
  markError(message: string): void {
    set('loaded',    'false');
    set('game-state', 'error');
    set('error',      message);
  },

  /** Called every time movesLeft, collected, or energy changes. */
  updateState(params: {
    gameState: string;
    movesLeft: number;
    objectiveCollected: number;
    objectiveTarget: number;
    crowdEnergy: number;
    overlayVisible: boolean;
    overlayType: '' | 'win' | 'lose';
    muted: boolean;
    objectiveSummary: string;
    lastPowerupCreated?: string;
    lastPowerupActivated?: string;
    lastComboCount?: number;
    lastClearCount?: number;
    score?: number;
    scoreTarget?: number;
    obstaclesCleared?: number;
    obstaclesTarget?: number;
    lastObstacleCleared?: string;
    activeObstacleCount?: number;
    validMovesCount?: number;
    lastBoardAction?: 'shuffle' | 'normal';
    shuffleCount?: number;
  }): void {
    set('game-state',           params.gameState);
    set('moves-left',           params.movesLeft);
    set('objective-collected',  params.objectiveCollected);
    set('objective-target',     params.objectiveTarget);
    set('crowd-energy',         Math.round(params.crowdEnergy));
    set('overlay-visible',      params.overlayVisible);
    set('overlay-type',         params.overlayType);
    set('muted',                String(params.muted));
    set('objective-summary',    params.objectiveSummary);
    
    if (params.lastPowerupCreated !== undefined) {
      set('last-powerup-created', params.lastPowerupCreated);
    }
    if (params.lastPowerupActivated !== undefined) {
      set('last-powerup-activated', params.lastPowerupActivated);
    }
    if (params.lastComboCount !== undefined) {
      set('last-combo-count', params.lastComboCount);
    }
    if (params.lastClearCount !== undefined) {
      set('last-clear-count', params.lastClearCount);
    }
    if (params.score !== undefined) {
      set('score', params.score);
    }
    if (params.scoreTarget !== undefined) {
      set('score-target', params.scoreTarget);
    }
    if (params.obstaclesCleared !== undefined) {
      set('obstacles-cleared', params.obstaclesCleared);
    }
    if (params.obstaclesTarget !== undefined) {
      set('obstacles-target', params.obstaclesTarget);
    }
    if (params.lastObstacleCleared !== undefined) {
      set('last-obstacle-cleared', params.lastObstacleCleared);
    }
    if (params.activeObstacleCount !== undefined) {
      set('active-obstacle-count', params.activeObstacleCount);
    }
    if (params.validMovesCount !== undefined) {
      set('valid-moves-count', params.validMovesCount);
    }
    if (params.lastBoardAction !== undefined) {
      set('last-board-action', params.lastBoardAction);
    }
    if (params.shuffleCount !== undefined) {
      set('shuffle-count', params.shuffleCount);
    }
  },

  setHighestUnlockedLevel(level: number): void {
    set('highest-unlocked-level', level);
  },

  setCompletedLevels(levels: number[]): void {
    set('completed-levels', levels.join(','));
  },

  setSelectedLevel(level: number): void {
    set('selected-level', level);
  },

  setSelectedLevelLocked(locked: boolean): void {
    set('selected-level-locked', String(locked));
  },

  setStarsEarned(stars: number): void {
    set('stars-earned', stars);
  },

  setBestScoreCurrentLevel(score: number): void {
    set('best-score-current-level', score);
  },

  setPlaythroughTelemetry(params: {
    totalMatches: number;
    totalPowerupsUsed: number;
    totalObstaclesCleared: number;
    finalScore: number;
    finalStars: number;
    levelResult: 'win' | 'lose' | '';
  }): void {
    set('total-matches',           params.totalMatches);
    set('total-powerups-used',     params.totalPowerupsUsed);
    set('total-obstacles-cleared', params.totalObstaclesCleared);
    set('final-score',             params.finalScore);
    set('final-stars',             params.finalStars);
    set('level-result',            params.levelResult);
  },
} as const;

