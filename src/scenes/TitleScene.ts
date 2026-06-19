import Phaser from 'phaser';
import { StateBridge } from '../testing/StateBridge';
import { ProgressManager } from '../utils/ProgressManager';
import { TEST_MODE } from '../main';
import { SettingsOverlay } from '../game/SettingsOverlay';

const GAME_W = 390;
const GAME_H = 844;

export class TitleScene extends Phaser.Scene {
  private settingsOverlay!: SettingsOverlay;
  private continueBtnBg!: Phaser.GameObjects.Graphics;
  private continueBtnText!: Phaser.GameObjects.Text;
  private resetBtnBg!: Phaser.GameObjects.Graphics;
  private resetBtnText!: Phaser.GameObjects.Text;
  private debugText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    try {
      StateBridge.setCurrentScene('TitleScene');

      // Reset screenshot mode state on load
      (window as any).screenshotMode = false;

      // Background
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0a0014, 0x0a0014, 0x14002e, 0x14002e, 1);
      bg.fillRect(0, 0, GAME_W, GAME_H);

      // Star particles in background
      const starGraphics = this.add.graphics();
      starGraphics.fillStyle(0xffffff, 0.15);
      for (let i = 0; i < 20; i++) {
        const sx = Phaser.Math.Between(10, GAME_W - 10);
        const sy = Phaser.Math.Between(50, GAME_H - 50);
        starGraphics.fillCircle(sx, sy, Phaser.Math.Between(1, 3));
      }

      // Title/Logo
      this.add.text(GAME_W / 2, GAME_H / 2 - 180, '🎸 ROCKSTAR', {
        fontSize: '42px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#ff2d78',
        strokeThickness: 5,
        shadow: { color: '#ff2d78', blur: 20, fill: true },
      }).setOrigin(0.5);

      // Subtitle
      this.add.text(GAME_W / 2, GAME_H / 2 - 110, 'Build the concert. Match the energy.', {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#c39bd3',
        align: 'center'
      }).setOrigin(0.5);

      // Version label
      this.add.text(GAME_W / 2, GAME_H - 40, 'Version: v1.0 Demo', {
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0.5);

      // Settings Cog
      const settingsBtn = this.add.text(GAME_W - 30, 30, '⚙️', {
        fontSize: '22px'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);

      this.settingsOverlay = new SettingsOverlay(this, () => {
        this.updateButtonsVisibility();
      });

      settingsBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.settingsOverlay.show();
      });

      // ── Action Buttons ──────────────────────────────────────────────────────
      // 1. Play Button (starts new tour)
      const playBtnBg = this.add.graphics();
      playBtnBg.fillStyle(0xff2d78, 1);
      playBtnBg.fillRoundedRect(GAME_W / 2 - 100, GAME_H / 2 + 10, 200, 48, 10);

      const playBtnText = this.add.text(GAME_W / 2, GAME_H / 2 + 34, '▶ START TOUR', {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      playBtnText.on('pointerdown', () => {
        ProgressManager.clearProgress();
        this.scene.start('VenueMapScene');
      });
      playBtnText.on('pointerover', () => playBtnBg.setAlpha(0.85));
      playBtnText.on('pointerout', () => playBtnBg.setAlpha(1));

      // 2. Continue Button (if progress exists)
      this.continueBtnBg = this.add.graphics();
      this.continueBtnBg.fillStyle(0x00d4ff, 1);
      this.continueBtnBg.fillRoundedRect(GAME_W / 2 - 100, GAME_H / 2 + 78, 200, 48, 10);

      this.continueBtnText = this.add.text(GAME_W / 2, GAME_H / 2 + 102, '⏭ CONTINUE TOUR', {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      this.continueBtnText.on('pointerdown', () => {
        this.scene.start('VenueMapScene');
      });
      this.continueBtnText.on('pointerover', () => this.continueBtnBg.setAlpha(0.85));
      this.continueBtnText.on('pointerout', () => this.continueBtnBg.setAlpha(1));

      // 3. Reset Progress Button (debug/testMode only)
      this.resetBtnBg = this.add.graphics();
      this.resetBtnBg.fillStyle(0x721c24, 1);
      this.resetBtnBg.fillRoundedRect(GAME_W / 2 - 100, GAME_H / 2 + 146, 200, 40, 8);

      this.resetBtnText = this.add.text(GAME_W / 2, GAME_H / 2 + 166, 'Reset Progress', {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f8d7da'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      this.resetBtnText.on('pointerdown', () => {
        ProgressManager.clearProgress();
        this.updateButtonsVisibility();
      });
      this.resetBtnText.on('pointerover', () => this.resetBtnBg.setAlpha(0.85));
      this.resetBtnText.on('pointerout', () => this.resetBtnBg.setAlpha(1));

      // Debug Text overlay for testMode
      if (TEST_MODE) {
        this.debugText = this.add.text(10, 10, `[DEBUG] Scene: TitleScene | testMode: true`, {
          fontSize: '11px',
          color: '#ff0000',
          backgroundColor: '#000000'
        }).setDepth(20000);

        this.input.keyboard?.on('keydown-H', () => {
          (window as any).screenshotMode = !(window as any).screenshotMode;
          this.updateButtonsVisibility();
        });
      }

      this.updateButtonsVisibility();

      // Expose test controls globally
      (window as any).rockstarTest = (window as any).rockstarTest || {};
      (window as any).rockstarTest.startNewTour = () => {
        ProgressManager.clearProgress();
        this.scene.start('VenueMapScene');
      };
      (window as any).rockstarTest.continueTour = () => {
        this.scene.start('VenueMapScene');
      };

    } catch (err: unknown) {
      StateBridge.markError(err instanceof Error ? err.message : String(err));
      console.error('[TitleScene] Error in create():', err);
    }
  }

  private updateButtonsVisibility(): void {
    const highest = ProgressManager.getHighestUnlockedLevel();
    const completed = ProgressManager.getCompletedLevels();
    const progressExists = highest > 1 || completed.length > 0;

    const isScreenshot = (window as any).screenshotMode === true;

    if (progressExists) {
      this.continueBtnBg.setVisible(true);
      this.continueBtnText.setVisible(true);
    } else {
      this.continueBtnBg.setVisible(false);
      this.continueBtnText.setVisible(false);
    }

    if (TEST_MODE && !isScreenshot) {
      this.resetBtnBg.setVisible(true);
      this.resetBtnText.setVisible(true);
      if (this.debugText) this.debugText.setVisible(true);
    } else {
      this.resetBtnBg.setVisible(false);
      this.resetBtnText.setVisible(false);
      if (this.debugText) this.debugText.setVisible(false);
    }
  }
}
