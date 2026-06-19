import Phaser from 'phaser';
import { Tile, TILE_SIZE, TILE_GAP } from '../game/Tile';
import { Board } from '../game/Board';
import { ObjectiveSystem } from '../game/ObjectiveSystem';
import { CrowdEnergySystem } from '../game/CrowdEnergySystem';
import { LEVELS, LevelConfig } from '../levels/levels';
import { MatchGroup } from '../game/MatchDetector';
import { StateBridge } from '../testing/StateBridge';
import { TEST_MODE } from '../main';
import { SoundEffects } from '../game/SoundEffects';
import { ProgressManager } from '../utils/ProgressManager';
import { StarsSystem } from '../game/StarsSystem';
import { SettingsOverlay } from '../game/SettingsOverlay';

// ── Layout constants ─────────────────────────────────────────────────────────
const GAME_W = 390;
const GAME_H = 844;
const CELL  = TILE_SIZE + TILE_GAP;   // 46 px per cell
const BOARD_W = CELL * 8 - TILE_GAP; // 8 cols
const BOARD_X = (GAME_W - BOARD_W) / 2 + TILE_SIZE / 2; // left tile center X
const BOARD_Y = 290; // top tile center Y (below header)

function tileX(col: number): number { return BOARD_X + col * CELL; }
function tileY(row: number): number { return BOARD_Y + row * CELL; }

type GameState = 'idle' | 'swapping' | 'resolving' | 'win' | 'lose';

export class GameScene extends Phaser.Scene {
  // ── Systems ────────────────────────────────────────────────────────────────
  private board!: Board;
  private objectiveSys!: ObjectiveSystem;
  private crowdSys!: CrowdEnergySystem;

  // ── Visual grid ────────────────────────────────────────────────────────────
  private tiles: (Tile | null)[][] = [];

  // ── State ──────────────────────────────────────────────────────────────────
  private state: GameState = 'idle';
  private selectedTile: Tile | null = null;
  private currentLevelIndex: number = 0;
  private currentLevel!: LevelConfig;
  private movesLeft: number = 0;
  private score: number = 0;
  private lastObstacleCleared: string = '';
  private obstaclesClearedCount: number = 0;

  // ── E2E & debug tracked variables ──────────────────────────────────────────
  private lastPowerupCreated: string = '';
  private lastPowerupActivated: string = '';
  private lastComboCount: number = 0;
  private lastClearCount: number = 0;
  private comboCount: number = 0;
  private totalMatches = 0;
  private totalPowerupsUsed = 0;
  private lastBoardAction: 'shuffle' | 'normal' = 'normal';
  private shuffleCount: number = 0;
  private isShuffling: boolean = false;

  // ── UI references ──────────────────────────────────────────────────────────
  private movesText!: Phaser.GameObjects.Text;
  private collectText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private energyBar!: Phaser.GameObjects.Graphics;
  private energyLabel!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private overlayType: '' | 'win' | 'lose' = '';
  private overlayBtnText!: Phaser.GameObjects.Text;
  private overlayButtonsContainer!: Phaser.GameObjects.Container;
  private settingsOverlay!: SettingsOverlay;
  private tutorialContainer: Phaser.GameObjects.Container | null = null;

  // ── Visual Polish & Stage Elements ─────────────────────────────────────────
  private rays!: Phaser.GameObjects.Graphics;
  private stageLights: Phaser.GameObjects.Graphics[] = [];
  private speakers: Phaser.GameObjects.Text[] = [];
  private boardGlow!: Phaser.GameObjects.Graphics;
  private lastCrowdEnergy = 0;

  constructor() { super({ key: 'GameScene' }); }

  init(data?: { levelIndex?: number }): void {
    const idx = (data && typeof data.levelIndex === 'number') ? data.levelIndex : 0;
    this.currentLevelIndex = idx % LEVELS.length;
    this.currentLevel = LEVELS[this.currentLevelIndex];
  }

  create(): void {
    try {
      this.setGameState('idle');
      StateBridge.setCurrentScene('GameScene');
      this.movesLeft = this.currentLevel.moves;
      this.lastCrowdEnergy = 0;
      this.overlayType = '';

      this.score = 0;
      this.lastObstacleCleared = '';
      this.obstaclesClearedCount = 0;

      // Reset E2E / combo tracking variables
      this.lastPowerupCreated = '';
      this.lastPowerupActivated = '';
      this.lastComboCount = 0;
      this.lastClearCount = 0;
      this.comboCount = 0;
      this.totalMatches = 0;
      this.totalPowerupsUsed = 0;
      this.lastBoardAction = 'normal';
      this.shuffleCount = 0;
      this.isShuffling = false;

      StateBridge.setPlaythroughTelemetry({
        totalMatches: 0,
        totalPowerupsUsed: 0,
        totalObstaclesCleared: 0,
        finalScore: 0,
        finalStars: 0,
        levelResult: ''
      });

      // Systems
      const urlParams = new URLSearchParams(window.location.search);
      const forceDeadBoard = urlParams.get('deadBoard') === '1';

      this.board = new Board(
        this.currentLevel.board.rows,
        this.currentLevel.board.columns,
        this.currentLevel.board.tileTypes,
        TEST_MODE,
        this.currentLevel.board.lockedPositions || [],
        this.currentLevel.board.fogPositions || [],
        forceDeadBoard
      );
      this.objectiveSys = new ObjectiveSystem(this.currentLevel.objectives);
      this.crowdSys = new CrowdEnergySystem(this.currentLevel.crowdEnergy);

      this.drawBackground();
      this.drawStageHeader();
      this.drawBoardFrame();
      this.buildTiles();
      this.drawHUD();
      this.drawEnergyMeter();
      this.createOverlay();
      this.settingsOverlay = new SettingsOverlay(this);
      this.updateHUD();

      // Expose static level info to StateBridge
      const primaryObj = this.objectiveSys.getPrimaryObjective();
      StateBridge.setLevelInfo({
        levelId: this.currentLevel.id,
        levelNumber: this.currentLevel.number,
        levelName: this.currentLevel.name,
        venueName: this.currentLevel.theme.venue,
        movesTotal: this.currentLevel.moves,
        objectiveTile: primaryObj?.tile ?? primaryObj?.type ?? 'energy',
      });

      StateBridge.setSelectedLevel(this.currentLevel.number);
      StateBridge.setSelectedLevelLocked(false);
      StateBridge.setHighestUnlockedLevel(ProgressManager.getHighestUnlockedLevel());
      StateBridge.setCompletedLevels(ProgressManager.getCompletedLevels());

      const stats = ProgressManager.getLevelStats(this.currentLevel.number);
      StateBridge.setBestScoreCurrentLevel(stats ? stats.score : 0);
      StateBridge.setStarsEarned(0);

      StateBridge.markLoaded(TEST_MODE, SoundEffects.getMuted());
      this.checkAndHandleDeadBoard();

      if (TEST_MODE && !(window as any).screenshotMode) {
        this.add.text(10, 10, `[DEBUG] Scene: GameScene | testMode: true | Level: ${this.currentLevel.number}`, {
          fontSize: '11px',
          color: '#ff0000',
          backgroundColor: '#000000'
        }).setDepth(20000);
      }

      if (TEST_MODE) {
        this.input.keyboard?.on('keydown-H', () => {
          if (this.overlayType !== '') return;
          (window as any).screenshotMode = !(window as any).screenshotMode;
          this.scene.restart({ levelIndex: this.currentLevelIndex });
        });

        this.input.keyboard?.on('keydown-W', () => {
          if (this.overlayType !== '') return;
          this.showWin();
        });
        this.input.keyboard?.on('keydown-L', () => {
          if (this.overlayType !== '') return;
          this.showLose();
        });
        this.input.keyboard?.on('keydown-P', () => {
          if (this.overlayType !== '') return;
          this.spawnMicrophoneBlastCheat();
        });
        this.input.keyboard?.on('keydown-S', () => {
          if (this.overlayType !== '') return;
          this.spawnSuperstarCheat();
        });
        this.input.keyboard?.on('keydown-B', () => {
          if (this.overlayType !== '') return;
          this.spawnSpotlightBurstCheat();
        });
        this.input.keyboard?.on('keydown-X', () => {
          if (this.overlayType !== '') return;
          this.spawnStageExplosionCheat();
        });
        this.input.keyboard?.on('keydown-O', () => {
          if (this.overlayType !== '') return;
          this.spawnObstacleSetupCheat();
        });
        this.input.keyboard?.on('keydown-R', () => {
          if (this.overlayType !== '') return;
          this.resetBoardCheat();
        });
      }

      this.input.on('pointerdown', () => {
        SoundEffects.resume();
      });

      this.input.on('gameobjectdown', (_: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
        if (obj instanceof Tile) this.onTileTap(obj);
      });

      // Onboarding Tutorial for Level 1
      const showTutorialParam = new URLSearchParams(window.location.search).get('showTutorial') === '1';
      const shouldShowTutorial = this.currentLevel.number === 1 && 
        (!localStorage.getItem('rockstar_tutorial_shown') || showTutorialParam) &&
        (!TEST_MODE || showTutorialParam);

      if (shouldShowTutorial) {
        this.showTutorial();
      }

      // Expose test helpers globally for E2E verification
      (window as any).rockstarTest = (window as any).rockstarTest || {};
      (window as any).rockstarTest.dismissTutorial = () => {
        this.dismissTutorial();
      };
    } catch (err: unknown) {
      // Surface errors to StateBridge so Playwright tests can detect them
      StateBridge.markError(err instanceof Error ? err.message : String(err));
      console.error('[GameScene] Fatal error in create():', err);
    }
  }

