import Phaser from 'phaser';
import { StateBridge } from '../testing/StateBridge';
import { ProgressManager } from '../utils/ProgressManager';
import { LEVELS } from '../levels/levels';
import { TEST_MODE } from '../main';
import { SettingsOverlay } from '../game/SettingsOverlay';

const GAME_W = 390;
const GAME_H = 844;

export class VenueMapScene extends Phaser.Scene {
  private highestUnlocked = 1;
  private completedLevels: number[] = [];
  private debugText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'VenueMapScene' });
  }

  create(): void {
    try {
      StateBridge.setCurrentScene('VenueMapScene');

      // Fetch progress
      if ((window as any).screenshotMode) {
        this.highestUnlocked = 5;
        this.completedLevels = [1, 2, 3];
      } else {
        this.highestUnlocked = ProgressManager.getHighestUnlockedLevel();
        this.completedLevels = ProgressManager.getCompletedLevels();
      }

      // Expose to StateBridge
      StateBridge.setHighestUnlockedLevel(this.highestUnlocked);
      StateBridge.setCompletedLevels(this.completedLevels);

      this.debugText = null;
      if (TEST_MODE && !(window as any).screenshotMode) {
        this.debugText = this.add.text(10, 10, `[DEBUG] Scene: VenueMapScene | testMode: true | Level: ${this.highestUnlocked}`, {
          fontSize: '11px',
          color: '#ff0000',
          backgroundColor: '#000000'
        }).setDepth(20000);
      }

      if (TEST_MODE) {
        this.input.keyboard?.on('keydown-H', () => {
          (window as any).screenshotMode = !(window as any).screenshotMode;
          this.scene.restart();
        });
      }

      // Background
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0a0014, 0x0a0014, 0x14002e, 0x14002e, 1);
      bg.fillRect(0, 0, GAME_W, GAME_H);

      // Grid/star effects in background
      const starGraphics = this.add.graphics();
      starGraphics.fillStyle(0xffffff, 0.15);
      for (let i = 0; i < 15; i++) {
        const sx = Phaser.Math.Between(10, GAME_W - 10);
        const sy = Phaser.Math.Between(50, GAME_H - 50);
        starGraphics.fillCircle(sx, sy, Phaser.Math.Between(1, 3));
      }

      // Title
      this.add.text(GAME_W / 2, 50, '🎸 GARAGE TO ARENA TOUR', {
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#ff2d78',
        strokeThickness: 3,
        shadow: { color: '#ff2d78', blur: 10, fill: true },
      }).setOrigin(0.5);

      // Settings Cog
      const settingsBtn = this.add.text(GAME_W - 30, 30, '⚙️', {
        fontSize: '22px'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);

      const settingsOverlay = new SettingsOverlay(this, () => {
        this.scene.restart();
      });

      settingsBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        settingsOverlay.show();
      });

      // Tour Complete Banner
      const isTourComplete = this.completedLevels.includes(LEVELS.length);
      if (isTourComplete) {
        const bannerBg = this.add.graphics();
        bannerBg.fillStyle(0xff2d78, 0.2);
        bannerBg.lineStyle(2, 0xffd700, 1);
        bannerBg.fillRoundedRect(30, 80, GAME_W - 60, 40, 8);
        bannerBg.strokeRoundedRect(30, 80, GAME_W - 60, 40, 8);

        this.add.text(GAME_W / 2, 100, '🌟 TOUR COMPLETE! 🌟', {
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#ffd700',
          shadow: { color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5);
      }

      // Positions of nodes
      const nodes: Array<{ x: number; y: number; lvl: number }> = [];
      const startY = 120;
      const endY = GAME_H - 80;
      const stepY = (endY - startY) / (LEVELS.length - 1);
      const leftX = 110;
      const rightX = 280;

      for (let i = 0; i < LEVELS.length; i++) {
        const lvl = i + 1;
        const x = lvl % 2 === 1 ? leftX : rightX;
        const y = startY + i * stepY;
        nodes.push({ x, y, lvl });
      }

      // Draw dashed path
      const pathG = this.add.graphics();
      pathG.lineStyle(4, 0xff2d78, 0.25);
      pathG.beginPath();
      pathG.moveTo(nodes[0].x, nodes[0].y);
      for (let i = 1; i < nodes.length; i++) {
        pathG.lineTo(nodes[i].x, nodes[i].y);
      }
      pathG.strokePath();

      // Inner glowing path
      pathG.lineStyle(2, 0x00d4ff, 0.7);
      pathG.beginPath();
      pathG.moveTo(nodes[0].x, nodes[0].y);
      for (let i = 1; i < nodes.length; i++) {
        pathG.lineTo(nodes[i].x, nodes[i].y);
      }
      pathG.strokePath();

      // Render nodes
      nodes.forEach(node => {
        const config = LEVELS[node.lvl - 1];
        const isLocked = node.lvl > this.highestUnlocked;
        const isCompleted = this.completedLevels.includes(node.lvl);
        let stats = ProgressManager.getLevelStats(node.lvl);
        if ((window as any).screenshotMode) {
          if (node.lvl === 1) stats = { score: 8500, energy: 96, stars: 3 };
          else if (node.lvl === 2) stats = { score: 6200, energy: 85, stars: 2 };
          else if (node.lvl === 3) stats = { score: 4500, energy: 80, stars: 1 };
        }

        // Node container/button
        const container = this.add.container(node.x, node.y);

        // Backing circle
        const circle = this.add.graphics();
        let color = 0x1f1a24;
        let strokeColor = 0x444444;
        let strokeWidth = 2;

        if (!isLocked) {
          if (isCompleted) {
            color = 0x2e1a47; // Dark purple
            strokeColor = 0xffd700; // Gold
            strokeWidth = 3;
          } else {
            color = 0x0f2042; // Deep blue
            strokeColor = 0x00d4ff; // Cyan neon
            strokeWidth = 3;
          }
        }

        circle.fillStyle(color, 1);
        circle.fillCircle(0, 0, 22);
        circle.lineStyle(strokeWidth, strokeColor, 1);
        circle.strokeCircle(0, 0, 22);
        container.add(circle);

        // Content (Number or lock)
        if (isLocked) {
          const lockText = this.add.text(0, 0, '🔒', { fontSize: '15px' }).setOrigin(0.5);
          container.add(lockText);
        } else {
          const numText = this.add.text(0, 0, String(node.lvl), {
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffffff'
          }).setOrigin(0.5);
          container.add(numText);

          // Pulse animation for active unlocked level
          if (!isCompleted && node.lvl === this.highestUnlocked) {
            this.tweens.add({
              targets: container,
              scaleX: 1.12,
              scaleY: 1.12,
              duration: 800,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          }
        }

        // Star text display if completed
        if (isCompleted && stats && stats.stars > 0) {
          const starStr = '⭐'.repeat(stats.stars);
          const starsText = this.add.text(0, 30, starStr, {
            fontSize: '11px',
            color: '#ffd700',
            shadow: { color: '#000000', blur: 3, fill: true }
          }).setOrigin(0.5);
          container.add(starsText);
        }

        // Node selection interactivity
        const hitArea = new Phaser.Geom.Circle(0, 0, 24);
        container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        container.on('pointerdown', () => {
          this.handleLevelSelection(node.lvl);
        });

        // Hover effect
        container.on('pointerover', () => {
          if (!isLocked) {
            this.tweens.add({
              targets: container,
              scaleX: 1.15,
              scaleY: 1.15,
              duration: 150
            });
          }
        });
        container.on('pointerout', () => {
          this.tweens.add({
            targets: container,
            scaleX: node.lvl === this.highestUnlocked && !isCompleted && !isLocked ? 1.12 : 1.0,
            scaleY: node.lvl === this.highestUnlocked && !isCompleted && !isLocked ? 1.12 : 1.0,
            duration: 150
          });
        });

        // Title and Difficulty label next to node
        const isLeft = node.lvl % 2 === 1;
        const textX = isLeft ? 35 : -35;
        const textOriginX = isLeft ? 0 : 1;

        const infoText = this.add.text(node.x + textX, node.y - 12, config.theme.venue, {
          fontSize: '12px',
          fontStyle: 'bold',
          color: isLocked ? '#666666' : '#ffffff'
        }).setOrigin(textOriginX, 0.5);

        const diffText = this.add.text(node.x + textX, node.y + 6, config.theme.difficulty || 'Normal', {
          fontSize: '10px',
          color: isLocked ? '#555555' : '#a3e4d7'
        }).setOrigin(textOriginX, 0.5);
      });

      // Simple Help Footer
      this.add.text(GAME_W / 2, GAME_H - 35, 'Select unlocked concert node to play', {
        fontSize: '11px',
        color: '#888888'
      }).setOrigin(0.5);

      // Expose test helpers globally for E2E verification
      (window as any).rockstarTest = {
        selectLevel: (levelNumber: number) => {
          this.handleLevelSelection(levelNumber);
        }
      };

    } catch (err: unknown) {
      StateBridge.markError(err instanceof Error ? err.message : String(err));
      console.error('[VenueMapScene] Error in create():', err);
    }
  }

  private handleLevelSelection(levelNumber: number): void {
    const isLocked = levelNumber > this.highestUnlocked;

    // Set selected level info in StateBridge
    StateBridge.setSelectedLevel(levelNumber);
    StateBridge.setSelectedLevelLocked(isLocked);

    // Save/Load best score & stars of this level for bridge exposure
    const stats = ProgressManager.getLevelStats(levelNumber);
    StateBridge.setStarsEarned(stats ? stats.stars : 0);
    StateBridge.setBestScoreCurrentLevel(stats ? stats.score : 0);

    if (this.debugText) {
      this.debugText.setText(`[DEBUG] Scene: VenueMapScene | testMode: true | Level: ${levelNumber}`);
    }

    if (isLocked) {
      // Flash screen red or simple feedback
      this.cameras.main.flash(200, 100, 0, 0);
      return;
    }

    // Start GameScene
    this.scene.start('GameScene', { levelIndex: levelNumber - 1 });
  }
}