  private setGameState(newState: GameState): void {
    this.state = newState;
    if (this.objectiveSys) {
      this.syncBridge();
    }
    if (newState === 'idle') {
      this.checkAndHandleDeadBoard();
    }
  }

  private getScoreTarget(): number {
    return this.objectiveSys ? this.objectiveSys.getScoreTarget() : 0;
  }

  private getObstaclesTarget(): number {
    return this.objectiveSys ? this.objectiveSys.getObstaclesTarget() : 0;
  }

  private getObstaclesCleared(): number {
    return this.obstaclesClearedCount;
  }

  private updateScore(newScore: number): void {
    this.score = newScore;
    if (this.objectiveSys) {
      this.objectiveSys.updateScore(this.score);
    }
    this.syncBridge();
  }

  // ── Test state bridge ─────────────────────────────────────────────────────
  private syncBridge(): void {
    const obj = this.objectiveSys.getPrimaryObjective();
    const summary = this.objectiveSys.getObjectives().map(o => {
      if (o.type === 'collect') {
        return `${o.tile}:${o.collected}/${o.target}`;
      } else if (o.type === 'energy') {
        return `energy:${o.collected}/${o.target}`;
      } else if (o.type === 'obstacles') {
        return `obstacles:${o.collected}/${o.target}`;
      } else {
        return `score:${o.collected}/${o.target}`;
      }
    }).join(',');

    StateBridge.updateState({
      gameState:            this.state,
      movesLeft:            this.movesLeft,
      objectiveCollected:   obj ? obj.collected : 0,
      objectiveTarget:      obj ? obj.target : 0,
      crowdEnergy:          this.crowdSys.getEnergy(),
      overlayVisible:       this.overlayType !== '',
      overlayType:          this.overlayType,
      muted:                SoundEffects.getMuted(),
      objectiveSummary:     summary,
      lastPowerupCreated:   this.lastPowerupCreated,
      lastPowerupActivated: this.lastPowerupActivated,
      lastComboCount:       this.lastComboCount,
      lastClearCount:       this.lastClearCount,
      score:                this.score,
      scoreTarget:          this.getScoreTarget(),
      obstaclesCleared:     this.getObstaclesCleared(),
      obstaclesTarget:      this.getObstaclesTarget(),
      lastObstacleCleared:  this.lastObstacleCleared,
      activeObstacleCount:  this.board ? this.board.getActiveObstacleCount() : 0,
      validMovesCount:      this.board ? this.board.findValidMoves().length : 0,
      lastBoardAction:      this.lastBoardAction,
      shuffleCount:         this.shuffleCount,
    });
  }

  // ── Background & Stage ────────────────────────────────────────────────────
  private drawBackground(): void {
    // Deep dark purple-black background
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x0a0014, 0x0a0014, 0x14002e, 0x14002e, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    // Subtle spotlight rays from top
    this.rays = this.add.graphics().setDepth(1);
    this.rays.setAlpha(0.07);
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 70;
      this.rays.fillStyle(0xffffff, 1);
      this.rays.fillTriangle(x, 0, x - 40, GAME_H, x + 40, GAME_H);
    }
  }

  private drawStageHeader(): void {
    // Stage platform graphic
    const stage = this.add.graphics().setDepth(1);
    stage.fillStyle(0x1a0033, 1);
    stage.fillRect(0, 0, GAME_W, 180);
    stage.lineStyle(2, 0x9b59b6, 1);
    stage.strokeRect(0, 0, GAME_W, 180);

    // Neon accent line
    const neon = this.add.graphics().setDepth(1);
    neon.lineStyle(3, 0xff2d78, 0.9);
    neon.strokeRect(4, 4, GAME_W - 8, 172);

    // Stage lights row
    this.stageLights = [];
    const lightColors = [0xffdd57, 0xff2d78, 0x00d4ff, 0x2ecc71, 0xff6b35];
    for (let i = 0; i < 5; i++) {
      const lx = 39 + i * 78;
      const lamp = this.add.graphics().setDepth(1);
      lamp.fillStyle(lightColors[i], 1);
      lamp.fillCircle(lx, 22, 10);
      // Glow ring
      lamp.lineStyle(4, lightColors[i], 0.3);
      lamp.strokeCircle(lx, 22, 18);
      this.stageLights.push(lamp);

      // Flashing stage lights tween
      this.tweens.add({
        targets: lamp,
        alpha: 0.3,
        duration: 350 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // Title
    this.add.text(GAME_W / 2, 55, '🎸 ROCKSTAR', {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff2d78',
      strokeThickness: 4,
      shadow: { color: '#ff2d78', blur: 16, fill: true },
    }).setOrigin(0.5).setDepth(1);

    // Venue name
    const theme = this.currentLevel.theme;
    this.add.text(GAME_W / 2, 95, `📍 ${theme.venue}`, {
      fontSize: '13px',
      color: '#c39bd3',
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(1);

    // Performers: Left guitarist, Center singer, Right drummer
    const guitarist = this.add.text(GAME_W * 0.25, 130, '👩‍🎤🎸', { fontSize: '26px' }).setOrigin(0.5).setDepth(1);
    const singer = this.add.text(GAME_W * 0.5, 125, '👨‍🎤🎤', { fontSize: '32px' }).setOrigin(0.5).setDepth(1);
    const drummer = this.add.text(GAME_W * 0.75, 130, '🥁👨‍🎤', { fontSize: '26px' }).setOrigin(0.5).setDepth(1);

    // Stage performer bobbing animations
    this.tweens.add({
      targets: guitarist,
      y: 124,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: singer,
      y: 117,
      duration: 580,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: drummer,
      y: 125,
      duration: 460,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Pulsing Speaker Stacks
    const leftSpeaker = this.add.text(20, 130, '🔊', { fontSize: '22px' }).setOrigin(0.5).setDepth(1);
    const rightSpeaker = this.add.text(GAME_W - 20, 130, '🔊', { fontSize: '22px' }).setOrigin(0.5).setDepth(1);
    this.speakers = [leftSpeaker, rightSpeaker];

    this.tweens.add({
      targets: this.speakers,
      scale: 1.25,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Bounce.easeInOut'
    });

    // Crowd at bottom of header
    this.add.text(GAME_W / 2, 165, '👤👤👤👤👤👤👤👤👤👤👤👤', {
      fontSize: '11px',
      color: '#7d3c98',
    }).setOrigin(0.5).setDepth(1);

    // Mute/Unmute button in stage header
    const isMuted = SoundEffects.getMuted();
    const muteBtn = this.add.text(GAME_W - 35, 25, isMuted ? '🔇' : '🔊', {
      fontSize: '22px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);

    // Settings button
    const settingsBtn = this.add.text(GAME_W - 75, 25, '⚙️', {
      fontSize: '22px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);

    settingsBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.settingsOverlay.show();
    });

    muteBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      const muted = SoundEffects.toggleMute();
      muteBtn.setText(muted ? '🔇' : '🔊');
      this.syncBridge();
    });
  }

  private drawBoardFrame(): void {
    // Board background panel
    const bx = BOARD_X - TILE_SIZE / 2 - 6;
    const by = BOARD_Y - TILE_SIZE / 2 - 6;
    const bw = BOARD_W + 12;
    const bh = CELL * 8 - TILE_GAP + 12;

    const frame = this.add.graphics().setDepth(5);
    // Ultra deep stage floor background
    frame.fillStyle(0x06000f, 0.95);
    frame.fillRoundedRect(bx, by, bw, bh, 12);

    // Stage metallic outer truss border
    frame.lineStyle(3, 0x2e004f, 1);
    frame.strokeRoundedRect(bx, by, bw, bh, 12);

    // Neon glowing hot-pink inner border
    frame.lineStyle(1.5, 0xff2d78, 0.9);
    frame.strokeRoundedRect(bx + 1.5, by + 1.5, bw - 3, bh - 3, 11);

    // Dynamic Board Glow overlay for match reactions
    this.boardGlow = this.add.graphics().setDepth(5);
    this.boardGlow.lineStyle(4, 0xff2d78, 0.3);
    this.boardGlow.strokeRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, 14);

    // Row separators (subtle)
    const sep = this.add.graphics().setDepth(5);
    sep.lineStyle(1, 0x4a235a, 0.35);
    for (let r = 1; r < 8; r++) {
      sep.strokeLineShape(new Phaser.Geom.Line(bx + 2, BOARD_Y - TILE_SIZE / 2 + r * CELL, bx + bw - 2, BOARD_Y - TILE_SIZE / 2 + r * CELL));
    }
  }

  // ── Tile grid ─────────────────────────────────────────────────────────────
  private buildTiles(): void {
    const grid = this.board.getGrid();
    this.tiles = Array.from({ length: 8 }, () => Array(8).fill(null));

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const t = new Tile(this, r, c, grid[r][c] as any, tileX(c), tileY(r));
        t.setLockedState(this.board.isLocked(r, c));
        t.setFogState(this.board.hasFog(r, c));
        t.playDropAnim(r * 30 + c * 5);
        this.tiles[r][c] = t;
      }
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  private drawHUD(): void {
    const hudY = 195;
    const hudBg = this.add.graphics().setDepth(20);
    hudBg.fillStyle(0x0d001f, 0.9);
    hudBg.fillRoundedRect(10, hudY, GAME_W - 20, 56, 8);
    hudBg.lineStyle(1, 0x6c3483, 0.6);
    hudBg.strokeRoundedRect(10, hudY, GAME_W - 20, 56, 8);

    // Level Header (e.g. "Level 1 – Garage Band Night")
    const difficultyText = this.currentLevel.theme.difficulty ? ` [${this.currentLevel.theme.difficulty}]` : '';
    this.add.text(20, hudY + 8, `Level ${this.currentLevel.number} – ${this.currentLevel.name}${difficultyText}`, {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setDepth(20);

    // Score Text (top-right of HUD)
    this.scoreText = this.add.text(GAME_W - 20, hudY + 8, 'Score: 0', {
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffd700',
    }).setOrigin(1, 0).setDepth(20);

    // Objectives Text placeholder (Target: ...)
    this.collectText = this.add.text(20, hudY + 30, 'Target: ', {
      fontSize: '13px',
      color: '#ffffff',
    }).setDepth(20);

    // Moves counter (right-aligned)
    this.movesText = this.add.text(GAME_W - 20, hudY + 30, '', {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(20);
  }

  private updateHUD(): void {
    const currentEnergy = Math.round(this.crowdSys.getEnergy());
    this.objectiveSys.updateEnergy(currentEnergy); // CRITICAL: updates energy objective state!

    // 0. Update score text
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}`);
    }

    // 1. Update objectives string
    const objs = this.objectiveSys.getObjectives();
    const objStr = objs.map(o => {
      const emoji = o.type === 'energy' ? '⚡' : 
                   (o.tile === 'gold_record' ? '🥇' : 
                    o.tile === 'silver_record' ? '🥈' : 
                    o.tile === 'music_note' ? '🎵' : 
                    o.tile === 'star' ? '⭐' : 
                    o.tile === 'spotlight' ? '💡' : 
                    o.tile === 'speaker' ? '🔊' : 
                    o.type === 'obstacles' ? '🔒' : 
                    o.type === 'score' ? '🏆' : '🎯');
      return `${emoji} ${o.collected}/${o.target}`;
    }).join('  ');
    this.collectText.setText(`Target: ${objStr}`);

    // 2. Update moves string
    this.movesText.setText(`🎸 Moves: ${this.movesLeft}`);

    if (this.movesLeft <= 5) {
      this.movesText.setColor('#ff4444');
    } else {
      this.movesText.setColor('#ffffff');
    }

    this.energyLabel.setText(`⚡ Crowd Energy: ${currentEnergy}%`);

    if (currentEnergy > this.lastCrowdEnergy) {
      this.tweens.add({
        targets: this.energyLabel,
        scale: 1.15,
        duration: 120,
        yoyo: true,
        repeat: 0,
        ease: 'Quad.easeOut'
      });
      this.spawnCrowdCheerVisual();
    }
    this.lastCrowdEnergy = currentEnergy;

    if (this.rays) {
      const extraAlpha = 0.07 + (currentEnergy / 100) * 0.13;
      this.rays.setAlpha(extraAlpha);
    }

    this.drawEnergyFill();
    this.syncBridge();
  }

  private spawnCrowdCheerVisual(): void {
    const emojis = ['🙌', '🤩', '🔥', '✨', '🎸', '🤘', '👏'];
    const count = Phaser.Math.Between(4, 7);
    for (let i = 0; i < count; i++) {
      const char = Phaser.Utils.Array.GetRandom(emojis);
      const cx = Phaser.Math.Between(20, GAME_W - 20);
      const cy = Phaser.Math.Between(760, 810);
      const text = this.add.text(cx, cy, char, { fontSize: '18px' }).setOrigin(0.5).setDepth(30);
      
      this.tweens.add({
        targets: text,
        y: cy - Phaser.Math.Between(60, 140),
        alpha: 0,
        scale: 1.5,
        angle: Phaser.Math.Between(-25, 25),
        duration: 800 + Phaser.Math.Between(0, 300),
        ease: 'Quad.easeOut',
        onComplete: () => {
          text.destroy();
        }
      });
    }
  }

  // ── Energy meter ──────────────────────────────────────────────────────────
  private drawEnergyMeter(): void {
    const my = BOARD_Y + CELL * 8 - TILE_GAP + 14;
    const mx = 15;
    const mw = GAME_W - 30;
    const mh = 22;

    // Label
    this.energyLabel = this.add.text(mx, my - 18, '⚡ Crowd Energy: 0%', {
      fontSize: '13px', color: '#00d4ff', fontStyle: 'bold'
    }).setDepth(20);

    // Track
    const track = this.add.graphics().setDepth(20);
    track.fillStyle(0x1a0033, 1);
    track.fillRoundedRect(mx, my, mw, mh, 6);
    track.lineStyle(1, 0x6c3483, 1);
    track.strokeRoundedRect(mx, my, mw, mh, 6);

    // Target marker
    const targetX = mx + mw * (this.currentLevel.crowdEnergy.targetPercent / 100);
    const marker = this.add.graphics().setDepth(20);
    marker.lineStyle(2, 0xffd700, 0.8);
    marker.strokeLineShape(new Phaser.Geom.Line(targetX, my - 2, targetX, my + mh + 2));
    this.add.text(targetX + 2, my - 14, '★', { fontSize: '10px', color: '#ffd700' }).setDepth(20);

    // Fill bar (updated each tick)
    this.energyBar = this.add.graphics().setDepth(20);
    this.drawEnergyFill();
  }

  private drawEnergyFill(): void {
    const my = BOARD_Y + CELL * 8 - TILE_GAP + 14;
    const mx = 15;
    const mw = GAME_W - 30;
    const mh = 22;
    const pct = this.crowdSys.getEnergy() / 100;

    this.energyBar.clear();
    if (pct <= 0) return;

    const fillW = Math.max(0, (mw - 2) * pct);
    const color = pct >= 1 ? 0xffd700 : pct >= 0.7 ? 0x2ecc71 : 0x00d4ff;
    this.energyBar.fillStyle(color, 1);
    this.energyBar.fillRoundedRect(mx + 1, my + 1, fillW, mh - 2, 5);
  }

  // ── Overlay (Win / Lose) ──────────────────────────────────────────────────
  private createOverlay(): void {
    this.overlay = this.add.container(0, 0).setDepth(10000).setVisible(false);

    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.85);
    dim.fillRect(0, 0, GAME_W, GAME_H);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);

    const panel = this.add.graphics();
    panel.fillStyle(0x1a0033, 0.95);
    panel.fillRoundedRect(35, GAME_H / 2 - 220, GAME_W - 70, 440, 20);
    panel.lineStyle(3, 0xff2d78, 1);
    panel.strokeRoundedRect(35, GAME_H / 2 - 220, GAME_W - 70, 440, 20);

    const titleText = this.add.text(GAME_W / 2, GAME_H / 2 - 185, '', {
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setName('overlayTitle');

    const subText = this.add.text(GAME_W / 2, GAME_H / 2 - 135, '', {
      fontSize: '15px',
      color: '#c39bd3',
      align: 'center',
      wordWrap: { width: 280 },
    }).setOrigin(0.5).setName('overlaySub');

    const starsText = this.add.text(GAME_W / 2, GAME_H / 2 - 85, '', {
      fontSize: '32px',
      color: '#ffd700',
      align: 'center',
    }).setOrigin(0.5).setName('overlayStars');

    const statsText = this.add.text(GAME_W / 2, GAME_H / 2 + 10, '', {
      fontSize: '14px',
      color: '#f5c518',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5).setName('overlayStats');

    this.overlayButtonsContainer = this.add.container(0, 0);

    this.overlay.add([dim, panel, titleText, subText, starsText, statsText, this.overlayButtonsContainer]);
  }

  private createOverlayButton(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: number,
    onClick: () => void
  ): void {
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);

    const txt = this.add.text(x, y, text, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerdown', onClick);
    txt.on('pointerover', () => { bg.setAlpha(0.8); });
    txt.on('pointerout', () => { bg.setAlpha(1); });

    this.overlayButtonsContainer.add([bg, txt]);
  }

  private showWin(): void {
    this.setGameState('win');
    this.overlayType = 'win';
    this.crowdSys.fillOnWin();
    this.drawEnergyFill();

    const energyVal = Math.round(this.crowdSys.getEnergy());
    const stars = StarsSystem.calculateStars(this.score, energyVal, this.movesLeft, this.currentLevel.starThresholds);

    // Save progress
    ProgressManager.markLevelCompleted(this.currentLevel.number, this.score, energyVal, stars);

    // Update StateBridge
    StateBridge.setStarsEarned(stars);
    StateBridge.setHighestUnlockedLevel(ProgressManager.getHighestUnlockedLevel());
    StateBridge.setCompletedLevels(ProgressManager.getCompletedLevels());
    const newStats = ProgressManager.getLevelStats(this.currentLevel.number);
    StateBridge.setBestScoreCurrentLevel(newStats ? newStats.score : this.score);

    StateBridge.setPlaythroughTelemetry({
      totalMatches: this.totalMatches,
      totalPowerupsUsed: this.totalPowerupsUsed,
      totalObstaclesCleared: this.obstaclesClearedCount,
      finalScore: this.score,
      finalStars: stars,
      levelResult: 'win'
    });

    this.syncBridge();
    SoundEffects.playWin();

    const title = this.overlay.getByName('overlayTitle') as Phaser.GameObjects.Text;
    const sub   = this.overlay.getByName('overlaySub')   as Phaser.GameObjects.Text;
    const starG = this.overlay.getByName('overlayStars') as Phaser.GameObjects.Text;
    const stats = this.overlay.getByName('overlayStats') as Phaser.GameObjects.Text;

    title.setText('🎉 ENCORE!');
    if (TEST_MODE && !(window as any).screenshotMode) {
      const completedCount = this.objectiveSys.getObjectives().filter(o => o.collected >= o.target).length;
      const totalCount = this.objectiveSys.getObjectives().length;
      sub.setText(
        `--- DEBUG PLAYTEST REPORT ---\n` +
        `Moves Left: ${this.movesLeft}\n` +
        `Score: ${this.score}\n` +
        `Crowd Energy: ${energyVal}%\n` +
        `Stars Earned: ${stars}\n` +
        `Objectives Completed: ${completedCount}/${totalCount}\n` +
        `Power-Ups Used: ${this.totalPowerupsUsed}\n` +
        `Obstacles Cleared: ${this.obstaclesClearedCount}`
      );
    } else {
      sub.setText('The crowd goes wild!\nYou nailed the performance!');
    }
    starG.setText('⭐'.repeat(stars));

    const objStatsLines = this.objectiveSys.getObjectives().map(o => {
      const emoji = o.type === 'energy' ? '⚡' : 
                   (o.tile === 'gold_record' ? '🥇' : 
                    o.tile === 'silver_record' ? '🥈' : 
                    o.tile === 'music_note' ? '🎵' : 
                    o.tile === 'star' ? '⭐' : 
                    o.tile === 'spotlight' ? '💡' : 
                    o.tile === 'speaker' ? '🔊' : 
                    o.type === 'obstacles' ? '🔒' : 
                    o.type === 'score' ? '🏆' : '🎯');
      const name = o.type === 'energy' ? 'Energy' : 
                  (o.type === 'obstacles' ? 'Obstacles' : 
                   (o.type === 'score' ? 'Score' : 
                    o.tile?.replace('_', ' ')));
      return `${emoji} ${name}: ${o.collected}/${o.target}`;
    }).join('\n');

    stats.setText(
      `${objStatsLines}\n` +
      `🎸 Moves used: ${this.currentLevel.moves - this.movesLeft}\n` +
      `⚡ Energy: ${energyVal}%\n` +
      `🏆 Score: ${this.score}`
    );

    // Clear old buttons
    this.overlayButtonsContainer.removeAll(true);

    // Rebuild Win Buttons
    // 1. Next Concert (Starts next level with wrap-around)
    const nextIndex = (this.currentLevelIndex + 1) % LEVELS.length;
    this.createOverlayButton(
      GAME_W / 2,
      GAME_H / 2 + 125,
      200,
      42,
      '▶ Next Concert',
      0xff2d78, // Pink
      () => {
        this.scene.restart({ levelIndex: nextIndex });
      }
    );

    // 2. Replay current level
    this.createOverlayButton(
      GAME_W / 2 - 70,
      GAME_H / 2 + 185,
      120,
      42,
      '🔄 Replay',
      0x566573, // Grey
      () => {
        this.scene.restart({ levelIndex: this.currentLevelIndex });
      }
    );

    // 3. Back to Tour Map
    this.createOverlayButton(
      GAME_W / 2 + 70,
      GAME_H / 2 + 185,
      120,
      42,
      '🗺️ Tour Map',
      0x28b463, // Green
      () => {
        this.scene.start('VenueMapScene');
      }
    );

    this.overlay.setDepth(10000);
    this.overlay.setAlpha(0);
    this.overlay.setVisible(true);
    this.tweens.add({ targets: this.overlay, alpha: { from: 0, to: 1 }, duration: 400 });

    // Confetti-style particle burst
    for (let i = 0; i < 20; i++) {
      const star = this.add.text(
        Phaser.Math.Between(20, GAME_W - 20),
        Phaser.Math.Between(50, 300),
        Phaser.Utils.Array.GetRandom(['⭐', '🎵', '🎉', '✨', '🎸']),
        { fontSize: '20px' }
      ).setDepth(30);
      this.tweens.add({
        targets: star,
        y: star.y + Phaser.Math.Between(200, 500),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(1000, 2000),
        ease: 'Quad.easeIn',
        delay: Phaser.Math.Between(0, 500),
      });
    }
  }

  private showLose(): void {
    this.setGameState('lose');
    this.overlayType = 'lose';

    StateBridge.setPlaythroughTelemetry({
      totalMatches: this.totalMatches,
      totalPowerupsUsed: this.totalPowerupsUsed,
      totalObstaclesCleared: this.obstaclesClearedCount,
      finalScore: this.score,
      finalStars: 0,
      levelResult: 'lose'
    });

    this.syncBridge();
    SoundEffects.playLose();

    const title = this.overlay.getByName('overlayTitle') as Phaser.GameObjects.Text;
    const sub   = this.overlay.getByName('overlaySub')   as Phaser.GameObjects.Text;
    const starG = this.overlay.getByName('overlayStars') as Phaser.GameObjects.Text;
    const stats = this.overlay.getByName('overlayStats') as Phaser.GameObjects.Text;

    title.setText('😔 Show Failed');
    if (TEST_MODE && !(window as any).screenshotMode) {
      const energyVal = Math.round(this.crowdSys.getEnergy());
      const completedCount = this.objectiveSys.getObjectives().filter(o => o.collected >= o.target).length;
      const totalCount = this.objectiveSys.getObjectives().length;
      sub.setText(
        `--- DEBUG PLAYTEST REPORT ---\n` +
        `Moves Left: ${this.movesLeft}\n` +
        `Score: ${this.score}\n` +
        `Crowd Energy: ${energyVal}%\n` +
        `Stars Earned: 0\n` +
        `Objectives Completed: ${completedCount}/${totalCount}\n` +
        `Power-Ups Used: ${this.totalPowerupsUsed}\n` +
        `Obstacles Cleared: ${this.obstaclesClearedCount}`
      );
    } else {
      sub.setText('The crowd wanted an encore...\nGo practice and try again!');
    }
    starG.setText('');

    const objStatsLines = this.objectiveSys.getObjectives().map(o => {
      const emoji = o.type === 'energy' ? '⚡' : 
                   (o.tile === 'gold_record' ? '🥇' : 
                    o.tile === 'silver_record' ? '🥈' : 
                    o.tile === 'music_note' ? '🎵' : 
                    o.tile === 'star' ? '⭐' : 
                    o.tile === 'spotlight' ? '💡' : 
                    o.tile === 'speaker' ? '🔊' : 
                    o.type === 'obstacles' ? '🔒' : 
                    o.type === 'score' ? '🏆' : '🎯');
      const name = o.type === 'energy' ? 'Energy' : 
                  (o.type === 'obstacles' ? 'Obstacles' : 
                   (o.type === 'score' ? 'Score' : 
                    o.tile?.replace('_', ' ')));
      return `${emoji} ${name}: ${o.collected}/${o.target}`;
    }).join('\n');

    stats.setText(
      `${objStatsLines}\n` +
      `⚡ Energy: ${Math.round(this.crowdSys.getEnergy())}%\n` +
      `🏆 Score: ${this.score}`
    );

    // Clear old buttons
    this.overlayButtonsContainer.removeAll(true);

    // Rebuild Lose Buttons
    // 1. Try Again (replays current level)
    this.createOverlayButton(
      GAME_W / 2,
      GAME_H / 2 + 125,
      200,
      42,
      '▶ Try Again',
      0xff2d78, // Pink
      () => {
        this.scene.restart({ levelIndex: this.currentLevelIndex });
      }
    );

    // 2. Back to Tour Map
    this.createOverlayButton(
      GAME_W / 2,
      GAME_H / 2 + 185,
      200,
      42,
      '🗺️ Tour Map',
      0x28b463, // Green
      () => {
        this.scene.start('VenueMapScene');
      }
    );

    this.overlay.setDepth(10000);
    this.overlay.setAlpha(0);
    this.overlay.setVisible(true);
    this.tweens.add({ targets: this.overlay, alpha: { from: 0, to: 1 }, duration: 400 });
  }

  private showTutorial(): void {
    this.setGameState('resolving'); // block board interaction
    this.tutorialContainer = this.add.container(0, 0).setDepth(9500);

    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.8);
    dim.fillRect(0, 0, GAME_W, GAME_H);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_W, GAME_H), Phaser.Geom.Rectangle.Contains);
    this.tutorialContainer.add(dim);

    const panel = this.add.graphics();
    panel.fillStyle(0x1a0033, 0.95);
    panel.fillRoundedRect(35, GAME_H / 2 - 180, GAME_W - 70, 360, 16);
    panel.lineStyle(3, 0xff2d78, 1);
    panel.strokeRoundedRect(35, GAME_H / 2 - 180, GAME_W - 70, 360, 16);
    this.tutorialContainer.add(panel);

    const title = this.add.text(GAME_W / 2, GAME_H / 2 - 140, 'HOW TO PLAY', {
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff2d78',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.tutorialContainer.add(title);

    const tips = [
      '🎵 Swap blocks to make matches.',
      '🥇 Collect records to excite the crowd.',
      '💥 Power-ups create stage effects.'
    ];

    tips.forEach((tip, idx) => {
      const tipText = this.add.text(60, GAME_H / 2 - 70 + idx * 55, tip, {
        fontSize: '15px',
        color: '#ffffff',
        wordWrap: { width: GAME_W - 120 }
      });
      this.tutorialContainer!.add(tipText);
    });

    // Dismiss Button
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xff2d78, 1);
    btnBg.fillRoundedRect(GAME_W / 2 - 80, GAME_H / 2 + 110, 160, 40, 8);

    const btnText = this.add.text(GAME_W / 2, GAME_H / 2 + 130, 'GOT IT', {
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnText.on('pointerdown', () => this.dismissTutorial());
    btnText.on('pointerover', () => btnBg.setAlpha(0.8));
    btnText.on('pointerout', () => btnBg.setAlpha(1));

    this.tutorialContainer.add([btnBg, btnText]);
  }

  private dismissTutorial(): void {
    if (this.tutorialContainer) {
      this.tweens.add({
        targets: this.tutorialContainer,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          this.tutorialContainer?.destroy();
          this.tutorialContainer = null;
          localStorage.setItem('rockstar_tutorial_shown', 'true');
          this.setGameState('idle'); // unblock board interaction
        }
      });
    }
  }

  // ── Input handler ─────────────────────────────────────────────────────────
  private onTileTap(tile: Tile): void {
    if (this.overlayType !== '') return;
    if (this.state !== 'idle') return;

    if (!this.selectedTile) {
      // First tap → select
      this.selectedTile = tile;
      tile.setSelected(true);
      return;
    }

    if (this.selectedTile === tile) {
      // Tap same tile → deselect
      tile.setSelected(false);
      this.selectedTile = null;
      return;
    }

    const a = this.selectedTile;
    const b = tile;
    a.setSelected(false);
    this.selectedTile = null;

    // Check adjacency
    if (!this.board.canSwap(a.row, a.col, b.row, b.col)) {
      a.playInvalidAnim();
      b.playInvalidAnim();
      return;
    }

    // Reset telemetry variables for this turn
    this.lastClearCount = 0;
    this.lastComboCount = 0;
    this.lastPowerupActivated = '';
    this.lastPowerupCreated = '';
    this.lastObstacleCleared = '';
    this.lastBoardAction = 'normal';

    const powerUps = ['microphone_blast', 'spotlight_burst', 'stage_explosion', 'superstar_power'];
    const isAPowerUp = powerUps.includes(a.tileType);
    const isBPowerUp = powerUps.includes(b.tileType);

    if (isAPowerUp || isBPowerUp) {
      // Swap involving power-up
      this.movesLeft--;
      this.setGameState('swapping');
      this.updateHUD();
      this.board.swap(a.row, a.col, b.row, b.col);

      this.tiles[a.row][a.col] = b;
      this.tiles[b.row][b.col] = a;
      const ar = a.row, ac = a.col;
      a.row = b.row; a.col = b.col;
      b.row = ar;    b.col = ac;

      this.animateSwap(a, b, () => {
        if (isAPowerUp && isBPowerUp) {
          this.activateStageExplosionCombo(a, b);
        } else {
          const puTile = isAPowerUp ? a : b;
          const normalTile = isAPowerUp ? b : a;
          this.activateSinglePowerUp(puTile, normalTile.tileType);
        }
      });
      return;
    }

    // Check if swap creates a match (normal swap)
    if (!this.board.hasMatchAfterSwap(a.row, a.col, b.row, b.col)) {
      // Animate swap and bounce back
      this.animateSwap(a, b, () => {
        this.animateSwap(b, a, () => {});
        a.playInvalidAnim();
        b.playInvalidAnim();
      });
      return;
    }

    // Valid normal swap – consume a move
    this.movesLeft--;
    this.setGameState('swapping');
    this.updateHUD();
    this.board.swap(a.row, a.col, b.row, b.col);

    this.tiles[a.row][a.col] = b;
    this.tiles[b.row][b.col] = a;
    const ar2 = a.row, ac2 = a.col;
    a.row = b.row; a.col = b.col;
    b.row = ar2;   b.col = ac2;

    this.animateSwap(a, b, () => {
      this.setGameState('resolving');
      this.runResolveLoop(false);
    });
  }

  // ── Swap animation ────────────────────────────────────────────────────────
  private animateSwap(a: Tile, b: Tile, onComplete: () => void): void {
    let done = 0;
    const check = () => { if (++done === 2) onComplete(); };

    this.tweens.add({
      targets: a, x: tileX(a.col), y: tileY(a.row),
      duration: 180, ease: 'Quad.easeOut', onComplete: check,
    });
    this.tweens.add({
      targets: b, x: tileX(b.col), y: tileY(b.row),
      duration: 180, ease: 'Quad.easeOut', onComplete: check,
    });
  }

  // ── Power-up activation & Combos ──────────────────────────────────────────
  private activateStageExplosionCombo(a: Tile, b: Tile): void {
    this.lastPowerupActivated = 'stage_explosion';
    this.totalPowerupsUsed += 2;

    // Stage Explosion is a 5x5 clear centered at target (b's new position)
    const result = this.board.triggerStageExplosion(b.row, b.col);

    // Flash both power-ups
    a.playMatchAnim(() => {
      if (this.tiles[a.row]?.[a.col] === a) this.tiles[a.row][a.col] = null;
      a.destroy();
    });
    b.playMatchAnim(() => {
      if (this.tiles[b.row]?.[b.col] === b) this.tiles[b.row][b.col] = null;
      b.destroy();
    });

    this.handlePowerUpClears(result, 'stage_explosion');
  }

  private activateSinglePowerUp(puTile: Tile, targetType: string): void {
    this.lastPowerupActivated = puTile.tileType;
    this.totalPowerupsUsed++;

    const result = this.board.activatePowerUp(puTile.row, puTile.col, puTile.tileType, targetType);

    // Flash the power-up tile
    puTile.playMatchAnim(() => {
      if (this.tiles[puTile.row]?.[puTile.col] === puTile) {
        this.tiles[puTile.row][puTile.col] = null;
      }
      puTile.destroy();
    });

    this.handlePowerUpClears(result, puTile.tileType);
  }

  private handlePowerUpClears(result: any, activatedType: string): void {
    const tileTypeCounts: Record<string, number> = {};
    let clearCount = 0;

    this.triggerVoxelPowerUpFX(result, activatedType);

    for (const { row, col } of result.clearedCells) {
      const visual = this.tiles[row][col];
      if (visual) {
        tileTypeCounts[visual.tileType] = (tileTypeCounts[visual.tileType] || 0) + 1;
        clearCount++;
        visual.playMatchAnim(() => { visual.destroy(); });
        this.tiles[row][col] = null;
      }
    }

    for (const obs of result.obstaclesCleared) {
      this.lastObstacleCleared = obs.type;
      const visual = this.tiles[obs.row]?.[obs.col];
      if (visual) {
        if (obs.type === 'locked') {
          visual.setLockedState(false);
        } else if (obs.type === 'fog') {
          visual.setFogState(false);
        }
      }
    }

    this.lastClearCount = clearCount;

    // Update objectives
    this.objectiveSys.onTilesCleared(tileTypeCounts);
    this.objectiveSys.onObstaclesCleared(result.obstaclesCleared.length);
    this.obstaclesClearedCount += result.obstaclesCleared.length;
    SoundEffects.playMatch();

    // Reward energy for power-up clears (e.g. 2 energy per tile cleared)
    this.crowdSys.addEnergy(clearCount * 2);

    // Update Score
    const obstacleBonus = result.obstaclesCleared.length * 100;
    const powerUpScore = (result.clearedCells.length * 50) + obstacleBonus;
    this.updateScore(this.score + powerUpScore);

    // Trigger visual-only spotlight and board border neon pulses
    if (this.rays) {
      this.tweens.add({
        targets: this.rays,
        alpha: 0.38,
        duration: 150,
        yoyo: true,
        repeat: 0,
        onComplete: () => {
          const currentEnergy = Math.round(this.crowdSys.getEnergy());
          const targetAlpha = 0.07 + (currentEnergy / 100) * 0.13;
          this.rays.setAlpha(targetAlpha);
        }
      });
    }

    if (this.boardGlow) {
      this.tweens.add({
        targets: this.boardGlow,
        alpha: 1.0,
        duration: 180,
        yoyo: true,
        repeat: 0,
        onComplete: () => {
          this.boardGlow.setAlpha(0.3);
        }
      });
    }

    this.time.delayedCall(350, () => {
      this.applyGravityAndRefillVisual(() => {
        this.setGameState('resolving');
        this.updateHUD();
        this.runResolveLoop(true);
      });
    });
  }

  private triggerVoxelPowerUpFX(result: any, activatedType: string): void {
    const cells = result.clearedCells || [];
    if (cells.length === 0) return;

    let sumX = 0, sumY = 0;
    cells.forEach((c: any) => {
      sumX += tileX(c.col);
      sumY += tileY(c.row);
    });
    const avgX = sumX / cells.length;
    const avgY = sumY / cells.length;

    if (activatedType === 'microphone_blast') {
      // Microphone Blast: line of cubes flashes and breaks
      const beam = this.add.graphics().setDepth(18);
      beam.fillStyle(0xffffff, 0.85);
      beam.lineStyle(3, 0x00d4ff, 1);
      for (const { row, col } of cells) {
        const tx = tileX(col);
        const ty = tileY(row);
        beam.fillRoundedRect(tx - TILE_SIZE/2 + 2, ty - TILE_SIZE/2 + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6);
        beam.strokeRoundedRect(tx - TILE_SIZE/2 + 2, ty - TILE_SIZE/2 + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6);
      }

      this.tweens.add({
        targets: beam,
        alpha: 0,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 350,
        ease: 'Quad.easeOut',
        onComplete: () => beam.destroy()
      });
    }
    else if (activatedType === 'spotlight_burst') {
      // Spotlight Burst: 3x3 cube burst
      const burst = this.add.graphics().setDepth(18);
      burst.fillStyle(0xffd700, 0.55);
      burst.lineStyle(4, 0xffffff, 1);
      
      for (const { row, col } of cells) {
        const tx = tileX(col);
        const ty = tileY(row);
        burst.fillRoundedRect(tx - TILE_SIZE/2 + 1, ty - TILE_SIZE/2 + 1, TILE_SIZE - 2, TILE_SIZE - 2, 6);
        burst.strokeRoundedRect(tx - TILE_SIZE/2 + 1, ty - TILE_SIZE/2 + 1, TILE_SIZE - 2, TILE_SIZE - 2, 6);
      }

      this.tweens.add({
        targets: burst,
        alpha: 0,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 400,
        ease: 'Back.easeOut',
        onComplete: () => burst.destroy()
      });
    }
    else if (activatedType === 'stage_explosion') {
      // Stage Explosion: larger cube shockwave
      const shockwave = this.add.graphics().setDepth(18);
      shockwave.lineStyle(6, 0xff2d78, 1);
      shockwave.strokeRoundedRect(-40, -40, 80, 80, 10);
      shockwave.x = avgX;
      shockwave.y = avgY;

      shockwave.fillStyle(0xff2d78, 0.25);
      shockwave.fillRoundedRect(-40, -40, 80, 80, 10);

      this.tweens.add({
        targets: shockwave,
        scaleX: 2.8,
        scaleY: 2.8,
        alpha: 0,
        duration: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => shockwave.destroy()
      });

      for (let i = 0; i < 12; i++) {
        const p = this.add.text(avgX, avgY, '💥', { fontSize: '16px' }).setOrigin(0.5).setDepth(19);
        const angle = (i / 12) * Math.PI * 2;
        const dist = Phaser.Math.Between(80, 160);
        this.tweens.add({
          targets: p,
          x: avgX + Math.cos(angle) * dist,
          y: avgY + Math.sin(angle) * dist,
          alpha: 0,
          scale: 0.2,
          duration: 600,
          onComplete: () => p.destroy()
        });
      }
    }
    else if (activatedType === 'superstar_power') {
      // Superstar Power: all matching cube colors sparkle and dissolve
      for (const { row, col } of cells) {
        const tx = tileX(col);
        const ty = tileY(row);

        for (let k = 0; k < 3; k++) {
          const star = this.add.text(
            tx + Phaser.Math.Between(-15, 15),
            ty + Phaser.Math.Between(-15, 15),
            '⭐',
            { fontSize: '14px' }
          ).setOrigin(0.5).setDepth(19);

          this.tweens.add({
            targets: star,
            y: star.y - Phaser.Math.Between(30, 70),
            alpha: 0,
            scale: 1.5,
            angle: Phaser.Math.Between(-180, 180),
            duration: 700 + Phaser.Math.Between(0, 300),
            ease: 'Quad.easeOut',
            onComplete: () => star.destroy()
          });
        }
      }
    }
  }

  private showComboFeedback(combo: number): void {
    let msg = `Combo x${combo}`;
    if (combo === 3) msg = 'Encore Combo!';
    else if (combo >= 4) msg = 'Superstar Moment!';

    const tx = GAME_W / 2;
    const ty = BOARD_Y + BOARD_W / 2;
    const floater = this.add.text(tx, ty, msg, {
      fontSize: combo >= 4 ? '26px' : '20px',
      fontStyle: 'bold',
      color: combo >= 4 ? '#ffd700' : combo === 3 ? '#ff2d78' : '#00d4ff',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { color: '#000000', blur: 6, fill: true }
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: floater,
      y: ty - 60,
      scale: 1.25,
      alpha: 0,
      duration: 1200,
      ease: 'Back.easeOut',
      onComplete: () => floater.destroy()
    });

    SoundEffects.playCheer();

    if (this.rays) {
      this.tweens.add({ targets: this.rays, alpha: 0.35, duration: 150, yoyo: true, repeat: 0 });
    }
    if (this.boardGlow) {
      this.tweens.add({ targets: this.boardGlow, alpha: 1.0, duration: 150, yoyo: true, repeat: 0 });
    }
  }

  private spawnMicrophoneBlastCheat(): void {
    const r = 3;
    const c = 1;
    this.board.setCell(r, c, 'microphone_blast');
    if (this.tiles[r][c]) {
      this.tiles[r][c]?.setTileType('microphone_blast');
    }
    this.lastPowerupCreated = 'microphone_blast';
    this.syncBridge();
  }

  private spawnSuperstarCheat(): void {
    const r = 3;
    const c = 1;
    this.board.setCell(r, c, 'superstar_power');
    if (this.tiles[r][c]) {
      this.tiles[r][c]?.setTileType('superstar_power');
    }
    this.lastPowerupCreated = 'superstar_power';
    this.syncBridge();
  }

  private spawnSpotlightBurstCheat(): void {
    const r = 3;
    const c = 1;
    this.board.setCell(r, c, 'spotlight_burst');
    if (this.tiles[r][c]) {
      this.tiles[r][c]?.setTileType('spotlight_burst');
    }
    this.lastPowerupCreated = 'spotlight_burst';
    this.syncBridge();
  }

  private spawnStageExplosionCheat(): void {
    const r = 3;
    const c = 1;
    this.board.setCell(r, c, 'stage_explosion');
    if (this.tiles[r][c]) {
      this.tiles[r][c]?.setTileType('stage_explosion');
    }
    this.lastPowerupCreated = 'stage_explosion';
    this.syncBridge();
  }

  private spawnObstacleSetupCheat(): void {
    this.board.setLocked(5, 2, true);
    if (this.tiles[5][2]) {
      this.tiles[5][2].setLockedState(true);
    }
    this.board.setFog(3, 6, 1);
    if (this.tiles[3][6]) {
      this.tiles[3][6].setFogState(true);
    }
    this.syncBridge();
  }

  private resetBoardCheat(): void {
    this.board = new Board(
      this.currentLevel.board.rows,
      this.currentLevel.board.columns,
      this.currentLevel.board.tileTypes,
      TEST_MODE,
      this.currentLevel.board.lockedPositions || [],
      this.currentLevel.board.fogPositions || []
    );
    this.obstaclesClearedCount = 0;
    this.lastObstacleCleared = '';
    this.lastClearCount = 0;
    this.lastComboCount = 0;
    this.lastPowerupActivated = '';
    this.lastPowerupCreated = '';

    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        if (this.tiles[r][c]) {
          this.tiles[r][c]?.destroy();
          this.tiles[r][c] = null;
        }
      }
    }
    this.buildTiles();
    this.syncBridge();
  }

  // ── Resolve loop (cascade) ────────────────────────────────────────────────
  private runResolveLoop(isCascade: boolean): void {
    const result = this.board.resolve(isCascade);
    if (!result) {
      this.comboCount = 0;
      this.setGameState('idle');
      this.updateHUD();
      this.checkEndConditions();
      return;
    }

    this.totalMatches += result.groups.length;

    // Update combo/clear counts
    this.comboCount++;
    this.lastComboCount = this.comboCount;
    this.lastClearCount = Math.max(this.lastClearCount, result.clearedCells.length);

    if (result.powerUpCreated.length > 0) {
      this.lastPowerupCreated = result.powerUpCreated[result.powerUpCreated.length - 1].type;
    }

    if (result.obstaclesCleared.length > 0) {
      this.lastObstacleCleared = result.obstaclesCleared[result.obstaclesCleared.length - 1].type;
    }

    if (this.comboCount >= 2) {
      this.showComboFeedback(this.comboCount);
    }

    // Update systems
    this.objectiveSys.onTilesCleared(result.tileTypeCounts);
    this.objectiveSys.onObstaclesCleared(result.obstaclesCleared.length);
    this.obstaclesClearedCount += result.obstaclesCleared.length;
    const oldEnergy = this.crowdSys.getEnergy();
    this.crowdSys.onMatches(result.groups, result.isCascade);
    const newEnergy = this.crowdSys.getEnergy();

    // Update Score
    let matchScore = 0;
    for (const g of result.groups) {
      if (g.cells.length === 3) matchScore += 300;
      else if (g.cells.length === 4) matchScore += 600;
      else if (g.cells.length >= 5) matchScore += 1000;
    }
    const stepScore = (matchScore * this.comboCount) + (result.obstaclesCleared.length * 100);
    this.updateScore(this.score + stepScore);

    SoundEffects.playMatch();
    if (newEnergy > oldEnergy) {
      SoundEffects.playCheer();
    }

    // Trigger visual-only spotlight and board border neon pulses
    if (this.rays) {
      this.tweens.add({
        targets: this.rays,
        alpha: 0.38,
        duration: 150,
        yoyo: true,
        repeat: 0,
        onComplete: () => {
          const currentEnergy = Math.round(this.crowdSys.getEnergy());
          const targetAlpha = 0.07 + (currentEnergy / 100) * 0.13;
          this.rays.setAlpha(targetAlpha);
        }
      });
    }

    if (this.boardGlow) {
      this.tweens.add({
        targets: this.boardGlow,
        alpha: 1.0,
        duration: 180,
        yoyo: true,
        repeat: 0,
        onComplete: () => {
          this.boardGlow.setAlpha(0.3);
        }
      });
    }

    // Update lock and fog overlays on tiles where obstacles were cleared (especially if tile itself wasn't removed)
    for (const obs of result.obstaclesCleared) {
      const visual = this.tiles[obs.row]?.[obs.col];
      if (visual) {
        if (obs.type === 'locked') {
          visual.setLockedState(false);
        } else if (obs.type === 'fog') {
          visual.setFogState(false);
        }
      }
    }

    // Animate match clears
    let animsDone = 0;
    const totalAnims = result.clearedCells.length;

    // Handle power-up placement
    const puSet = new Set(result.powerUpCreated.map(p => `${p.row},${p.col}`));
    const puMap = new Map(result.powerUpCreated.map(p => [`${p.row},${p.col}`, p.type]));

    if (totalAnims === 0) {
      this.applyGravityAndRefillVisual(() => {
        this.time.delayedCall(100, () => this.runResolveLoop(true));
      });
      return;
    }

    for (const { row, col } of result.clearedCells) {
      const visual = this.tiles[row][col];
      if (visual) {
        visual.playMatchAnim(() => {
          if (puSet.has(`${row},${col}`)) {
            const pType = puMap.get(`${row},${col}`) || 'microphone_blast';
            // Replace with power-up visual
            const pu = new Tile(this, row, col, pType as any, tileX(col), tileY(row));
            pu.setScale(0.1);
            this.tweens.add({ targets: pu, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
            this.tiles[row][col] = pu;
          } else {
            visual.destroy();
            this.tiles[row][col] = null;
          }
          if (++animsDone === totalAnims) {
            this.applyGravityAndRefillVisual(() => {
              this.time.delayedCall(100, () => this.runResolveLoop(true));
            });
          }
        });
      } else {
        if (++animsDone === totalAnims) {
          this.applyGravityAndRefillVisual(() => {
            this.time.delayedCall(100, () => this.runResolveLoop(true));
          });
        }
      }
    }
  }

  // ── Visual gravity + refill ───────────────────────────────────────────────
  private applyGravityAndRefillVisual(onComplete: () => void): void {
    const grid = this.board.getGrid();
    let tweenCount = 0;
    let tweensDone = 0;

    const check = () => { if (++tweensDone >= tweenCount && tweenCount > 0) onComplete(); };

    // Rebuild tiles array from board state
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const type = grid[r][c];
        const visual = this.tiles[r][c];

        if (!type) {
          if (visual) { visual.destroy(); this.tiles[r][c] = null; }
          continue;
        }

        if (visual) {
          // Update type if changed (e.g., power-up preserved)
          if (visual.tileType !== type) visual.setTileType(type as any);
          visual.setLockedState(this.board.isLocked(r, c));
          visual.setFogState(this.board.hasFog(r, c));

          // Move to correct position
          const tx = tileX(c);
          const ty = tileY(r);
          if (Math.abs(visual.x - tx) > 1 || Math.abs(visual.y - ty) > 1) {
            tweenCount++;
            visual.row = r; visual.col = c;
            this.tweens.add({
              targets: visual, x: tx, y: ty,
              duration: 240, ease: 'Quad.easeIn',
              onComplete: check,
            });
          }
        } else {
          // New tile
          tweenCount++;
          const newTile = new Tile(this, r, c, type as any, tileX(c), tileY(r) - CELL * 4);
          newTile.setLockedState(this.board.isLocked(r, c));
          newTile.setFogState(this.board.hasFog(r, c));
          this.tiles[r][c] = newTile;
          this.tweens.add({
            targets: newTile, y: tileY(r),
            duration: 280, ease: 'Bounce.easeOut',
            delay: c * 20,
            onComplete: check,
          });
        }
      }
    }

    if (tweenCount === 0) {
      this.time.delayedCall(50, onComplete);
    } else {
      SoundEffects.playDrop();
    }
  }

  // ── End condition check ───────────────────────────────────────────────────
  private checkEndConditions(): void {
    if (this.objectiveSys.isComplete()) {
      this.time.delayedCall(300, () => this.showWin());
      return;
    }
    if (this.movesLeft <= 0) {
      this.time.delayedCall(300, () => this.showLose());
    }
  }

  private checkAndHandleDeadBoard(): void {
    if (!this.board) return;
    if (this.state !== 'idle') return;
    if (this.overlayType !== '') return;
    if (this.movesLeft <= 0 || this.objectiveSys.isComplete()) return;
    if (this.isShuffling) return;

    if (!this.board.hasAnyValidMove()) {
      this.handleDeadBoardReshuffle();
    }
  }

  private handleDeadBoardReshuffle(): void {
    if (this.isShuffling) return;
    this.isShuffling = true;

    this.setGameState('resolving'); // prevent inputs
    this.lastBoardAction = 'shuffle';
    this.shuffleCount++;
    this.showShuffleFeedback();

    const movableVisuals: Tile[] = [];
    for (let r = 0; r < this.board.rows; r++) {
      for (let c = 0; c < this.board.cols; c++) {
        const visual = this.tiles[r][c];
        if (visual && !this.board.isLocked(r, c)) {
          movableVisuals.push(visual);
        }
      }
    }

    this.tweens.add({
      targets: movableVisuals,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 350,
      ease: 'Back.easeIn',
      onComplete: () => {
        // Destroy existing visual tiles
        for (let r = 0; r < this.board.rows; r++) {
          for (let c = 0; c < this.board.cols; c++) {
            const tileToDestroy = this.tiles[r][c];
            if (tileToDestroy) {
              tileToDestroy.destroy();
              this.tiles[r][c] = null;
            }
          }
        }

        // Shuffle logic board
        this.board.shuffle();

        // Recreate all visual tiles
        const grid = this.board.getGrid();
        for (let r = 0; r < this.board.rows; r++) {
          for (let c = 0; c < this.board.cols; c++) {
            const type = grid[r][c];
            const t = new Tile(this, r, c, type as any, tileX(c), tileY(r));
            t.setLockedState(this.board.isLocked(r, c));
            t.setFogState(this.board.hasFog(r, c));
            
            t.setScale(0.1);
            t.setAlpha(0);
            this.tiles[r][c] = t;

            this.tweens.add({
              targets: t,
              scaleX: 1,
              scaleY: 1,
              alpha: 1,
              duration: 350,
              delay: (r * 20) + (c * 5),
              ease: 'Back.easeOut'
            });
          }
        }

        // Wait for animations to complete, then return to resolving/idle loop
        this.time.delayedCall(450, () => {
          this.isShuffling = false;
          this.setGameState('resolving');
          this.runResolveLoop(false); // check for accidental matches on the new board
        });
      }
    });
  }

  private showShuffleFeedback(): void {
    const tx = GAME_W / 2;
    const ty = BOARD_Y + BOARD_W / 2;
    const floater = this.add.text(tx, ty, "No moves! Reshuffling stage...", {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ff2d78',
      stroke: '#000000',
      strokeThickness: 5,
      shadow: { color: '#000000', blur: 6, fill: true }
    }).setOrigin(0.5).setDepth(30);

    SoundEffects.playDrop();

    this.tweens.add({
      targets: floater,
      y: ty - 40,
      scale: 1.15,
      alpha: 0,
      duration: 1600,
      ease: 'Quad.easeOut',
      onComplete: () => floater.destroy()
    });

    if (this.boardGlow) {
      this.tweens.add({
        targets: this.boardGlow,
        alpha: 1.0,
        duration: 250,
        yoyo: true,
        repeat: 1
      });
    }
  }
}
